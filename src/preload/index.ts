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
} from '../shared/types';

/**
 * API exposed to the renderer process
 */
const api = {
  // File dialogs
  openFileDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('open-file-dialog');
  },

  openDirectoryDialog: (): Promise<string | null> => {
    return ipcRenderer.invoke('open-directory-dialog');
  },

  // Backup info
  getBackupInfo: (filePath: string): Promise<BackupFileInfo | null> => {
    return ipcRenderer.invoke('get-backup-info', filePath);
  },

  scanDirectory: (dirPath: string): Promise<BackupFileInfo[]> => {
    return ipcRenderer.invoke('scan-directory', dirPath);
  },

  // Import
  importBackup: (filePath: string): Promise<ImportResult> => {
    return ipcRenderer.invoke('import-backup', filePath);
  },

  onImportProgress: (callback: (progress: ImportProgress) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, progress: ImportProgress) => {
      callback(progress);
    };
    ipcRenderer.on('import-progress', handler);
    return () => {
      ipcRenderer.removeListener('import-progress', handler);
    };
  },

  // Conversations
  getConversations: (limit?: number, offset?: number): Promise<Conversation[]> => {
    return ipcRenderer.invoke('get-conversations', limit, offset);
  },

  // Messages
  getMessages: (conversationId: number, limit?: number, offset?: number): Promise<Message[]> => {
    return ipcRenderer.invoke('get-messages', conversationId, limit, offset);
  },

  // Calls
  getCalls: (limit?: number, offset?: number): Promise<Call[]> => {
    return ipcRenderer.invoke('get-calls', limit, offset);
  },

  // Search
  searchMessages: (filters: SearchFilters, limit?: number): Promise<SearchResult[]> => {
    return ipcRenderer.invoke('search-messages', filters, limit);
  },

  // Database stats
  getDatabaseStats: (): Promise<DatabaseStats> => {
    return ipcRenderer.invoke('get-database-stats');
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// TypeScript type for the exposed API
export type ElectronAPI = typeof api;
