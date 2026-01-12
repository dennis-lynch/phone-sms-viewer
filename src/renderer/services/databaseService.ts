/**
 * Database Service
 *
 * Wrapper around electron IPC for database queries.
 * Handles conversations, messages, calls, and search operations.
 */

import type {
  Conversation,
  Message,
  Call,
  SearchFilters,
  SearchResult,
  DatabaseStats,
  ImportMetadata,
  ExportOptions,
} from '../../shared/types';

/**
 * Error class for database service errors
 */
export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Helper to unwrap IPC response and throw on error
 */
function unwrapResponse<T>(response: { success: boolean; data?: T; error?: string }): T {
  if (!response.success) {
    throw new DatabaseError(response.error || 'Unknown database error');
  }
  return response.data as T;
}

// ============================================================================
// Conversation Operations
// ============================================================================

/**
 * Gets all conversations, sorted by last message date
 */
export async function getConversations(limit = 1000, offset = 0): Promise<Conversation[]> {
  const response = await window.electronAPI.getConversations(limit, offset);
  return unwrapResponse(response);
}

/**
 * Gets a single conversation by ID
 */
export async function getConversation(conversationId: number): Promise<Conversation | null> {
  const response = await window.electronAPI.getConversation(conversationId);
  return unwrapResponse(response);
}

// ============================================================================
// Message Operations
// ============================================================================

/**
 * Gets messages for a conversation
 */
export async function getMessages(
  conversationId: number,
  limit = 500,
  offset = 0
): Promise<Message[]> {
  const response = await window.electronAPI.getMessages(conversationId, limit, offset);
  return unwrapResponse(response);
}

/**
 * Gets the total message count for a conversation
 */
export async function getMessageCount(conversationId: number): Promise<number> {
  const response = await window.electronAPI.getMessageCount(conversationId);
  return unwrapResponse(response);
}

/**
 * Gets the last message preview for a conversation
 */
export async function getLastMessagePreview(conversationId: number): Promise<string> {
  const response = await window.electronAPI.getLastMessagePreview(conversationId);
  return unwrapResponse(response);
}

/**
 * Searches messages with filters
 */
export async function searchMessages(
  filters: SearchFilters,
  limit = 500
): Promise<SearchResult[]> {
  const response = await window.electronAPI.searchMessages(filters, limit);
  return unwrapResponse(response);
}

// ============================================================================
// Call Operations
// ============================================================================

/**
 * Gets all calls, sorted by timestamp
 */
export async function getCalls(limit = 500, offset = 0): Promise<Call[]> {
  const response = await window.electronAPI.getCalls(limit, offset);
  return unwrapResponse(response);
}

/**
 * Gets calls for a specific conversation
 */
export async function getCallsByConversation(
  conversationId: number,
  limit = 500,
  offset = 0
): Promise<Call[]> {
  const response = await window.electronAPI.getCallsByConversation(conversationId, limit, offset);
  return unwrapResponse(response);
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Gets database statistics
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const response = await window.electronAPI.getDatabaseStats();
  return unwrapResponse(response);
}

/**
 * Gets import history
 */
export async function getImportHistory(): Promise<ImportMetadata[]> {
  const response = await window.electronAPI.getImportHistory();
  return unwrapResponse(response);
}

/**
 * Resets the database (deletes all data)
 */
export async function resetDatabase(): Promise<void> {
  const result = await window.electronAPI.resetDatabase();
  if (!result.success) {
    throw new DatabaseError(result.error || 'Failed to reset database');
  }
}

/**
 * Optimizes the database
 */
export async function optimizeDatabase(): Promise<void> {
  const result = await window.electronAPI.optimizeDatabase();
  if (!result.success) {
    throw new DatabaseError(result.error || 'Failed to optimize database');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Formats a relative timestamp (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}y ago`;
  if (months > 0) return `${months}mo ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Truncates a message preview
 */
export function truncatePreview(text: string, maxLength = 60): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Gets initials from a contact name for avatar
 */
export function getInitials(name: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Formats call duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

// ============================================================================
// Export Operations
// ============================================================================

/**
 * Exports messages to a file
 */
export async function exportMessages(
  messages: Message[],
  options: ExportOptions,
  title?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  return window.electronAPI.exportMessages(messages, options, title);
}
