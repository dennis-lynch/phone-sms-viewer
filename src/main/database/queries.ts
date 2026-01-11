/**
 * Database Queries
 *
 * Prepared statements and query functions for messages, calls, and conversations.
 * Includes full-text search with FTS5 and regex support.
 */

import type { Database, Statement } from 'better-sqlite3';
import { getDatabase } from './database';
import type {
  Message,
  Call,
  Conversation,
  ImportMetadata,
  SearchFilters,
  SearchResult,
} from '../../shared/types';

// Cache for prepared statements
const statementCache = new Map<string, Statement>();

/**
 * Gets or creates a prepared statement
 */
function getStatement(sql: string): Statement {
  let stmt = statementCache.get(sql);
  if (!stmt) {
    stmt = getDatabase().prepare(sql);
    statementCache.set(sql, stmt);
  }
  return stmt;
}

/**
 * Clears the statement cache (call when database is reset)
 */
export function clearStatementCache(): void {
  statementCache.clear();
}

// ============================================================================
// Conversation Queries
// ============================================================================

/**
 * Gets or creates a conversation for a normalized phone number
 */
export function getOrCreateConversation(
  normalizedPhone: string,
  originalPhone: string,
  contactName: string
): number {
  const db = getDatabase();

  // Try to get existing conversation
  const existing = db
    .prepare('SELECT id, contact_name FROM conversations WHERE normalized_phone = ?')
    .get(normalizedPhone) as { id: number; contact_name: string } | undefined;

  if (existing) {
    // Update contact name if we have a better one
    if (contactName && contactName !== '(Unknown)' && existing.contact_name !== contactName) {
      db.prepare('UPDATE conversations SET contact_name = ? WHERE id = ?').run(
        contactName,
        existing.id
      );
    }
    return existing.id;
  }

  // Create new conversation
  const result = db
    .prepare(
      `INSERT INTO conversations (phone_number, normalized_phone, contact_name)
       VALUES (?, ?, ?)`
    )
    .run(originalPhone, normalizedPhone, contactName || '');

  return result.lastInsertRowid as number;
}

/**
 * Updates conversation statistics (message count, dates)
 */
export function updateConversationStats(conversationId: number): void {
  const db = getDatabase();

  db.prepare(
    `UPDATE conversations SET
       message_count = (SELECT COUNT(*) FROM messages WHERE conversation_id = ?),
       call_count = (SELECT COUNT(*) FROM calls WHERE conversation_id = ?),
       first_message_date = (SELECT MIN(timestamp) FROM messages WHERE conversation_id = ?),
       last_message_date = (SELECT MAX(timestamp) FROM messages WHERE conversation_id = ?)
     WHERE id = ?`
  ).run(conversationId, conversationId, conversationId, conversationId, conversationId);
}

/**
 * Gets all conversations sorted by last message date
 */
export function getConversations(limit = 1000, offset = 0): Conversation[] {
  const rows = getDatabase()
    .prepare(
      `SELECT id, phone_number, normalized_phone, contact_name,
              message_count, call_count, first_message_date, last_message_date
       FROM conversations
       ORDER BY last_message_date DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<{
    id: number;
    phone_number: string;
    normalized_phone: string;
    contact_name: string;
    message_count: number;
    call_count: number;
    first_message_date: number | null;
    last_message_date: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    phoneNumber: row.phone_number,
    normalizedPhone: row.normalized_phone,
    contactName: row.contact_name,
    messageCount: row.message_count,
    callCount: row.call_count,
    firstMessageDate: row.first_message_date || 0,
    lastMessageDate: row.last_message_date || 0,
  }));
}

/**
 * Gets a conversation by ID
 */
export function getConversationById(id: number): Conversation | null {
  const row = getDatabase()
    .prepare(
      `SELECT id, phone_number, normalized_phone, contact_name,
              message_count, call_count, first_message_date, last_message_date
       FROM conversations WHERE id = ?`
    )
    .get(id) as
    | {
        id: number;
        phone_number: string;
        normalized_phone: string;
        contact_name: string;
        message_count: number;
        call_count: number;
        first_message_date: number | null;
        last_message_date: number | null;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    phoneNumber: row.phone_number,
    normalizedPhone: row.normalized_phone,
    contactName: row.contact_name,
    messageCount: row.message_count,
    callCount: row.call_count,
    firstMessageDate: row.first_message_date || 0,
    lastMessageDate: row.last_message_date || 0,
  };
}

// ============================================================================
// Message Queries
// ============================================================================

/**
 * Inserts a message, returns true if inserted, false if duplicate
 */
export function insertMessage(message: Message): boolean {
  const db = getDatabase();

  try {
    db.prepare(
      `INSERT INTO messages
         (conversation_id, type, direction, body, body_hash, timestamp,
          original_phone, normalized_phone, contact_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      message.conversationId,
      message.type,
      message.direction,
      message.body,
      message.bodyHash,
      message.timestamp,
      message.originalPhone,
      message.normalizedPhone,
      message.contactName
    );
    return true;
  } catch (error: unknown) {
    // Check if it's a UNIQUE constraint violation (duplicate)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return false;
    }
    throw error;
  }
}

