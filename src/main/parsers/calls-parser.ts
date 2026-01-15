/**
 * Call Log XML Parser
 *
 * Parses SMS Backup & Restore Pro call log XML files using fast-xml-parser.
 * Handles call history backup files efficiently.
 */

import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { EventEmitter } from 'events';
import { normalizePhoneNumber } from '../utils/phone-normalizer';
import {
  getOrCreateConversation,
  insertCallsBatch,
  updateAllConversationStats,
  recordImport,
} from '../database/queries';
import { withTransaction } from '../database/database';
import type { Call, ImportProgress, ImportResult, ImportMetadata } from '../../shared/types';

// Batch size for database inserts
const BATCH_SIZE = 500;

// Progress event interval (ms)
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

// Type for parsed call element
interface ParsedCall {
  number?: string;
  duration?: string;
  date?: string;
  type?: string;
  contact_name?: string;
  [key: string]: string | undefined;
}

// Type for parsed calls root element
interface ParsedCalls {
  count?: string;
  backup_set?: string;
  backup_date?: string;
  call?: ParsedCall | ParsedCall[];
}

/**
 * Maps call type number to label
 */
function getCallTypeLabel(type: number): 'incoming' | 'outgoing' | 'missed' | 'rejected' {
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
      return 'incoming';
  }
}

/**
 * Calls Parser class - parses call log backup XML files using fast-xml-parser
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

    const callBatch: Call[] = [];
    let lastProgressTime = Date.now();
    let backupInfo: CallsBackupInfo | null = null;

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

    const processCall = (call: ParsedCall) => {
      if (this.aborted) return;

      try {
        const phoneNumber = call.number || '';
        const duration = parseInt(call.duration || '0', 10);
        const timestamp = parseInt(call.date || '0', 10);
        const type = parseInt(call.type || '1', 10) as 1 | 2 | 3 | 5;
        const contactName = call.contact_name || '';

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const typeLabel = getCallTypeLabel(type);

        // Get or create conversation for this phone number
        const conversationId = getOrCreateConversation(normalizedPhone, phoneNumber, contactName);

        callBatch.push({
          conversationId,
          phoneNumber,
          normalizedPhone,
          contactName: contactName || '',
          timestamp,
          duration,
          type,
          typeLabel,
        });

        if (callBatch.length >= BATCH_SIZE) {
          flushBatch();
          emitProgress('inserting');
        }
      } catch (error) {
        result.errors.push(`Failed to parse call: ${error}`);
      }
    };

    try {
      console.log('[calls-parser] Reading file:', this.filePath);
      emitProgress('parsing');

      // Read entire file
      const content = fs.readFileSync(this.filePath, 'utf8');
      console.log('[calls-parser] File size:', (content.length / 1024).toFixed(2), 'KB');

      // Parse XML with fast-xml-parser
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '#text',
        parseAttributeValue: false,
        trimValues: true,
      });

      console.log('[calls-parser] Parsing XML...');
      const data = parser.parse(content) as { calls?: ParsedCalls };

      if (!data.calls) {
        result.errors.push('Invalid calls backup file - no <calls> root element found');
        return result;
      }

      const calls = data.calls;

      // Extract backup info
      backupInfo = {
        count: parseInt(calls.count || '0', 10),
        backupSet: calls.backup_set || '',
        backupDate: parseInt(calls.backup_date || '0', 10),
      };
      console.log('[calls-parser] Backup info:', backupInfo);

      // Process call entries
      if (calls.call) {
        const callArray = Array.isArray(calls.call) ? calls.call : [calls.call];
        console.log('[calls-parser] Processing', callArray.length, 'calls...');

        for (const call of callArray) {
          if (this.aborted) break;
          result.totalParsed++;
          processCall(call);

          // Emit progress periodically
          if (result.totalParsed % 500 === 0) {
            emitProgress('inserting');
          }
        }
      }

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

      result.success = result.errors.length === 0 || result.callsImported > 0;
      emitProgress('complete');
      console.log('[calls-parser] Parse complete:', result.callsImported, 'calls imported,', result.duplicatesSkipped, 'duplicates skipped');

    } catch (error) {
      console.error('[calls-parser] Parse error:', error);
      result.errors.push(`Parse failed: ${error}`);
    }

    return result;
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
