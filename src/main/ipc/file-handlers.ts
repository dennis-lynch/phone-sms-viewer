/**
 * File IPC Handlers
 *
 * Handles file dialogs, backup import, and file-related operations.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { parseSmsBackup, getBackupInfo } from '../parsers/sms-parser';
import { parseCallsBackup, getCallsBackupInfo } from '../parsers/calls-parser';
import {
  getBackupFileInfo,
  extractToTemp,
  cleanupTempFiles,
  scanDirectoryForBackups,
} from '../parsers/zip-extractor';
import { analyzeDatabase } from '../database/database';
import type { ImportProgress } from '../../shared/types';

// Track active import for cancellation
let activeImportAborted = false;

/**
 * Registers all file-related IPC handlers
 */
export function registerFileHandlers(mainWindow: BrowserWindow): void {
  // Open file dialog
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Backup Files', extensions: ['xml', 'zip'] },
        { name: 'XML Files', extensions: ['xml'] },
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Open multiple files dialog
  ipcMain.handle('open-files-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Backup Files', extensions: ['xml', 'zip'] },
        { name: 'XML Files', extensions: ['xml'] },
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }

    return result.filePaths;
  });

  // Open directory dialog
  ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Get backup file info
  ipcMain.handle('get-backup-info', async (_event, filePath: string) => {
    return getBackupFileInfo(filePath);
  });

  // Scan directory for backup files
  ipcMain.handle('scan-directory', async (_event, dirPath: string) => {
    return scanDirectoryForBackups(dirPath);
  });

  // Import a single backup file
  ipcMain.handle('import-backup', async (event, filePath: string) => {
    activeImportAborted = false;

    const ext = path.extname(filePath).toLowerCase();

    // Handle ZIP files - extract first
    let actualPath = filePath;
    let isTemp = false;

    if (ext === '.zip') {
      const extracted = extractToTemp(filePath);
      if (!extracted.success) {
        return {
          success: false,
          filePath,
          totalParsed: 0,
          messagesImported: 0,
          callsImported: 0,
          duplicatesSkipped: 0,
          errors: [extracted.error || 'Failed to extract ZIP file'],
          conversationsCreated: 0,
        };
      }
      actualPath = extracted.filePath;
      isTemp = true;
    }

    // Determine file type by reading headers
    const smsInfo = await getBackupInfo(actualPath);
    const callsInfo = await getCallsBackupInfo(actualPath);

    const onProgress = (progress: ImportProgress) => {
      if (!activeImportAborted) {
        event.sender.send('import-progress', progress);
      }
    };

    let result;
    try {
      if (smsInfo) {
        result = await parseSmsBackup(actualPath, onProgress);
      } else if (callsInfo) {
        result = await parseCallsBackup(actualPath, onProgress);
      } else {
        result = {
          success: false,
          filePath,
          totalParsed: 0,
          messagesImported: 0,
          callsImported: 0,
          duplicatesSkipped: 0,
          errors: ['Unknown backup format - could not detect SMS or calls data'],
          conversationsCreated: 0,
        };
      }
    } catch (error) {
      result = {
        success: false,
        filePath,
        totalParsed: 0,
        messagesImported: 0,
        callsImported: 0,
        duplicatesSkipped: 0,
        errors: [`Import failed: ${error}`],
        conversationsCreated: 0,
      };
    }

    // Cleanup temp file if we extracted from ZIP
    if (isTemp) {
      try {
        fs.unlinkSync(actualPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Run ANALYZE after successful import to optimize query performance
    if (result.success) {
      try {
        analyzeDatabase();
      } catch {
        // Ignore ANALYZE errors - not critical
      }
    }

    return result;
  });

  // Import multiple backup files
  ipcMain.handle('import-backups', async (event, filePaths: string[]) => {
    activeImportAborted = false;

    const results = [];
    let totalMessages = 0;
    let totalCalls = 0;
    let totalDuplicates = 0;

    for (let i = 0; i < filePaths.length; i++) {
      if (activeImportAborted) {
        break;
      }

      const filePath = filePaths[i];

      // Send file progress
      event.sender.send('import-file-progress', {
        currentFile: i + 1,
        totalFiles: filePaths.length,
        fileName: path.basename(filePath),
      });

      const ext = path.extname(filePath).toLowerCase();

      let actualPath = filePath;
      let isTemp = false;

      if (ext === '.zip') {
        const extracted = extractToTemp(filePath);
        if (!extracted.success) {
          results.push({
            success: false,
            filePath,
            error: extracted.error,
          });
          continue;
        }
        actualPath = extracted.filePath;
        isTemp = true;
      }

      const smsInfo = await getBackupInfo(actualPath);
      const callsInfo = await getCallsBackupInfo(actualPath);

      const onProgress = (progress: ImportProgress) => {
        if (!activeImportAborted) {
          event.sender.send('import-progress', {
            ...progress,
            currentFile: i + 1,
            totalFiles: filePaths.length,
          });
        }
      };

      let result;
      try {
        if (smsInfo) {
          result = await parseSmsBackup(actualPath, onProgress);
        } else if (callsInfo) {
          result = await parseCallsBackup(actualPath, onProgress);
        } else {
          result = {
            success: false,
            filePath,
            errors: ['Unknown format'],
          };
        }
      } catch (error) {
        result = {
          success: false,
          filePath,
          errors: [`${error}`],
        };
      }

      if (isTemp) {
        try {
          fs.unlinkSync(actualPath);
        } catch {
          // Ignore
        }
      }

      results.push(result);
      if (result.success) {
        totalMessages += result.messagesImported || 0;
        totalCalls += result.callsImported || 0;
        totalDuplicates += result.duplicatesSkipped || 0;
      }
    }

    // Run ANALYZE after all imports to optimize query performance
    if (totalMessages > 0 || totalCalls > 0) {
      try {
        analyzeDatabase();
      } catch {
        // Ignore ANALYZE errors - not critical
      }
    }

    return {
      results,
      summary: {
        filesProcessed: results.length,
        totalMessages,
        totalCalls,
        totalDuplicates,
        aborted: activeImportAborted,
      },
    };
  });

  // Cancel active import
  ipcMain.handle('cancel-import', async () => {
    activeImportAborted = true;
    return { success: true };
  });

  // Cleanup temp files
  ipcMain.handle('cleanup-temp-files', async () => {
    cleanupTempFiles();
    return { success: true };
  });
}

/**
 * Cleanup function to be called on app quit
 */
export function cleanupFileHandlers(): void {
  cleanupTempFiles();
}
