/**
 * Calls XML Streaming Parser
 *
 * Parses SMS Backup & Restore Pro call log XML files using streaming SAX parser.
 */

import * as fs from 'fs';
import * as sax from 'sax';
import { EventEmitter } from 'events';
import { normalizePhoneNumber } from '../utils/phone-normalizer';
import { processMessageBody } from '../utils/html-entities';
import {
  getOrCreateConversation,
  insertCallsBatch,
  updateAllConversationStats,
  recordImport,
} from '../database/queries';
import { withTransaction } from '../database/database';
import type { Call, ImportProgress, ImportResult, ImportMetadata, CallType, CallTypeLabel } from '../../shared/types';

// Batch size for database inserts
const BATCH_SIZE = 500;

// Progress event interval
const PROGRESS_INTERVAL = 500;

export interface CallsParserOptions {
  filePath: string;
  onProgress?: (progress: ImportProgress) => void;
}

export interface CallsBackupInfo {
  count: number;
  backupSet: string;
  backupDate: number;
}

/**
 * Maps call type codes to labels
 */
function getCallTypeLabel(type: number): CallTypeLabel {
  switch (type) {
    case 1:
      return 'incoming';
    case 2:
      return 'outgoing';
    case 3:
      return 'missed';
    case 5:
      return 'rejected';
    default:
      return 'incoming'; // Default to incoming for unknown types
  }
}

/**
 * Validates call type
 */
function isValidCallType(type: number): type is CallType {
  return type === 1 || type === 2 || type === 3 || type === 5;
}

/**
 * Calls Parser class - parses call log backup XML files
 */
export class CallsParser extends EventEmitter {
  private filePath: string;
  private onProgress?: (progress: ImportProgress) => void;
  private aborted = false;

  constructor(options: CallsParserOptions) {
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
   * Parses the XML file and imports calls into the database
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

      let backupInfo: CallsBackupInfo | null = null;
      const callBatch: Call[] = [];
      let lastProgressTime = Date.now();

      // Create SAX parser (non-strict mode for better error tolerance)
      // Strict mode stops parsing on errors, non-strict continues
      const parser = sax.createStream(false, {
        trim: true,
        normalize: true,
        lowercase: false,
      });

      const emitProgress = (phase: ImportProgress['phase']) => {
        const now = Date.now();
        if (now - lastProgressTime >= PROGRESS_INTERVAL || phase === 'complete') {
          lastProgressTime = now;
          this.onProgress?.({
            phase,
            current: result.totalParsed,
            total: backupInfo?.count || 0,
            messagesImported: result.callsImported, // Use callsImported for calls
            duplicatesSkipped: result.duplicatesSkipped,
            errors: result.errors.length,
          });
        }
      };

      const flushBatch = () => {
        if (callBatch.length === 0) return;

        try {
          const inserted = withTransaction(() => insertCallsBatch(callBatch));
          result.callsImported += inserted;
          result.duplicatesSkipped += callBatch.length - inserted;
        } catch (error) {
          result.errors.push(`Batch insert failed: ${error}`);
        }

        callBatch.length = 0;
      };

      // Handle opening tags
      parser.on('opentag', (node: sax.Tag) => {
        if (this.aborted) {
          parser.end();
          return;
        }

        // Parse root element for backup info
        if (node.name === 'calls') {
          backupInfo = {
            count: parseInt(node.attributes.count as string, 10) || 0,
            backupSet: (node.attributes.backup_set as string) || '',
            backupDate: parseInt(node.attributes.backup_date as string, 10) || 0,
          };
          return;
        }

        // Parse call elements
        if (node.name === 'call') {
          result.totalParsed++;

          try {
            const number = (node.attributes.number as string) || '';
            const durationStr = (node.attributes.duration as string) || '0';
            const dateStr = (node.attributes.date as string) || '0';
            const typeStr = (node.attributes.type as string) || '1';
            const contactName = processMessageBody((node.attributes.contact_name as string) || '');

            const timestamp = parseInt(dateStr, 10);
            const duration = parseInt(durationStr, 10);
            const typeNum = parseInt(typeStr, 10);
            const type: CallType = isValidCallType(typeNum) ? typeNum : 1;
            const typeLabel = getCallTypeLabel(type);
            const normalizedPhone = normalizePhoneNumber(number);

            // Get or create conversation for linking
            let conversationId: number | undefined;
            if (normalizedPhone) {
              conversationId = getOrCreateConversation(
                normalizedPhone,
                number,
                contactName
              );
            }

            const call: Call = {
              conversationId,
              phoneNumber: number,
              normalizedPhone,
              contactName: contactName || '',
              timestamp,
              duration,
              type,
              typeLabel,
            };

            callBatch.push(call);

            // Flush batch when full
            if (callBatch.length >= BATCH_SIZE) {
              flushBatch();
              emitProgress('inserting');
            }
          } catch (error) {
            result.errors.push(`Failed to parse call: ${error}`);
          }
        }
      });

      // Handle errors - in non-strict mode, parsing continues after errors
      parser.on('error', (error: Error) => {
        console.error('[calls-parser] Parse error:', error.message);
        result.errors.push(`Parse error: ${error.message}`);
      });

      // Handle end of parsing
      parser.on('end', () => {
        // Flush remaining calls
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
              messageCount: 0,
              callCount: result.callsImported,
              type: 'calls',
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
 * Convenience function to parse a calls backup file
 */
export async function parseCallsBackup(
  filePath: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const parser = new CallsParser({ filePath, onProgress });
  return parser.parse();
}

/**
 * Reads backup info from a calls XML file without importing
 */
export function getCallsBackupInfo(filePath: string): Promise<CallsBackupInfo | null> {
  return new Promise((resolve) => {
    console.log('[getCallsBackupInfo] Reading file:', filePath);

    // Read first 8KB synchronously for more reliable detection
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8', 0, bytesRead);
    console.log('[getCallsBackupInfo] Read', bytesRead, 'bytes, first 200 chars:', content.substring(0, 200));

    // Look for <calls root element
    const callsMatch = content.match(/<calls\s+([^>]+)>/);
    if (!callsMatch) {
      console.log('[getCallsBackupInfo] No <calls> element found');
      resolve(null);
      return;
    }

    console.log('[getCallsBackupInfo] Found <calls> element:', callsMatch[0].substring(0, 100));

    const attributes = callsMatch[1];

    // Extract attributes
    const countMatch = attributes.match(/count="(\d+)"/);
    const backupSetMatch = attributes.match(/backup_set="([^"]+)"/);
    const backupDateMatch = attributes.match(/backup_date="(\d+)"/);

    const backupInfo: CallsBackupInfo = {
      count: countMatch ? parseInt(countMatch[1], 10) : 0,
      backupSet: backupSetMatch ? backupSetMatch[1] : '',
      backupDate: backupDateMatch ? parseInt(backupDateMatch[1], 10) : 0,
    };

    console.log('[getCallsBackupInfo] Parsed backup info:', backupInfo);
    resolve(backupInfo);
  });
}

/**
 * Formats a call duration for display (e.g., "1m 23s")
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) {
    return '0s';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
