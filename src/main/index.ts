/**
 * Electron Main Process Entry Point
 *
 * Initializes the application, creates windows, and handles IPC communication.
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { initializeDatabase, closeDatabase, getDatabaseStats } from './database/database';
import { getConversations, getMessagesByConversation, searchMessages, getAllCalls } from './database/queries';
import { parseSmsBackup, getBackupInfo } from './parsers/sms-parser';
import { parseCallsBackup, getCallsBackupInfo } from './parsers/calls-parser';
import { getBackupFileInfo, extractToTemp, cleanupTempFiles, scanDirectoryForBackups } from './parsers/zip-extractor';
import type { SearchFilters, ImportProgress } from '../shared/types';

let mainWindow: BrowserWindow | null = null;

/**
 * Creates the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Don't show until ready
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize the application
 */
app.whenReady().then(() => {
  // Initialize database
  initializeDatabase();

  // Create main window
  createWindow();

  // Register IPC handlers
  registerIpcHandlers();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * Quit when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Cleanup on quit
 */
app.on('before-quit', () => {
  closeDatabase();
  cleanupTempFiles();
});

/**
 * Register all IPC handlers
 */
function registerIpcHandlers(): void {
  // File dialog handlers
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
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

  ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Backup info handlers
  ipcMain.handle('get-backup-info', async (_event, filePath: string) => {
    return getBackupFileInfo(filePath);
  });

  ipcMain.handle('scan-directory', async (_event, dirPath: string) => {
    return scanDirectoryForBackups(dirPath);
  });

  // Import handlers
  ipcMain.handle('import-backup', async (event, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();

    // Handle ZIP files
    let actualPath = filePath;
    let isTemp = false;

    if (ext === '.zip') {
      const extracted = extractToTemp(filePath);
      if (!extracted.success) {
        return { success: false, error: extracted.error };
      }
      actualPath = extracted.filePath;
      isTemp = true;
    }

    // Determine file type and parse
    const smsInfo = await getBackupInfo(actualPath);
    const callsInfo = await getCallsBackupInfo(actualPath);

    const onProgress = (progress: ImportProgress) => {
      event.sender.send('import-progress', progress);
    };

    let result;
    if (smsInfo) {
      result = await parseSmsBackup(actualPath, onProgress);
    } else if (callsInfo) {
      result = await parseCallsBackup(actualPath, onProgress);
    } else {
      result = { success: false, error: 'Unknown backup format' };
    }

    // Cleanup temp file
    if (isTemp) {
      try {
        const fs = await import('fs');
        fs.unlinkSync(actualPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    return result;
  });

  // Database query handlers
  ipcMain.handle('get-conversations', async (_event, limit?: number, offset?: number) => {
    return getConversations(limit, offset);
  });

  ipcMain.handle('get-messages', async (_event, conversationId: number, limit?: number, offset?: number) => {
    return getMessagesByConversation(conversationId, limit, offset);
  });

  ipcMain.handle('get-calls', async (_event, limit?: number, offset?: number) => {
    return getAllCalls(limit, offset);
  });

  ipcMain.handle('search-messages', async (_event, filters: SearchFilters, limit?: number) => {
    return searchMessages(filters, limit);
  });

  ipcMain.handle('get-database-stats', async () => {
    return getDatabaseStats();
  });
}
