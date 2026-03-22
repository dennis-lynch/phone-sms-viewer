/**
 * Conversation List Component
 *
 * Displays a virtualized scrollable list of conversations.
 * Handles selection and provides search filtering.
 * Uses TanStack Virtual for smooth scrolling with large datasets.
 */

import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../../store/appStore';
import { ConversationItem, ConversationItemSkeleton } from './ConversationItem';

const ITEM_HEIGHT = 72; // Estimated height of each conversation item
const OVERSCAN = 10; // Number of items to render outside visible area

export function ConversationList() {
  const {
    conversations,
    conversationsLoading,
    conversationsError,
    selectedConversationId,
    selectConversation,
    conversationSortOrder,
    setConversationSortOrder,
  } = useAppStore();

  const [inputValue, setInputValue] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  // Apply filter
  const applyFilter = () => {
    setFilterQuery(inputValue);
  };

  // Clear filter
  const clearFilter = () => {
    setInputValue('');
    setFilterQuery('');
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      applyFilter();
    }
  };

  // Filter conversations based on filter query
  const filteredConversations = useMemo(() => {
    if (!filterQuery.trim()) {
      return conversations;
    }

    const query = filterQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.contactName.toLowerCase().includes(query) ||
        conv.phoneNumber.includes(query) ||
        conv.normalizedPhone.includes(query)
    );
  }, [conversations, filterQuery]);

  // Set up virtualizer
  const virtualizer = useVirtualizer({
    count: filteredConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  // Handle conversation selection
  const handleSelect = (conversationId: number) => {
    selectConversation(conversationId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sort toggle */}
      <div className="flex-none px-2 pt-2 flex gap-1">
        <button
          onClick={() => setConversationSortOrder('recent')}
          className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
            conversationSortOrder === 'recent'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          Recent
        </button>
        <button
          onClick={() => setConversationSortOrder('size')}
          className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
            conversationSortOrder === 'size'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          Size ↓
        </button>
        <button
          onClick={() => setConversationSortOrder('messages')}
          className={`flex-1 py-1 text-xs rounded-md font-medium transition-colors ${
            conversationSortOrder === 'messages'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          Messages
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex-none p-2 border-b border-gray-700">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Filter conversations..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 pl-9 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {(inputValue || filterQuery) && (
              <button
                onClick={clearFilter}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                title="Clear filter"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={applyFilter}
            disabled={!inputValue.trim()}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              !inputValue.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
            title="Filter (Enter)"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto" ref={parentRef}>
        {/* Loading state */}
        {conversationsLoading && conversations.length === 0 && (
          <div className="divide-y divide-gray-700">
            {Array.from({ length: 8 }).map((_, i) => (
              <ConversationItemSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {conversationsError && (
          <div className="p-4 text-center text-red-400">
            <p>Failed to load conversations</p>
            <p className="text-sm text-gray-500 mt-1">{conversationsError}</p>
          </div>
        )}

        {/* Empty state */}
        {!conversationsLoading && !conversationsError && conversations.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <p>No conversations</p>
            <p className="text-sm mt-1">Import a backup to get started</p>
          </div>
        )}

        {/* No search results */}
        {!conversationsLoading &&
          conversations.length > 0 &&
          filteredConversations.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p>No matching conversations</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}

        {/* Virtualized conversation items */}
        {filteredConversations.length > 0 && (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const conversation = filteredConversations[virtualRow.index];
              return (
                <div
                  key={conversation.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ConversationItem
                    conversation={conversation}
                    isSelected={selectedConversationId === conversation.id}
                    onClick={() => handleSelect(conversation.id!)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Count footer */}
      {!conversationsLoading && conversations.length > 0 && (
        <div className="flex-none px-3 py-2 border-t border-gray-700 text-xs text-gray-500">
          {filterQuery
            ? `${filteredConversations.length} of ${conversations.length} conversations`
            : `${conversations.length} conversations`}
        </div>
      )}
    </div>
  );
}
