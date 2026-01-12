/**
 * Database IPC Handlers
 *
 * Handles database queries for conversations, messages, calls, and search.
 */

import { ipcMain } from 'electron';
import { getDatabaseStats, resetDatabase, analyzeDatabase } from '../database/database';
import {
  getConversations,
  getConversationById,
  getMessagesByConversation,
  getMessageCountByConversation,
  getCallsByConversation,
  getAllCalls,
  searchMessages,
  getImportHistory,
  getLastMessagePreview,
} from '../database/queries';
import type { SearchFilters } from '../../shared/types';

/**
 * Registers all database-related IPC handlers
 */
export function registerDatabaseHandlers(): void {
  // Get all conversations
  ipcMain.handle('get-conversations', async (_event, limit?: number, offset?: number) => {
    try {
      return {
        success: true,
        data: getConversations(limit, offset),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get conversations: ${error}`,
      };
    }
  });

  // Get a single conversation by ID
  ipcMain.handle('get-conversation', async (_event, conversationId: number) => {
    try {
      const conversation = getConversationById(conversationId);
      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get conversation: ${error}`,
      };
    }
  });

  // Get messages for a conversation
  ipcMain.handle(
    'get-messages',
    async (_event, conversationId: number, limit?: number, offset?: number) => {
      try {
        return {
          success: true,
          data: getMessagesByConversation(conversationId, limit, offset),
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to get messages: ${error}`,
        };
      }
    }
  );

  // Get message count for a conversation
  ipcMain.handle('get-message-count', async (_event, conversationId: number) => {
    try {
      return {
        success: true,
        data: getMessageCountByConversation(conversationId),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get message count: ${error}`,
      };
    }
  });

  // Get last message preview for a conversation
  ipcMain.handle('get-last-message-preview', async (_event, conversationId: number) => {
    try {
      return {
        success: true,
        data: getLastMessagePreview(conversationId),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get last message: ${error}`,
      };
    }
  });

  // Get calls for a conversation
  ipcMain.handle(
    'get-calls-by-conversation',
    async (_event, conversationId: number, limit?: number, offset?: number) => {
      try {
        return {
          success: true,
          data: getCallsByConversation(conversationId, limit, offset),
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to get calls: ${error}`,
        };
      }
    }
  );

  // Get all calls
  ipcMain.handle('get-calls', async (_event, limit?: number, offset?: number) => {
    try {
      return {
        success: true,
        data: getAllCalls(limit, offset),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get calls: ${error}`,
      };
    }
  });

  // Search messages
  ipcMain.handle('search-messages', async (_event, filters: SearchFilters, limit?: number) => {
    try {
      return {
        success: true,
        data: searchMessages(filters, limit),
      };
    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${error}`,
      };
    }
  });

  // Get database statistics
  ipcMain.handle('get-database-stats', async () => {
    try {
      return {
        success: true,
        data: getDatabaseStats(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get stats: ${error}`,
      };
    }
  });

  // Get import history
  ipcMain.handle('get-import-history', async () => {
    try {
      return {
        success: true,
        data: getImportHistory(),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get import history: ${error}`,
      };
    }
  });

  // Reset database (delete all data)
  ipcMain.handle('reset-database', async () => {
    try {
      resetDatabase();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to reset database: ${error}`,
      };
    }
  });

  // Optimize database
  ipcMain.handle('optimize-database', async () => {
    try {
      analyzeDatabase();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to optimize database: ${error}`,
      };
    }
  });
}
