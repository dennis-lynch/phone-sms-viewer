// Shared types between main and renderer processes

// Message types from SMS backup
export type MessageType = 1 | 2; // 1 = Received, 2 = Sent
export type MessageDirection = 'received' | 'sent';

// Call types from calls backup
export type CallType = 1 | 2 | 3 | 5; // 1 = Incoming, 2 = Outgoing, 3 = Missed, 5 = Rejected
export type CallTypeLabel = 'incoming' | 'outgoing' | 'missed' | 'rejected';

// Raw SMS element from XML
export interface RawSmsMessage {
  address: string;
  date: string;
  type: string;
  body: string;
  contactName: string;
  readableDate?: string;
}

// Raw MMS element from XML
export interface RawMmsMessage {
  address: string;
  date: string;
  type: string;
  body: string;
  contactName: string;
  readableDate?: string;
}

// Raw call element from XML
export interface RawCall {
  number: string;
  duration: string;
  date: string;
  type: string;
  contactName: string;
  readableDate?: string;
}

// Parsed and normalized message
export interface Message {
  id?: number;
  conversationId?: number;
  type: MessageType;
  direction: MessageDirection;
  body: string;
  bodyHash: string;
  timestamp: number;
  originalPhone: string;
  normalizedPhone: string;
  contactName: string;
  mSize?: number; // Original message size from XML (mainly for MMS with media)
}

// Parsed and normalized call
export interface Call {
  id?: number;
  conversationId?: number;
  phoneNumber: string;
  normalizedPhone: string;
  contactName: string;
  timestamp: number;
  duration: number;
  type: CallType;
  typeLabel: CallTypeLabel;
}

// Conversation (grouped messages by phone number)
export interface Conversation {
  id?: number;
  phoneNumber: string;
  normalizedPhone: string;
  contactName: string;
  messageCount: number;
  callCount: number;
  lastMessageDate: number;
  firstMessageDate: number;
  totalBodySize: number; // sum of message body lengths in bytes
}

export type ConversationSortOrder = 'recent' | 'size' | 'messages';

// Import metadata tracking
export interface ImportMetadata {
  id?: number;
  filePath: string;
  backupSet: string;
  backupDate: number;
  importDate: number;
  messageCount: number;
  callCount: number;
  type: 'sms' | 'calls';
}

// Import progress event
export interface ImportProgress {
  phase: 'parsing' | 'inserting' | 'grouping' | 'complete';
  current: number;
  total: number;
  messagesImported: number;
  duplicatesSkipped: number;
  errors: number;
}

// Import result summary
export interface ImportResult {
  success: boolean;
  filePath: string;
  totalParsed: number;
  messagesImported: number;
  callsImported: number;
  duplicatesSkipped: number;
  errors: string[];
  conversationsCreated: number;
}

// Search filters
export interface SearchFilters {
  query: string;
  useRegex: boolean;
  startDate?: number;
  endDate?: number;
  contactName?: string;
  direction?: MessageDirection | 'all';
  conversationId?: number;
}

// Search result
export interface SearchResult {
  message: Message;
  conversationId: number;
  contactName: string;
  highlightedBody?: string;
}

// Export options
export interface ExportOptions {
  format: 'text' | 'csv' | 'json' | 'html';
  includeTimestamps: boolean;
  includeContactNames: boolean;
  scope: 'selection' | 'conversation' | 'search' | 'all';
}

// Database statistics
export interface DatabaseStats {
  totalMessages: number;
  totalCalls: number;
  totalConversations: number;
  oldestMessage: number;
  newestMessage: number;
  databaseSize: number;
}

// Backup file info
export interface BackupFileInfo {
  filePath: string;
  fileName: string;
  type: 'sms' | 'calls' | 'unknown';
  count: number;
  backupSet: string;
  backupDate: number;
  size: number;
}
