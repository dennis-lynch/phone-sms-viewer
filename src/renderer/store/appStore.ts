/**
 * Application State Store
 *
 * Zustand store for managing application state including:
 * - Conversations list
 * - Selected conversation and messages
 * - Import state and progress
 * - Loading states
 */

import { create } from 'zustand';
import type {
  Conversation,
  ConversationSortOrder,
  Message,
  ImportProgress,
  ImportResult,
  DatabaseStats,
} from '../../shared/types';
import * as databaseService from '../services/databaseService';
import * as fileService from '../services/fileService';

// ============================================================================
// Types
// ============================================================================

export interface ImportState {
  isImporting: boolean;
  progress: ImportProgress | null;
  currentFile?: string;
  fileProgress?: {
    currentFile: number;
    totalFiles: number;
    fileName: string;
  };
  result: ImportResult | null;
  error: string | null;
}

export interface AppState {
  // Conversations
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  conversationSortOrder: ConversationSortOrder;

  // Selected conversation
  selectedConversationId: number | null;
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  hasMoreMessages: boolean;

  // Import state
  import: ImportState;

  // Database stats
  stats: DatabaseStats | null;
  statsLoading: boolean;

  // Actions
  loadConversations: () => Promise<void>;
  setConversationSortOrder: (order: ConversationSortOrder) => Promise<void>;
  selectConversation: (id: number | null) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;

  // Import actions
  startImport: (filePath: string) => Promise<void>;
  startMultiImport: (filePaths: string[]) => Promise<void>;
  cancelImport: () => Promise<void>;
  clearImportResult: () => void;
  updateImportProgress: (progress: ImportProgress & { currentFile?: number; totalFiles?: number }) => void;
  updateFileProgress: (progress: { currentFile: number; totalFiles: number; fileName: string }) => void;

  // Database actions
  loadStats: () => Promise<void>;
  resetDatabase: () => Promise<void>;

  // UI state
  showImportModal: boolean;
  setShowImportModal: (show: boolean) => void;
}

// ============================================================================
// Store
// ============================================================================

