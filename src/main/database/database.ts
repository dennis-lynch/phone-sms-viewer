/**
 * Database Connection Manager
 *
 * Manages SQLite database connection using better-sqlite3.
 * Provides connection pooling, initialization, and cleanup.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { SCHEMA_SQL, DROP_SCHEMA_SQL, ANALYZE_SQL, VACUUM_SQL, STATS_SQL } from './schema';
import type { DatabaseStats } from '../../shared/types';

let db: Database.Database | null = null;

/**
 * Gets the path to the database file
 */
export function getDatabasePath(): string {
  // Use user data directory for persistent storage
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'sms-viewer.db');
}

/**
 * Gets the current database instance
 * @throws Error if database is not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Checks if the database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null;
}

/**
 * Initializes the database connection and creates schema
 * @param dbPath - Optional custom database path (for testing)
 */
export function initializeDatabase(dbPath?: string): Database.Database {
  if (db) {
    return db;
  }

  const databasePath = dbPath || getDatabasePath();

  // Ensure directory exists
  const dir = path.dirname(databasePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create database connection
  db = new Database(databasePath);

  // Execute schema creation
  db.exec(SCHEMA_SQL);

  // Migrate existing databases: add m_size column if missing
  try {
    db.exec('ALTER TABLE messages ADD COLUMN m_size INTEGER NOT NULL DEFAULT 0');
  } catch {
    // Column already exists, ignore
  }

  // Register custom REGEXP function for regex search
  db.function('regexp', { deterministic: true }, (pattern: unknown, value: unknown) => {
    if (typeof pattern !== 'string' || typeof value !== 'string') {
      return 0;
    }
    try {
      const regex = new RegExp(pattern as string, 'i');
      return regex.test(value as string) ? 1 : 0;
    } catch {
      return 0;
    }
  });

  return db;
}

/**
 * Closes the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Resets the database by dropping and recreating all tables
 * WARNING: This deletes all data!
 */
export function resetDatabase(): void {
  const database = getDatabase();
  database.exec(DROP_SCHEMA_SQL);
  database.exec(SCHEMA_SQL);
}

/**
 * Runs ANALYZE to optimize query performance
 */
export function analyzeDatabase(): void {
  const database = getDatabase();
  database.exec(ANALYZE_SQL);
}

/**
 * Runs VACUUM to reclaim disk space
 */
export function vacuumDatabase(): void {
  const database = getDatabase();
  database.exec(VACUUM_SQL);
}

/**
 * Gets database statistics
 */
export function getDatabaseStats(): DatabaseStats {
  const database = getDatabase();
  const row = database.prepare(STATS_SQL).get() as {
    total_messages: number;
    total_calls: number;
    total_conversations: number;
    oldest_message: number | null;
    newest_message: number | null;
  };

  // Get database file size
  const dbPath = getDatabasePath();
  let databaseSize = 0;
  try {
    const stats = fs.statSync(dbPath);
    databaseSize = stats.size;
  } catch {
    // File might not exist yet
  }

  return {
    totalMessages: row.total_messages || 0,
    totalCalls: row.total_calls || 0,
    totalConversations: row.total_conversations || 0,
    oldestMessage: row.oldest_message || 0,
    newestMessage: row.newest_message || 0,
    databaseSize,
  };
}

/**
 * Begins a transaction and returns a function to commit or rollback
 */
export function beginTransaction(): {
  commit: () => void;
  rollback: () => void;
} {
  const database = getDatabase();
  database.exec('BEGIN TRANSACTION');

  return {
    commit: () => database.exec('COMMIT'),
    rollback: () => database.exec('ROLLBACK'),
  };
}

/**
 * Wraps a function in a transaction
 * Automatically commits on success, rolls back on error
 */
export function withTransaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * Checks if a backup has already been imported
 * @param backupSet - The backup_set UUID from the XML file
 */
export function isBackupImported(backupSet: string): boolean {
  const database = getDatabase();
  const row = database
    .prepare('SELECT COUNT(*) as count FROM import_metadata WHERE backup_set = ?')
    .get(backupSet) as { count: number };
  return row.count > 0;
}

/**
 * Gets the database file size in bytes
 */
export function getDatabaseSize(): number {
  const dbPath = getDatabasePath();
  try {
    const stats = fs.statSync(dbPath);
    return stats.size;
  } catch {
    return 0;
  }
}
