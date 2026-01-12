/**
 * Main App Component
 *
 * Root component that sets up the application layout and handles
 * initial data loading.
 */

import React, { useEffect, useCallback } from 'react';
import { useAppStore } from './store/appStore';
import { useSearchStore } from './store/searchStore';
import { ImportProgressModal } from './components/import/ImportProgressModal';
import { AppLayout, Header, StatusBar } from './components/layout/AppLayout';
import { ConversationList } from './components/conversations/ConversationList';
import { MessageThread } from './components/messages/MessageThread';
import { SearchPanel } from './components/search';
import * as fileService from './services/fileService';

export function App() {
  const {
    conversations,
    conversationsLoading,
    stats,
    loadConversations,
    loadStats,
    startImport,
    startMultiImport,
  } = useAppStore();

  const { isSearchOpen, openSearch, closeSearch } = useSearchStore();

  // Load initial data
  useEffect(() => {
    loadConversations();
    loadStats();
  }, [loadConversations, loadStats]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+F to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        if (isSearchOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      }
      // Escape to close search
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, openSearch, closeSearch]);

  // Handle opening a single file
  const handleOpenFile = async () => {
    const filePath = await fileService.openFileDialog();
    if (filePath) {
      await startImport(filePath);
    }
  };

  // Handle opening multiple files
  const handleOpenFiles = async () => {
    const filePaths = await fileService.openFilesDialog();
    if (filePaths.length > 0) {
      await startMultiImport(filePaths);
    }
  };

  // Handle opening a directory
  const handleOpenDirectory = async () => {
    const dirPath = await fileService.openDirectoryDialog();
    if (dirPath) {
      const backups = await fileService.scanDirectory(dirPath);
      if (backups.length > 0) {
        const filePaths = backups.map((b) => b.filePath);
        await startMultiImport(filePaths);
      }
    }
  };

  // Show empty state if no conversations loaded
  const showEmptyState = !conversationsLoading && conversations.length === 0;

  // Header with toolbar buttons
  const headerContent = (
    <Header
      title="Phone SMS Viewer"
      actions={
        <>
          {/* Search button */}
          <button
            onClick={() => (isSearchOpen ? closeSearch() : openSearch())}
            className={`p-2 rounded-md transition-colors ${
              isSearchOpen
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            title="Search (Ctrl+F)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-700" />

          <button
            onClick={handleOpenFile}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            Open File
          </button>
          <button
            onClick={handleOpenFiles}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
          >
            Open Files
          </button>
          <button
            onClick={handleOpenDirectory}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
          >
            Open Folder
          </button>
        </>
      }
    />
  );

  // Status bar content
  const statusBarContent = (
    <StatusBar>
      {stats ? (
        <>
          <span>{stats.totalConversations} conversations</span>
          <span className="mx-2">|</span>
          <span>{stats.totalMessages.toLocaleString()} messages</span>
          <span className="mx-2">|</span>
          <span>{stats.totalCalls.toLocaleString()} calls</span>
        </>
      ) : (
        <span>Ready</span>
      )}
    </StatusBar>
  );

  // Sidebar content
  const sidebarContent = showEmptyState ? (
    <div className="h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
      Import a backup to see conversations
    </div>
  ) : (
    <ConversationList />
  );

  // Main content - show search panel when search is open
  const mainContent = isSearchOpen ? (
    <SearchPanel onClose={closeSearch} />
  ) : showEmptyState ? (
    <EmptyState onOpenFile={handleOpenFile} />
  ) : (
    <MessageThread />
  );

  return (
    <>
      <AppLayout
        header={headerContent}
        sidebar={sidebarContent}
        content={mainContent}
        statusBar={statusBarContent}
      />
      <ImportProgressModal />
    </>
  );
}

/**
 * Empty state component shown when no backups are loaded
 */
function EmptyState({ onOpenFile }: { onOpenFile: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
      <svg
        className="w-24 h-24 mb-6 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      <h2 className="text-xl font-medium text-white mb-2">No Messages Loaded</h2>
      <p className="text-center mb-6 max-w-md">
        Open an SMS backup file from{' '}
        <span className="text-blue-400">SMS Backup & Restore Pro</span> to get started.
      </p>

      <button
        onClick={onOpenFile}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      >
        Open Backup File
      </button>

      <p className="mt-4 text-sm text-gray-600">
        Supports .xml and .zip backup files
      </p>
    </div>
  );
}

/**
 * Simple loading spinner
 */
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