/**
 * Inserts multiple messages in a transaction
 * Returns count of successfully inserted (non-duplicate) messages
 */
export function insertMessagesBatch(messages: Message[]): number {
  const db = getDatabase();
  let inserted = 0;

  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO messages
       (conversation_id, type, direction, body, body_hash, timestamp,
        original_phone, normalized_phone, contact_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction((msgs: Message[]) => {
    for (const msg of msgs) {
      const result = insertStmt.run(
        msg.conversationId,
        msg.type,
        msg.direction,
        msg.body,
        msg.bodyHash,
        msg.timestamp,
        msg.originalPhone,
        msg.normalizedPhone,
        msg.contactName
      );
      if (result.changes > 0) {
        inserted++;
      }
    }
  });

  transaction(messages);
  return inserted;
}

/**
 * Gets messages for a conversation
 */
export function getMessagesByConversation(
  conversationId: number,
  limit = 500,
  offset = 0
): Message[] {
  const rows = getDatabase()
    .prepare(
      `SELECT id, conversation_id, type, direction, body, body_hash, timestamp,
              original_phone, normalized_phone, contact_name
       FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp ASC
       LIMIT ? OFFSET ?`
    )
    .all(conversationId, limit, offset) as Array<{
    id: number;
    conversation_id: number;
    type: number;
    direction: string;
    body: string;
    body_hash: string;
    timestamp: number;
    original_phone: string;
    normalized_phone: string;
    contact_name: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    type: row.type as 1 | 2,
    direction: row.direction as 'received' | 'sent',
    body: row.body,
    bodyHash: row.body_hash,
    timestamp: row.timestamp,
    originalPhone: row.original_phone,
    normalizedPhone: row.normalized_phone,
    contactName: row.contact_name,
  }));
}

/**
 * Gets the total message count for a conversation
 */
export function getMessageCountByConversation(conversationId: number): number {
  const row = getDatabase()
    .prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?')
    .get(conversationId) as { count: number };
  return row.count;
}

// ============================================================================
// Call Queries
// ============================================================================

/**
 * Inserts a call, returns true if inserted, false if duplicate
 */
export function insertCall(call: Call): boolean {
  const db = getDatabase();

  try {
    db.prepare(
      `INSERT INTO calls
         (conversation_id, phone_number, normalized_phone, contact_name,
          timestamp, duration, type, type_label)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      call.conversationId || null,
      call.phoneNumber,
      call.normalizedPhone,
      call.contactName,
      call.timestamp,
      call.duration,
      call.type,
      call.typeLabel
    );
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return false;
    }
    throw error;
  }
}

/**
 * Inserts multiple calls in a transaction
 */
export function insertCallsBatch(calls: Call[]): number {
  const db = getDatabase();
  let inserted = 0;

  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO calls
       (conversation_id, phone_number, normalized_phone, contact_name,
        timestamp, duration, type, type_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction((callList: Call[]) => {
    for (const call of callList) {
      const result = insertStmt.run(
        call.conversationId || null,
        call.phoneNumber,
        call.normalizedPhone,
        call.contactName,
        call.timestamp,
        call.duration,
        call.type,
        call.typeLabel
      );
      if (result.changes > 0) {
        inserted++;
      }
    }
  });

  transaction(calls);
  return inserted;
}

/**
 * Gets calls for a conversation
 */
export function getCallsByConversation(conversationId: number, limit = 500, offset = 0): Call[] {
  const rows = getDatabase()
    .prepare(
      `SELECT id, conversation_id, phone_number, normalized_phone, contact_name,
              timestamp, duration, type, type_label
       FROM calls
       WHERE conversation_id = ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`
    )
    .all(conversationId, limit, offset) as Array<{
    id: number;
    conversation_id: number | null;
    phone_number: string;
    normalized_phone: string;
    contact_name: string;
    timestamp: number;
    duration: number;
    type: number;
    type_label: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id || undefined,
    phoneNumber: row.phone_number,
    normalizedPhone: row.normalized_phone,
    contactName: row.contact_name,
    timestamp: row.timestamp,
    duration: row.duration,
    type: row.type as 1 | 2 | 3 | 5,
    typeLabel: row.type_label as 'incoming' | 'outgoing' | 'missed' | 'rejected',
  }));
}

/**
 * Gets all calls sorted by timestamp
 */
export function getAllCalls(limit = 500, offset = 0): Call[] {
  const rows = getDatabase()
    .prepare(
      `SELECT id, conversation_id, phone_number, normalized_phone, contact_name,
              timestamp, duration, type, type_label
       FROM calls
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<{
    id: number;
    conversation_id: number | null;
    phone_number: string;
    normalized_phone: string;
    contact_name: string;
    timestamp: number;
    duration: number;
    type: number;
    type_label: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id || undefined,
    phoneNumber: row.phone_number,
    normalizedPhone: row.normalized_phone,
    contactName: row.contact_name,
    timestamp: row.timestamp,
    duration: row.duration,
    type: row.type as 1 | 2 | 3 | 5,
    typeLabel: row.type_label as 'incoming' | 'outgoing' | 'missed' | 'rejected',
  }));
}

