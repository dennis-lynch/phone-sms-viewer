/**
 * SMS/MMS XML Parser
 *
 * Parses SMS Backup & Restore Pro XML files using fast-xml-parser.
 * Handles large files (47MB+) by loading into memory and parsing.
 *
 * Memory usage: ~3-4x file size (acceptable for desktop Electron app)
 */

import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
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

// Progress event interval (ms)
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

// Types for parsed XML structure
interface ParsedSms {
  address?: string;
  date?: string;
  type?: string;
  body?: string;
  contact_name?: string;
  [key: string]: string | undefined;
}

interface ParsedMmsPart {
  ct?: string;
  text?: string;
  [key: string]: string | undefined;
}

interface ParsedMmsAddr {
  address?: string;
  type?: string;
  [key: string]: string | undefined;
}

interface ParsedMms {
  address?: string;
  date?: string;
  type?: string;
  msg_box?: string;
  contact_name?: string;
  m_size?: string;
  parts?: { part?: ParsedMmsPart | ParsedMmsPart[] };
  addrs?: { addr?: ParsedMmsAddr | ParsedMmsAddr[] };
  [key: string]: unknown;
}

interface ParsedSmses {
  count?: string;
  backup_set?: string;
  backup_date?: string;
  type?: string;
  sms?: ParsedSms | ParsedSms[];
  mms?: ParsedMms | ParsedMms[];
}

