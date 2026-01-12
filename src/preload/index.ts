/**
 * Preload Script
 *
 * Exposes a safe IPC API to the renderer process via contextBridge.
 * This is the security boundary between the main process and the renderer.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  Conversation,
  Message,
  Call,
  SearchFilters,
  SearchResult,
  ImportProgress,
  ImportResult,
  BackupFileInfo,
  DatabaseStats,
  ImportMetadata,
} from '../shared/types';

// Helper type for IPC responses
interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * API exposed to the renderer process
 */
const api = {
  // ============================================================================
  // File Operations
  // ============================================================================

  /** Opens a file picker dialog for selecting a single backup file */
  openFileDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('open-file-dialog');
  },

  /** Opens a file picker dialog for selecting multiple backup files */
  openFilesDialog: (): Promise<string[]> => {
    return ipcRenderer.invoke('open-files-dialog');
  },

  /** Opens a directory picker dialog */
  openDirectoryDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('open-directory-dialog');
  },

  /** Gets information about a backup file without importing */
  getBackupInfo: (filePath: string): Promise<BackupFileInfo | null> => {
    return ipcRenderer.invoke('get-backup-info', filePath);
  },

  /** Scans a directory for backup files */
  scanDirectory: (dirPath: string): Promise<BackupFileInfo[]> => {
    return ipcRenderer.invoke('scan-directory', dirPath);
  },

  /** Imports a single backup file */
  importBackup: (filePath: string): Promise<ImportResult> => {
    return ipcRenderer.invoke('import-backup', filePath);
  },

  /** Imports multiple backup files */
  importBackups: (
    filePaths: string[]
  ): Promise<{
    results: ImportResult[];
    summary: {
      filesProcessed: number;
      totalMessages: number;
      totalCalls: number;
      totalDuplicates: number;
      aborted: boolean;
    };
  }> => {
    return ipcRenderer.invoke('import-backups', filePaths);
  },

  /** Cancels the current import operation */
  cancelImport: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('cancel-import');
  },

  /** Cleans up temporary files */
  cleanupTempFiles: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('cleanup-temp-files');
  },

  /** Subscribes to import progress events */
  onImportProgress: (
    callback: (progress: ImportProgress & { currentFile?: number; totalFiles?: number }) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      progress: ImportProgress & { currentFile?: number; totalFiles?: number }
    ) => {
      callback(progress);
    };
    ipcRenderer.on('import-progress', handler);
    return () => {
      ipcRenderer.removeListener('import-progress', handler);
    };
  },

  /** Subscribes to file progress events (for multi-file imports) */
  onImportFileProgress: (
    callback: (progress: { currentFile: number; totalFiles: number; fileName: string }) => void
  ): (() => void) => {
    const handler = (
      _event: IpcRendererEvent,
      progress: { currentFile: number; totalFiles: number; fileName: string }
    ) => {
      callback(progress);
    };
    ipcRenderer.on('import-file-progress', handler);
    return () => {
      ipcRenderer.removeListener('import-file-progress', handler);
    };
  },

  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /** Gets all conversations, sorted by last message date */
  getConversations: (
    limit?: number,
    offset?: number
  ): Promise<IpcResponse<Conversation[]>> => {
    return ipcRenderer.invoke('get-conversations', limit, offset);
  },

  /** Gets a single conversation by ID */
  getConversation: (conversationId: number): Promise<IpcResponse<Conversation | null>> => {
    return ipcRenderer.invoke('get-conversation', conversationId);
  },

  // ============================================================================
  // Message Operations
  // ============================================================================

  /** Gets messages for a conversation */
  getMessages: (
    conversationId: number,
    limit?: number,
    offset?: number
  ): Promise<IpcResponse<Message[]>> => {
    return ipcRenderer.invoke('get-messages', conversationId, limit, offset);
  },

  /** Gets the total message count for a conversation */
  getMessageCount: (conversationId: number): Promise<IpcResponse<number>> => {
    return ipcRenderer.invoke('get-message-count', conversationId);
  },

  /** Gets the last message preview for a conversation */
  getLastMessagePreview: (conversationId: number): Promise<IpcResponse<string>> => {
    return ipcRenderer.invoke('get-last-message-preview', conversationId);
  },

  /** Searches messages with filters */
  searchMessages: (
    filters: SearchFilters,
    limit?: number
  ): Promise<IpcResponse<SearchResult[]>> => {
    return ipcRenderer.invoke('search-messages', filters, limit);
  },

  // ============================================================================
  // Call Operations
  // ============================================================================

  /** Gets all calls, sorted by timestamp */
  getCalls: (limit?: number, offset?: number): Promise<IpcResponse<Call[]>> => {
    return ipcRenderer.invoke('get-calls', limit, offset);
  },

  /** Gets calls for a specific conversation */
  getCallsByConversation: (
    conversationId: number,
    limit?: number,
    offset?: number
  ): Promise<IpcResponse<Call[]>> => {
    return ipcRenderer.invoke('get-calls-by-conversation', conversationId, limit, offset);
  },

  // ============================================================================
  // Database Operations
  // ============================================================================

  /** Gets database statistics */
  getDatabaseStats: (): Promise<IpcResponse<DatabaseStats>> => {
    return ipcRenderer.invoke('get-database-stats');
  },

  /** Gets import history */
  getImportHistory: (): Promise<IpcResponse<ImportMetadata[]>> => {
    return ipcRenderer.invoke('get-import-history');
  },

  /** Resets the database (deletes all data) */
  resetDatabase: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('reset-database');
  },

  /** Optimizes the database (runs ANALYZE) */
  optimizeDatabase: (): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('optimize-database');
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// TypeScript type for the exposed API
export type ElectronAPI = typeof api;

// Declare the global type for TypeScript in renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
