/**
 * File Service
 *
 * Wrapper around electron IPC for file operations.
 * Handles file dialogs, backup imports, and progress tracking.
 */

import type { BackupFileInfo, ImportProgress, ImportResult } from '../../shared/types';

/**
 * Opens a file picker dialog for selecting a single backup file
 */
export async function openFileDialog(): Promise<string | null> {
  return window.electronAPI.openFileDialog();
}

/**
 * Opens a file picker dialog for selecting multiple backup files
 */
export async function openFilesDialog(): Promise<string[]> {
  return window.electronAPI.openFilesDialog();
}

/**
 * Opens a directory picker dialog
 */
export async function openDirectoryDialog(): Promise<string | null> {
  return window.electronAPI.openDirectoryDialog();
}

/**
 * Gets information about a backup file without importing it
 */
export async function getBackupInfo(filePath: string): Promise<BackupFileInfo | null> {
  return window.electronAPI.getBackupInfo(filePath);
}

/**
 * Scans a directory for backup files
 */
export async function scanDirectory(dirPath: string): Promise<BackupFileInfo[]> {
  return window.electronAPI.scanDirectory(dirPath);
}

/**
 * Imports a single backup file
 */
export async function importBackup(filePath: string): Promise<ImportResult> {
  return window.electronAPI.importBackup(filePath);
}

/**
 * Imports multiple backup files
 */
export async function importBackups(filePaths: string[]): Promise<{
  results: ImportResult[];
  summary: {
    filesProcessed: number;
    totalMessages: number;
    totalCalls: number;
    totalDuplicates: number;
    aborted: boolean;
  };
}> {
  return window.electronAPI.importBackups(filePaths);
}

/**
 * Cancels the current import operation
 */
export async function cancelImport(): Promise<boolean> {
  const result = await window.electronAPI.cancelImport();
  return result.success;
}

/**
 * Cleans up temporary files
 */
export async function cleanupTempFiles(): Promise<boolean> {
  const result = await window.electronAPI.cleanupTempFiles();
  return result.success;
}

/**
 * Subscribes to import progress events
 * Returns an unsubscribe function
 */
export function onImportProgress(
  callback: (progress: ImportProgress & { currentFile?: number; totalFiles?: number }) => void
): () => void {
  return window.electronAPI.onImportProgress(callback);
}

/**
 * Subscribes to file progress events (for multi-file imports)
 * Returns an unsubscribe function
 */
export function onImportFileProgress(
  callback: (progress: { currentFile: number; totalFiles: number; fileName: string }) => void
): () => void {
  return window.electronAPI.onImportFileProgress(callback);
}

/**
 * Helper to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Helper to get a human-readable backup type
 */
export function getBackupTypeLabel(type: 'sms' | 'calls' | 'unknown'): string {
  switch (type) {
    case 'sms':
      return 'SMS/MMS Messages';
    case 'calls':
      return 'Call Log';
    default:
      return 'Unknown';
  }
}