/**
 * SMS Parser class - parses SMS/MMS backup XML files using fast-xml-parser
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

    const messageBatch: Message[] = [];
    let lastProgressTime = Date.now();
    let backupInfo: BackupInfo | null = null;

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

    const processSms = (sms: ParsedSms) => {
      if (this.aborted) return;

      try {
        const address = sms.address || '';
        const timestamp = parseInt(sms.date || '0', 10);
        const type = parseInt(sms.type || '1', 10) as 1 | 2;
        const body = sms.body || '';
        const contactName = sms.contact_name || '';

        const direction = type === 2 ? 'sent' : 'received';
        const normalizedPhone = normalizePhoneNumber(address);
        const processedBody = processMessageBody(body);
        const bodyHash = hashMessageBody(processedBody);

        const conversationId = getOrCreateConversation(normalizedPhone, address, contactName);

        messageBatch.push({
          conversationId,
          type,
          direction,
          body: processedBody,
          bodyHash,
          timestamp,
          originalPhone: address,
          normalizedPhone,
          contactName: contactName || '',
          mSize: 0,
        });

        if (messageBatch.length >= BATCH_SIZE) {
          flushBatch();
          emitProgress('inserting');
        }
      } catch (error) {
        result.errors.push(`Failed to parse SMS: ${error}`);
      }
    };

    const processMms = (mms: ParsedMms) => {
      if (this.aborted) return;

      try {
        const address = mms.address || '';
        const timestamp = parseInt(mms.date || '0', 10);
        const typeStr = mms.msg_box || mms.type || '1';
        const type = (parseInt(typeStr, 10) === 2 ? 2 : 1) as 1 | 2;
        const direction = type === 2 ? 'sent' : 'received';
        let normalizedPhone = address ? normalizePhoneNumber(address) : '';
        let originalPhone = address;
        const contactName = mms.contact_name || '';
        const mSize = parseInt(mms.m_size || '0', 10);

        // Extract address from <addr> elements if not in main attributes
        if (!normalizedPhone && mms.addrs?.addr) {
          const addrs = Array.isArray(mms.addrs.addr) ? mms.addrs.addr : [mms.addrs.addr];
          for (const addr of addrs) {
            const addrType = addr.type || '';
            // type 137 = sender, 151 = recipient
            if (addr.address && (addrType === '137' || addrType === '151')) {
              originalPhone = addr.address;
              normalizedPhone = normalizePhoneNumber(addr.address);
              break;
            }
          }
        }

        if (!normalizedPhone) return; // Skip MMS without valid address

        // Extract text from <part> elements
        if (mms.parts?.part) {
          const parts = Array.isArray(mms.parts.part) ? mms.parts.part : [mms.parts.part];
          for (const part of parts) {
            const ct = part.ct || '';
            const text = part.text || '';

            if (ct.includes('text') && text) {
              const processedBody = processMessageBody(text);
              const bodyHash = hashMessageBody(processedBody);
              const conversationId = getOrCreateConversation(normalizedPhone, originalPhone, contactName);

              messageBatch.push({
                conversationId,
                type,
                direction,
                body: processedBody,
                bodyHash,
                timestamp,
                originalPhone,
                normalizedPhone,
                contactName: contactName || '',
                mSize,
              });

              if (messageBatch.length >= BATCH_SIZE) {
                flushBatch();
                emitProgress('inserting');
              }
            }
          }
        }
      } catch (error) {
        result.errors.push(`Failed to parse MMS: ${error}`);
      }
    };

    try {
      console.log('[sms-parser] Reading file:', this.filePath);
      emitProgress('parsing');

      // Read entire file
      const content = fs.readFileSync(this.filePath, 'utf8');
      console.log('[sms-parser] File size:', (content.length / 1024 / 1024).toFixed(2), 'MB');

      // Parse XML with fast-xml-parser
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        parseAttributeValue: false,
        trimValues: true,
      });

      console.log('[sms-parser] Parsing XML...');
      const data = parser.parse(content) as { smses?: ParsedSmses };

      if (!data.smses) {
        result.errors.push('Invalid SMS backup file - no <smses> root element found');
        return result;
      }

      const smses = data.smses;

      // Extract backup info
      backupInfo = {
        count: parseInt(smses.count || '0', 10),
        backupSet: smses.backup_set || '',
        backupDate: parseInt(smses.backup_date || '0', 10),
        type: smses.type || 'full',
      };
      console.log('[sms-parser] Backup info:', backupInfo);

      // Process SMS messages
      if (smses.sms) {
        const smsArray = Array.isArray(smses.sms) ? smses.sms : [smses.sms];
        console.log('[sms-parser] Processing', smsArray.length, 'SMS messages...');

        for (const sms of smsArray) {
          if (this.aborted) break;
          result.totalParsed++;
          processSms(sms);

          // Emit progress periodically
          if (result.totalParsed % 1000 === 0) {
            emitProgress('inserting');
          }
        }
      }

      // Process MMS messages
      if (smses.mms) {
        const mmsArray = Array.isArray(smses.mms) ? smses.mms : [smses.mms];
        console.log('[sms-parser] Processing', mmsArray.length, 'MMS messages...');

        for (const mms of mmsArray) {
          if (this.aborted) break;
          result.totalParsed++;
          processMms(mms);

          // Emit progress periodically
          if (result.totalParsed % 100 === 0) {
            emitProgress('inserting');
          }
        }
      }

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

      result.success = result.errors.length === 0 || result.messagesImported > 0;
      emitProgress('complete');
      console.log('[sms-parser] Parse complete:', result.messagesImported, 'messages imported,', result.duplicatesSkipped, 'duplicates skipped');

    } catch (error) {
      console.error('[sms-parser] Parse error:', error);
      result.errors.push(`Parse failed: ${error}`);
    }

    return result;
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
    console.log('[getBackupInfo] Reading file:', filePath);

    // Read first 8KB synchronously for more reliable detection
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8', 0, bytesRead);
    console.log('[getBackupInfo] Read', bytesRead, 'bytes, first 200 chars:', content.substring(0, 200));

    // Look for <smses root element
    const smsesMatch = content.match(/<smses\s+([^>]+)>/);
    if (!smsesMatch) {
      console.log('[getBackupInfo] No <smses> element found');
      resolve(null);
      return;
    }

    console.log('[getBackupInfo] Found <smses> element:', smsesMatch[0].substring(0, 100));

    const attributes = smsesMatch[1];

    // Extract attributes
    const countMatch = attributes.match(/count="(\d+)"/);
    const backupSetMatch = attributes.match(/backup_set="([^"]+)"/);
    const backupDateMatch = attributes.match(/backup_date="(\d+)"/);
    const typeMatch = attributes.match(/type="([^"]+)"/);

    const backupInfo: BackupInfo = {
      count: countMatch ? parseInt(countMatch[1], 10) : 0,
      backupSet: backupSetMatch ? backupSetMatch[1] : '',
      backupDate: backupDateMatch ? parseInt(backupDateMatch[1], 10) : 0,
      type: typeMatch ? typeMatch[1] : 'full',
    };

    console.log('[getBackupInfo] Parsed backup info:', backupInfo);
    resolve(backupInfo);
  });
}
