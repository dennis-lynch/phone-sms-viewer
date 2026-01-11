/**
 * Deduplication Utilities
 *
 * Provides hashing and deduplication key generation for messages and calls.
 * Uses SHA-256 hash of message body combined with timestamp and normalized phone
 * to create unique composite keys for detecting duplicates.
 */

import { createHash } from 'crypto';

/**
 * Generates a SHA-256 hash of a message body
 *
 * @param body - The message body text
 * @returns Hex-encoded SHA-256 hash
 */
export function hashMessageBody(body: string): string {
  if (!body) {
    return createHash('sha256').update('').digest('hex');
  }

  return createHash('sha256').update(body, 'utf8').digest('hex');
}

/**
 * Creates a composite deduplication key for a message
 * Format: timestamp|normalizedPhone|bodyHash
 *
 * @param timestamp - Message timestamp (milliseconds)
 * @param normalizedPhone - Normalized phone number in E.164 format
 * @param body - Message body (will be hashed)
 * @returns Composite deduplication key
 */
export function createMessageDeduplicationKey(
  timestamp: number,
  normalizedPhone: string,
  body: string
): string {
  const bodyHash = hashMessageBody(body);
  return `${timestamp}|${normalizedPhone}|${bodyHash}`;
}

/**
 * Creates a composite deduplication key for a call
 * Format: timestamp|normalizedPhone|duration|type
 *
 * @param timestamp - Call timestamp (milliseconds)
 * @param normalizedPhone - Normalized phone number in E.164 format
 * @param duration - Call duration in seconds
 * @param type - Call type (1=incoming, 2=outgoing, 3=missed, 5=rejected)
 * @returns Composite deduplication key
 */
export function createCallDeduplicationKey(
  timestamp: number,
  normalizedPhone: string,
  duration: number,
  type: number
): string {
  return `${timestamp}|${normalizedPhone}|${duration}|${type}`;
}

/**
 * Import statistics tracker for tracking deduplication during import
 */
export interface ImportStats {
  totalParsed: number;
  messagesImported: number;
  callsImported: number;
  duplicatesSkipped: number;
  errors: number;
  errorMessages: string[];
}

/**
 * Creates a new empty import statistics object
 */
export function createImportStats(): ImportStats {
  return {
    totalParsed: 0,
    messagesImported: 0,
    callsImported: 0,
    duplicatesSkipped: 0,
    errors: 0,
    errorMessages: [],
  };
}

/**
 * Updates import stats when a message is successfully imported
 */
export function recordMessageImported(stats: ImportStats): void {
  stats.totalParsed++;
  stats.messagesImported++;
}

/**
 * Updates import stats when a call is successfully imported
 */
export function recordCallImported(stats: ImportStats): void {
  stats.totalParsed++;
  stats.callsImported++;
}

/**
 * Updates import stats when a duplicate is skipped
 */
export function recordDuplicateSkipped(stats: ImportStats): void {
  stats.totalParsed++;
  stats.duplicatesSkipped++;
}

/**
 * Updates import stats when an error occurs
 */
export function recordError(stats: ImportStats, message: string): void {
  stats.totalParsed++;
  stats.errors++;
  if (stats.errorMessages.length < 100) {
    // Limit error messages to prevent memory issues
    stats.errorMessages.push(message);
  }
}

/**
 * Formats import statistics for display
 */
export function formatImportStats(stats: ImportStats): string {
  const lines = [
    `Total parsed: ${stats.totalParsed}`,
    `Messages imported: ${stats.messagesImported}`,
    `Calls imported: ${stats.callsImported}`,
    `Duplicates skipped: ${stats.duplicatesSkipped}`,
    `Errors: ${stats.errors}`,
  ];

  if (stats.errorMessages.length > 0) {
    lines.push('');
    lines.push('Error details:');
    for (const msg of stats.errorMessages.slice(0, 10)) {
      lines.push(`  - ${msg}`);
    }
    if (stats.errorMessages.length > 10) {
      lines.push(`  ... and ${stats.errorMessages.length - 10} more`);
    }
  }

  return lines.join('\n');
}
