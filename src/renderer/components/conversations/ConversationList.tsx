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
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }

    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.contactName.toLowerCase().includes(query) ||
        conv.phoneNumber.includes(query) ||
        conv.normalizedPhone.includes(query)
    );
  }, [conversations, searchQuery]);

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
      {/* Search bar */}
      <div className="flex-none p-2 border-b border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
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
          {searchQuery
            ? `${filteredConversations.length} of ${conversations.length} conversations`
            : `${conversations.length} conversations`}
        </div>
      )}
    </div>
  );
}