// ============================================================================
// Search Queries
// ============================================================================

/**
 * Searches messages using FTS5 or REGEXP
 */
export function searchMessages(filters: SearchFilters, limit = 500): SearchResult[] {
  const db = getDatabase();
  const params: (string | number)[] = [];
  let sql: string;

  if (filters.useRegex) {
    // Use REGEXP for regex search
    sql = `
      SELECT m.id, m.conversation_id, m.type, m.direction, m.body, m.body_hash,
             m.timestamp, m.original_phone, m.normalized_phone, m.contact_name,
             c.contact_name as conv_contact_name
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.body REGEXP ?
    `;
    params.push(filters.query);
  } else {
    // Use FTS5 for text search
    sql = `
      SELECT m.id, m.conversation_id, m.type, m.direction, m.body, m.body_hash,
             m.timestamp, m.original_phone, m.normalized_phone, m.contact_name,
             c.contact_name as conv_contact_name,
             highlight(messages_fts, 0, '<mark>', '</mark>') as highlighted_body
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN messages_fts ON messages_fts.rowid = m.id
      WHERE messages_fts MATCH ?
    `;
    // Escape FTS5 special characters and quote the search term
    const escapedQuery = filters.query.replace(/['"]/g, '""');
    params.push(`"${escapedQuery}"`);
  }

  // Add filters
  if (filters.startDate) {
    sql += ' AND m.timestamp >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ' AND m.timestamp <= ?';
    params.push(filters.endDate);
  }
  if (filters.direction && filters.direction !== 'all') {
    sql += ' AND m.direction = ?';
    params.push(filters.direction);
  }
  if (filters.conversationId) {
    sql += ' AND m.conversation_id = ?';
    params.push(filters.conversationId);
  }

  sql += ' ORDER BY m.timestamp DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number;
    conversation_id: number;
    type: number;
    direction: string;
    body: string;
    body_hash: string;
    timestamp: number;
    original_phone: string;
    normalized_phone: string;
    contact_name: string;
    conv_contact_name: string;
    highlighted_body?: string;
  }>;

  return rows.map((row) => ({
    message: {
      id: row.id,
      conversationId: row.conversation_id,
      type: row.type as 1 | 2,
      direction: row.direction as 'received' | 'sent',
      body: row.body,
      bodyHash: row.body_hash,
      timestamp: row.timestamp,
      originalPhone: row.original_phone,
      normalizedPhone: row.normalized_phone,
      contactName: row.contact_name,
    },
    conversationId: row.conversation_id,
    contactName: row.conv_contact_name,
    highlightedBody: row.highlighted_body,
  }));
}

// ============================================================================
// Import Metadata Queries
// ============================================================================

/**
 * Records an import in the metadata table
 */
export function recordImport(metadata: ImportMetadata): number {
  const result = getDatabase()
    .prepare(
      `INSERT INTO import_metadata
         (file_path, backup_set, backup_date, import_date, message_count, call_count, type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      metadata.filePath,
      metadata.backupSet,
      metadata.backupDate,
      metadata.importDate,
      metadata.messageCount,
      metadata.callCount,
      metadata.type
    );

  return result.lastInsertRowid as number;
}

/**
 * Gets import history
 */
export function getImportHistory(): ImportMetadata[] {
  const rows = getDatabase()
    .prepare(
      `SELECT id, file_path, backup_set, backup_date, import_date,
              message_count, call_count, type
       FROM import_metadata
       ORDER BY import_date DESC`
    )
    .all() as Array<{
    id: number;
    file_path: string;
    backup_set: string;
    backup_date: number | null;
    import_date: number;
    message_count: number;
    call_count: number;
    type: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    filePath: row.file_path,
    backupSet: row.backup_set,
    backupDate: row.backup_date || 0,
    importDate: row.import_date,
    messageCount: row.message_count,
    callCount: row.call_count,
    type: row.type as 'sms' | 'calls',
  }));
}

/**
 * Gets the last message preview for a conversation
 */
export function getLastMessagePreview(conversationId: number): string {
  const row = getDatabase()
    .prepare(
      `SELECT body FROM messages
       WHERE conversation_id = ?
       ORDER BY timestamp DESC
       LIMIT 1`
    )
    .get(conversationId) as { body: string } | undefined;

  return row?.body || '';
}

/**
 * Updates all conversation statistics (for use after bulk import)
 */
export function updateAllConversationStats(): void {
  getDatabase().exec(`
    UPDATE conversations SET
      message_count = (SELECT COUNT(*) FROM messages WHERE messages.conversation_id = conversations.id),
      call_count = (SELECT COUNT(*) FROM calls WHERE calls.conversation_id = conversations.id),
      first_message_date = (SELECT MIN(timestamp) FROM messages WHERE messages.conversation_id = conversations.id),
      last_message_date = (SELECT MAX(timestamp) FROM messages WHERE messages.conversation_id = conversations.id)
  `);
}
