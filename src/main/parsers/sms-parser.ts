/**
 * SMS/MMS XML Streaming Parser
 *
 * Parses SMS Backup & Restore Pro XML files using streaming SAX parser.
 * Handles large files (47MB+) efficiently without loading entire file into memory.
 */

import * as fs from 'fs';
import * as sax from 'sax';
import { EventEmitter } from 'events';
import { normalizePhoneNumber } from '../utils/phone-normalizer';
import { processMessageBody } from '../utils/html-entities';
import { hashMessageBody } from '../utils/deduplication';
import {
  getOrCreateConversation,
  insertMessagesBatch,
  updateAllConversationStats,
  recordImport,
} from '../database/queries';
import { withTransaction } from '../database/database';
import type { Message, ImportProgress, ImportResult, ImportMetadata } from '../../shared/types';

// Batch size for database inserts
const BATCH_SIZE = 1000;

// Progress event interval
const PROGRESS_INTERVAL = 500;

export interface SmsParserOptions {
  filePath: string;
  onProgress?: (progress: ImportProgress) => void;
}

export interface BackupInfo {
  count: number;
  backupSet: string;
  backupDate: number;
  type: string;
}

/**
 * SMS Parser class - parses SMS/MMS backup XML files
 */
export class SmsParser extends EventEmitter {
  private filePath: string;
  private onProgress?: (progress: ImportProgress) => void;
  private aborted = false;

  constructor(options: SmsParserOptions) {
    super();
    this.filePath = options.filePath;
    this.onProgress = options.onProgress;
  }

  /**
   * Aborts the current parsing operation
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Parses the XML file and imports messages into the database
   */
  async parse(): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const result: ImportResult = {
        success: false,
        filePath: this.filePath,
        totalParsed: 0,
        messagesImported: 0,
        callsImported: 0,
        duplicatesSkipped: 0,
        errors: [],
        conversationsCreated: 0,
      };

      let backupInfo: BackupInfo | null = null;
      const messageBatch: Message[] = [];
      let lastProgressTime = Date.now();

      // Create SAX parser (strict mode)
      const parser = sax.createStream(true, {
        trim: true,
        normalize: true,
      });

      const emitProgress = (phase: ImportProgress['phase']) => {
        const now = Date.now();
        if (now - lastProgressTime >= PROGRESS_INTERVAL || phase === 'complete') {
          lastProgressTime = now;
          this.onProgress?.({
            phase,
            current: result.totalParsed,
            total: backupInfo?.count || 0,
            messagesImported: result.messagesImported,
            duplicatesSkipped: result.duplicatesSkipped,
            errors: result.errors.length,
          });
        }
      };

      const flushBatch = () => {
        if (messageBatch.length === 0) return;

        try {
          const inserted = withTransaction(() => insertMessagesBatch(messageBatch));
          result.messagesImported += inserted;
          result.duplicatesSkipped += messageBatch.length - inserted;
        } catch (error) {
          result.errors.push(`Batch insert failed: ${error}`);
        }

        messageBatch.length = 0;
      };