const MESSAGES_PER_PAGE = 500;

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,
  conversationSortOrder: 'recent',

  selectedConversationId: null,
  messages: [],
  messagesLoading: false,
  messagesError: null,
  hasMoreMessages: false,

  import: {
    isImporting: false,
    progress: null,
    result: null,
    error: null,
  },

  stats: null,
  statsLoading: false,

  showImportModal: false,

  // ============================================================================
  // Conversation Actions
  // ============================================================================

  loadConversations: async () => {
    const { conversationSortOrder } = get();
    set({ conversationsLoading: true, conversationsError: null });

    try {
      const conversations = await databaseService.getConversations(1000, 0, conversationSortOrder);
      set({ conversations, conversationsLoading: false });
    } catch (error) {
      set({
        conversationsError: error instanceof Error ? error.message : 'Failed to load conversations',
        conversationsLoading: false,
      });
    }
  },

  setConversationSortOrder: async (order: ConversationSortOrder) => {
    set({ conversationSortOrder: order });
    await get().loadConversations();
  },

  selectConversation: async (id: number | null) => {
    set({
      selectedConversationId: id,
      messages: [],
      messagesLoading: id !== null,
      messagesError: null,
      hasMoreMessages: false,
    });

    if (id === null) return;

    try {
      const messages = await databaseService.getMessages(id, MESSAGES_PER_PAGE, 0);
      const totalCount = await databaseService.getMessageCount(id);

      set({
        messages,
        messagesLoading: false,
        hasMoreMessages: messages.length < totalCount,
      });
    } catch (error) {
      set({
        messagesError: error instanceof Error ? error.message : 'Failed to load messages',
        messagesLoading: false,
      });
    }
  },

  loadMoreMessages: async () => {
    const { selectedConversationId, messages, messagesLoading, hasMoreMessages } = get();

    if (!selectedConversationId || messagesLoading || !hasMoreMessages) return;

    set({ messagesLoading: true });

    try {
      const moreMessages = await databaseService.getMessages(
        selectedConversationId,
        MESSAGES_PER_PAGE,
        messages.length
      );

      const totalCount = await databaseService.getMessageCount(selectedConversationId);
      const allMessages = [...messages, ...moreMessages];

      set({
        messages: allMessages,
        messagesLoading: false,
        hasMoreMessages: allMessages.length < totalCount,
      });
    } catch (error) {
      set({
        messagesError: error instanceof Error ? error.message : 'Failed to load more messages',
        messagesLoading: false,
      });
    }
  },

  refreshMessages: async () => {
    const { selectedConversationId } = get();
    if (selectedConversationId !== null) {
      await get().selectConversation(selectedConversationId);
    }
  },

  // ============================================================================
  // Import Actions
  // ============================================================================

  startImport: async (filePath: string) => {
    set({
      import: {
        isImporting: true,
        progress: null,
        currentFile: filePath,
        result: null,
        error: null,
      },
      showImportModal: true,
    });

    try {
      const result = await fileService.importBackup(filePath);

      set((state) => ({
        import: {
          ...state.import,
          isImporting: false,
          result,
        },
      }));

      // Reload conversations after import
      if (result.success) {
        await get().loadConversations();
        await get().loadStats();
      }
    } catch (error) {
      set((state) => ({
        import: {
          ...state.import,
          isImporting: false,
          error: error instanceof Error ? error.message : 'Import failed',
        },
      }));
    }
  },

  startMultiImport: async (filePaths: string[]) => {
    set({
      import: {
        isImporting: true,
        progress: null,
        result: null,
        error: null,
      },
      showImportModal: true,
    });

    try {
      const { summary } = await fileService.importBackups(filePaths);

      // Create a combined result
      const result: ImportResult = {
        success: !summary.aborted,
        filePath: `${summary.filesProcessed} files`,
        totalParsed: summary.totalMessages + summary.totalCalls + summary.totalDuplicates,
        messagesImported: summary.totalMessages,
        callsImported: summary.totalCalls,
        duplicatesSkipped: summary.totalDuplicates,
        errors: summary.aborted ? ['Import was cancelled'] : [],
        conversationsCreated: 0,
      };

      set((state) => ({
        import: {
          ...state.import,
          isImporting: false,
          result,
        },
      }));

      // Reload conversations after import
      await get().loadConversations();
      await get().loadStats();
    } catch (error) {
      set((state) => ({
        import: {
          ...state.import,
          isImporting: false,
          error: error instanceof Error ? error.message : 'Import failed',
        },
      }));
    }
  },

  cancelImport: async () => {
    await fileService.cancelImport();
    set((state) => ({
      import: {
        ...state.import,
        isImporting: false,
        error: 'Import cancelled',
      },
    }));
  },

  clearImportResult: () => {
    set({
      import: {
        isImporting: false,
        progress: null,
        result: null,
        error: null,
      },
      showImportModal: false,
    });
  },

  updateImportProgress: (progress) => {
    set((state) => ({
      import: {
        ...state.import,
        progress,
      },
    }));
  },

  updateFileProgress: (fileProgress) => {
    set((state) => ({
      import: {
        ...state.import,
        fileProgress,
      },
    }));
  },

  // ============================================================================
  // Database Actions
  // ============================================================================

  loadStats: async () => {
    set({ statsLoading: true });

    try {
      const stats = await databaseService.getDatabaseStats();
      set({ stats, statsLoading: false });
    } catch {
      set({ statsLoading: false });
    }
  },

  resetDatabase: async () => {
    try {
      await databaseService.resetDatabase();
      set({
        conversations: [],
        selectedConversationId: null,
        messages: [],
        stats: null,
      });
      await get().loadStats();
    } catch (error) {
      console.error('Failed to reset database:', error);
    }
  },

  // ============================================================================
  // UI Actions
  // ============================================================================

  setShowImportModal: (show: boolean) => {
    set({ showImportModal: show });
  },
}));
