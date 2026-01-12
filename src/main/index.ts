/**
 * Electron Main Process Entry Point
 *
 * Initializes the application, creates windows, and registers IPC handlers.
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { initializeDatabase, closeDatabase } from './database/database';
import { registerFileHandlers, cleanupFileHandlers, registerDatabaseHandlers } from './ipc';

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
    backgroundColor: '#1a1a2e', // Dark background to prevent flash
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

  // Register IPC handlers that need window reference
  registerFileHandlers(mainWindow);
}

/**
 * Initialize the application
 */
app.whenReady().then(() => {
  // Initialize database
  initializeDatabase();

  // Register database IPC handlers (don't need window reference)
  registerDatabaseHandlers();

  // Create main window
  createWindow();

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
  cleanupFileHandlers();
});