      // Handle opening tags
      parser.on('opentag', (node: sax.Tag) => {
        if (this.aborted) {
          parser.end();
          return;
        }

        // Parse root element for backup info
        if (node.name === 'smses') {
          backupInfo = {
            count: parseInt(node.attributes.count as string, 10) || 0,
            backupSet: (node.attributes.backup_set as string) || '',
            backupDate: parseInt(node.attributes.backup_date as string, 10) || 0,
            type: (node.attributes.type as string) || 'full',
          };
          return;
        }

        // Parse SMS elements
        if (node.name === 'sms') {
          result.totalParsed++;

          try {
            const address = (node.attributes.address as string) || '';
            const dateStr = (node.attributes.date as string) || '0';
            const typeStr = (node.attributes.type as string) || '1';
            const body = (node.attributes.body as string) || '';
            const contactName = (node.attributes.contact_name as string) || '';

            const timestamp = parseInt(dateStr, 10);
            const type = parseInt(typeStr, 10) as 1 | 2;
            const direction = type === 2 ? 'sent' : 'received';
            const normalizedPhone = normalizePhoneNumber(address);
            const processedBody = processMessageBody(body);
            const bodyHash = hashMessageBody(processedBody);

            // Get or create conversation
            const conversationId = getOrCreateConversation(
              normalizedPhone,
              address,
              contactName
            );

            const message: Message = {
              conversationId,
              type,
              direction,
              body: processedBody,
              bodyHash,
              timestamp,
              originalPhone: address,
              normalizedPhone,
              contactName: contactName || '',
            };

            messageBatch.push(message);

            // Flush batch when full
            if (messageBatch.length >= BATCH_SIZE) {
              flushBatch();
              emitProgress('inserting');
            }
          } catch (error) {
            result.errors.push(`Failed to parse SMS: ${error}`);
          }
        }

        // Parse MMS elements (simplified - just extract text parts)
        if (node.name === 'mms') {
          result.totalParsed++;

          try {
            const address = (node.attributes.address as string) || '';
            const dateStr = (node.attributes.date as string) || '0';
            const typeStr = (node.attributes.msg_box as string) || (node.attributes.type as string) || '1';
            const contactName = (node.attributes.contact_name as string) || '';

            const timestamp = parseInt(dateStr, 10);
            // MMS msg_box: 1=received, 2=sent
            const type = (parseInt(typeStr, 10) === 2 ? 2 : 1) as 1 | 2;
            const direction = type === 2 ? 'sent' : 'received';
            const normalizedPhone = normalizePhoneNumber(address);

            // For MMS, we'll collect the body from nested parts
            // Store the MMS context for the part handler
            (parser as unknown as { _currentMms: Partial<Message> })._currentMms = {
              type,
              direction,
              timestamp,
              originalPhone: address,
              normalizedPhone,
              contactName: contactName || '',
            };
          } catch (error) {
            result.errors.push(`Failed to parse MMS header: ${error}`);
          }
        }

        // Parse MMS parts for text content
        if (node.name === 'part') {
          const currentMms = (parser as unknown as { _currentMms?: Partial<Message> })._currentMms;
          if (currentMms) {
            const ct = (node.attributes.ct as string) || '';
            const text = (node.attributes.text as string) || '';

            // Only process text parts
            if (ct.includes('text') && text) {
              const processedBody = processMessageBody(text);
              const bodyHash = hashMessageBody(processedBody);

              const conversationId = getOrCreateConversation(
                currentMms.normalizedPhone!,
                currentMms.originalPhone!,
                currentMms.contactName!
              );

              const message: Message = {
                conversationId,
                type: currentMms.type!,
                direction: currentMms.direction!,
                body: processedBody,
                bodyHash,
                timestamp: currentMms.timestamp!,
                originalPhone: currentMms.originalPhone!,
                normalizedPhone: currentMms.normalizedPhone!,
                contactName: currentMms.contactName!,
              };

              messageBatch.push(message);

              if (messageBatch.length >= BATCH_SIZE) {
                flushBatch();
                emitProgress('inserting');
              }
            }
          }
        }

        // Parse MMS addresses (for group messages, address might be in addrs)
        if (node.name === 'addr') {
          const currentMms = (parser as unknown as { _currentMms?: Partial<Message> })._currentMms;
          if (currentMms && !currentMms.normalizedPhone) {
            const address = (node.attributes.address as string) || '';
            const addrType = (node.attributes.type as string) || '';
            // type 137 = sender, 151 = recipient
            if (address && (addrType === '137' || addrType === '151')) {
              currentMms.originalPhone = address;
              currentMms.normalizedPhone = normalizePhoneNumber(address);
            }
          }
        }
      });

      // Handle closing tags
      parser.on('closetag', (tagName: string) => {
        if (tagName === 'mms') {
          // Clear MMS context
          delete (parser as unknown as { _currentMms?: Partial<Message> })._currentMms;
        }
      });

      // Handle errors
      parser.on('error', (error: Error) => {
        result.errors.push(`Parse error: ${error.message}`);
        // Continue parsing despite errors
        parser.resume();
      });

      // Handle end of parsing
      parser.on('end', () => {
        // Flush remaining messages
        flushBatch();

        // Update conversation statistics
        emitProgress('grouping');
        try {
          updateAllConversationStats();
        } catch (error) {
          result.errors.push(`Failed to update conversation stats: ${error}`);
        }

        // Record import metadata
        if (backupInfo) {
          try {
            const metadata: ImportMetadata = {
              filePath: this.filePath,
              backupSet: backupInfo.backupSet,
              backupDate: backupInfo.backupDate,
              importDate: Date.now(),
              messageCount: result.messagesImported,
              callCount: 0,
              type: 'sms',
            };
            recordImport(metadata);
          } catch (error) {
            result.errors.push(`Failed to record import metadata: ${error}`);
          }
        }

        result.success = result.errors.length === 0;
        emitProgress('complete');
        resolve(result);
      });

      // Start parsing
      try {
        const fileStream = fs.createReadStream(this.filePath, { encoding: 'utf8' });

        fileStream.on('error', (error) => {
          result.errors.push(`File read error: ${error.message}`);
          result.success = false;
          reject(error);
        });

        fileStream.pipe(parser);
      } catch (error) {
        result.errors.push(`Failed to open file: ${error}`);
        result.success = false;
        reject(error);
      }
    });
  }
}

/**
 * Convenience function to parse an SMS backup file
 */
export async function parseSmsBackup(
  filePath: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const parser = new SmsParser({ filePath, onProgress });
  return parser.parse();
}

/**
 * Reads backup info from an SMS XML file without importing
 */
export function getBackupInfo(filePath: string): Promise<BackupInfo | null> {
  return new Promise((resolve) => {
    const parser = sax.createStream(true, { trim: true });
    let backupInfo: BackupInfo | null = null;

    parser.on('opentag', (node: sax.Tag) => {
      if (node.name === 'smses') {
        backupInfo = {
          count: parseInt(node.attributes.count as string, 10) || 0,
          backupSet: (node.attributes.backup_set as string) || '',
          backupDate: parseInt(node.attributes.backup_date as string, 10) || 0,
          type: (node.attributes.type as string) || 'full',
        };
        // We have what we need, stop parsing
        parser.end();
      }
    });

    parser.on('end', () => resolve(backupInfo));
    parser.on('error', () => resolve(null));

    // Only read first 4KB to get root element
    const stream = fs.createReadStream(filePath, { encoding: 'utf8', end: 4096 });
    stream.pipe(parser);
  });
}
