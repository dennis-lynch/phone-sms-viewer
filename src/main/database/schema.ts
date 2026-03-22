/**
 * Database Schema
 *
 * Defines the SQLite database schema for storing SMS messages, calls, and conversations.
 * Uses FTS5 for full-text search and UNIQUE constraints for deduplication.
 */

/**
 * SQL statements to create the database schema
 */
export const SCHEMA_SQL = `
-- Enable WAL mode for better concurrent read performance
PRAGMA journal_mode = WAL;

-- Increase cache size for better performance (negative = KB, so -64000 = 64MB)
PRAGMA cache_size = -64000;

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Conversations table: groups messages by normalized phone number
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,           -- Original phone number (for display)
  normalized_phone TEXT NOT NULL UNIQUE, -- E.164 format (for grouping)
  contact_name TEXT NOT NULL DEFAULT '',
  message_count INTEGER NOT NULL DEFAULT 0,
  call_count INTEGER NOT NULL DEFAULT 0,
  first_message_date INTEGER,            -- Timestamp in milliseconds
  last_message_date INTEGER              -- Timestamp in milliseconds
);

-- Index for conversation lookup
CREATE INDEX IF NOT EXISTS idx_conversations_normalized_phone ON conversations(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_date DESC);

-- Messages table: stores individual SMS/MMS messages
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  type INTEGER NOT NULL,                  -- 1=received, 2=sent
  direction TEXT NOT NULL,                -- 'received' or 'sent'
  body TEXT NOT NULL DEFAULT '',
  body_hash TEXT NOT NULL,                -- SHA-256 hash for deduplication
  timestamp INTEGER NOT NULL,             -- Timestamp in milliseconds
  original_phone TEXT NOT NULL,           -- Original phone format from backup
  normalized_phone TEXT NOT NULL,         -- E.164 format
  contact_name TEXT NOT NULL DEFAULT '',
  m_size INTEGER NOT NULL DEFAULT 0,     -- Original message size from XML (for MMS with media)
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  -- Deduplication constraint: same timestamp + phone + content = duplicate
  UNIQUE(timestamp, normalized_phone, body_hash)
);

-- Indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_normalized_phone ON messages(normalized_phone);

-- FTS5 virtual table for full-text search on message bodies
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  body,
  content='messages',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 1'
);

-- Triggers to keep FTS index in sync with messages table
CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, body) VALUES (new.id, new.body);
END;

CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, body) VALUES('delete', old.id, old.body);
END;

CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, body) VALUES('delete', old.id, old.body);
  INSERT INTO messages_fts(rowid, body) VALUES (new.id, new.body);
END;

-- Calls table: stores call log entries
CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,               -- May be NULL if no corresponding conversation
  phone_number TEXT NOT NULL,             -- Original phone format
  normalized_phone TEXT NOT NULL,         -- E.164 format
  contact_name TEXT NOT NULL DEFAULT '',
  timestamp INTEGER NOT NULL,             -- Timestamp in milliseconds
  duration INTEGER NOT NULL DEFAULT 0,    -- Duration in seconds
  type INTEGER NOT NULL,                  -- 1=incoming, 2=outgoing, 3=missed, 5=rejected
  type_label TEXT NOT NULL,               -- 'incoming', 'outgoing', 'missed', 'rejected'
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
  -- Deduplication constraint
  UNIQUE(timestamp, normalized_phone, duration, type)
);

-- Indexes for call queries
CREATE INDEX IF NOT EXISTS idx_calls_conversation ON calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_timestamp ON calls(timestamp);
CREATE INDEX IF NOT EXISTS idx_calls_normalized_phone ON calls(normalized_phone);

-- Import metadata table: tracks imported backup files
CREATE TABLE IF NOT EXISTS import_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  backup_set TEXT NOT NULL,              -- UUID from backup file
  backup_date INTEGER,                    -- Timestamp from backup file
  import_date INTEGER NOT NULL,           -- When the import was performed
  message_count INTEGER NOT NULL DEFAULT 0,
  call_count INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL                      -- 'sms' or 'calls'
);

CREATE INDEX IF NOT EXISTS idx_import_metadata_backup_set ON import_metadata(backup_set);
`;

/**
 * SQL to drop all tables (for reset/testing)
 */
export const DROP_SCHEMA_SQL = `
DROP TRIGGER IF EXISTS messages_au;
DROP TRIGGER IF EXISTS messages_ad;
DROP TRIGGER IF EXISTS messages_ai;
DROP TABLE IF EXISTS messages_fts;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS calls;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS import_metadata;
`;

/**
 * SQL to run ANALYZE for query optimization
 */
export const ANALYZE_SQL = `ANALYZE;`;

/**
 * SQL to vacuum the database (reclaim space)
 */
export const VACUUM_SQL = `VACUUM;`;

/**
 * SQL to get database statistics
 */
export const STATS_SQL = `
SELECT
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(*) FROM calls) as total_calls,
  (SELECT COUNT(*) FROM conversations) as total_conversations,
  (SELECT MIN(timestamp) FROM messages) as oldest_message,
  (SELECT MAX(timestamp) FROM messages) as newest_message
`;
