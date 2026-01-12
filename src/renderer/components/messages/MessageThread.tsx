/**
 * Message Thread Component
 *
 * Displays virtualized messages for the selected conversation with:
 * - Header with contact name and phone number
 * - Tabs for switching between Messages and Calls
 * - Virtualized scrollable message list with date separators
 * - Auto-scroll to bottom on load
 * - Load more button for older messages
 * - Dynamic height measurement for variable-length messages
 * - Date jumper for navigating to specific dates
 */

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../../store/appStore';
import { MessageBubble, DateSeparator, MessageBubbleSkeleton } from './MessageBubble';
import { DateJumper } from './DateJumper';
import { CallList } from '../calls';
import type { Message, Call } from '../../../shared/types';

type ConversationTab = 'messages' | 'calls';

const OVERSCAN = 20; // Number of items to render outside visible area
const ESTIMATED_MESSAGE_HEIGHT = 80; // Estimated height for messages
const DATE_SEPARATOR_HEIGHT = 48; // Fixed height for date separators
const HIGHLIGHT_DURATION = 2000; // Duration of highlight animation in ms

/**
 * Represents an item in the virtualized list (either a message or date separator)
 */
type VirtualItem =
  | { type: 'date-separator'; date: Date; key: string }
  | { type: 'message'; message: Message; key: string };

/**
 * Flattens messages into a list of virtual items with date separators
 */
function createVirtualItems(messages: Message[]): VirtualItem[] {
  const items: VirtualItem[] = [];
  let currentDateKey = '';

  for (const message of messages) {
    const messageDate = new Date(message.timestamp);
    const dateKey = messageDate.toDateString();

    // Add date separator if this is a new date
    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey;
      items.push({
        type: 'date-separator',
        date: new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate()),
        key: `date-${dateKey}`,
      });
    }

    items.push({
      type: 'message',
      message,
      key: `msg-${message.id}`,
    });
  }

  return items;
}

/**
 * Format phone number for display
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Format date range for display
 */
function formatDateRange(minDate: number, maxDate: number): string {
  const min = new Date(minDate);
  const max = new Date(maxDate);
  const minStr = min.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  const maxStr = max.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  if (minStr === maxStr) {
    return minStr;
  }
  return `${minStr} - ${maxStr}`;
}

export function MessageThread() {
  const {
    selectedConversationId,
    conversations,
    messages,
    messagesLoading,
    messagesError,
    hasMoreMessages,
    loadMoreMessages,
  } = useAppStore();

  const parentRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const prevMessageCount = useRef(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ConversationTab>('messages');

  // Get current conversation
  const conversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId);
  }, [conversations, selectedConversationId]);

  // Calculate date range from messages
  const dateRange = useMemo(() => {
    if (messages.length === 0) return null;

    let min = messages[0].timestamp;
    let max = messages[0].timestamp;

    for (const msg of messages) {
      if (msg.timestamp < min) min = msg.timestamp;
      if (msg.timestamp > max) max = msg.timestamp;
    }

    return { min, max };
  }, [messages]);

  // Create flat list of virtual items
  const virtualItems = useMemo(() => {
    return createVirtualItems(messages);
  }, [messages]);

  // Estimate item size based on type
  const estimateSize = useCallback((index: number) => {
    const item = virtualItems[index];
    if (!item) return ESTIMATED_MESSAGE_HEIGHT;
    return item.type === 'date-separator' ? DATE_SEPARATOR_HEIGHT : ESTIMATED_MESSAGE_HEIGHT;
  }, [virtualItems]);

  // Set up virtualizer
  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: OVERSCAN,
  });

  // Find the first message on or after a given timestamp
  const findMessageIndexForDate = useCallback((timestamp: number): number => {
    // Find the first message on or after this date
    for (let i = 0; i < virtualItems.length; i++) {
      const item = virtualItems[i];
      if (item.type === 'message' && item.message.timestamp >= timestamp) {
        return i;
      }
    }
    // If no message found after this date, return the last item
    return virtualItems.length - 1;
  }, [virtualItems]);

  // Handle date jump
  const handleDateJump = useCallback((timestamp: number) => {
    const index = findMessageIndexForDate(timestamp);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: 'start', behavior: 'smooth' });

      // Highlight the message
      const item = virtualItems[index];
      if (item?.type === 'message' && item.message.id) {
        setHighlightedMessageId(item.message.id);
        // Clear highlight after duration
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, HIGHLIGHT_DURATION);
      }
    }
  }, [findMessageIndexForDate, virtualizer, virtualItems]);

  // Scroll to bottom on initial load or when new messages arrive at the end
  useEffect(() => {
    if (messages.length > 0 && parentRef.current) {
      const isNewConversation = isInitialLoad.current;
      const hasNewMessages = messages.length > prevMessageCount.current;

      if (isNewConversation) {
        // Scroll to bottom for new conversation
        virtualizer.scrollToIndex(virtualItems.length - 1, { align: 'end' });
        isInitialLoad.current = false;
      } else if (hasNewMessages && !hasMoreMessages) {
        // If messages were added at the end (not loaded from top), scroll to bottom
        virtualizer.scrollToIndex(virtualItems.length - 1, { align: 'end' });
      }

      prevMessageCount.current = messages.length;
    }
  }, [messages, virtualItems.length, hasMoreMessages, virtualizer]);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoad.current = true;
    prevMessageCount.current = 0;
    setHighlightedMessageId(null);
    setActiveTab('messages');
  }, [selectedConversationId]);

  // No conversation selected
  if (!selectedConversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <svg
          className="w-16 h-16 mb-4 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-lg">Select a conversation</p>
        <p className="text-sm text-gray-600 mt-1">
          Choose a conversation from the list to view messages
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      {/* Header */}
      <div className="flex-none bg-gray-800 border-b border-gray-700">
        <div className="h-14 flex items-center px-4">
          {conversation ? (
            <div>
              <h2 className="font-medium text-white">
                {conversation.contactName || 'Unknown'}
              </h2>
              <p className="text-xs text-gray-400">
                {formatPhone(conversation.phoneNumber)}
              </p>
            </div>
          ) : (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-32 mb-1" />
              <div className="h-3 bg-gray-700 rounded w-24" />
            </div>
          )}

          <div className="flex-1" />

          {/* Date range and message count */}
          {conversation && (
            <div className="text-right">
              <span className="text-sm text-gray-500">
                {conversation.messageCount.toLocaleString()} messages
                {conversation.callCount > 0 && ` | ${conversation.callCount.toLocaleString()} calls`}
              </span>
              {dateRange && activeTab === 'messages' && (
                <p className="text-xs text-gray-600">
                  {formatDateRange(dateRange.min, dateRange.max)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'messages'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Messages
            {conversation && (
              <span className="ml-1.5 text-xs opacity-75">
                ({conversation.messageCount.toLocaleString()})
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'calls'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Calls
            {conversation && conversation.callCount > 0 && (
              <span className="ml-1.5 text-xs opacity-75">
                ({conversation.callCount.toLocaleString()})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'messages' ? (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto" ref={parentRef}>
            {/* Loading state */}
            {messagesLoading && messages.length === 0 && (
              <div className="p-4 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MessageBubbleSkeleton key={i} isSent={i % 2 === 1} />
                ))}
              </div>
            )}

            {/* Error state */}
            {messagesError && (
              <div className="flex flex-col items-center justify-center h-full text-red-400">
                <p>Failed to load messages</p>
                <p className="text-sm text-gray-500 mt-1">{messagesError}</p>
              </div>
            )}

            {/* Empty state */}
            {!messagesLoading && !messagesError && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>No messages in this conversation</p>
              </div>
            )}

            {/* Virtualized messages */}
            {virtualItems.length > 0 && (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {/* Load more button - positioned at top */}
                {hasMoreMessages && (
                  <div
                    className="absolute top-0 left-0 right-0 flex justify-center py-4 z-10"
                    style={{ background: 'linear-gradient(to bottom, rgb(17 24 39), transparent)' }}
                  >
                    <button
                      onClick={loadMoreMessages}
                      disabled={messagesLoading}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm text-gray-300 transition-colors"
                    >
                      {messagesLoading ? 'Loading...' : 'Load earlier messages'}
                    </button>
                  </div>
                )}

                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const item = virtualItems[virtualRow.index];
                  const isHighlighted = item.type === 'message' && item.message.id === highlightedMessageId;

                  return (
                    <div
                      key={item.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={`px-4 transition-colors duration-500 ${
                        isHighlighted ? 'bg-blue-500/20' : ''
                      }`}
                    >
                      {item.type === 'date-separator' ? (
                        <DateSeparator date={item.date} />
                      ) : (
                        <div className="py-1">
                          <MessageBubble message={item.message} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date Jumper FAB */}
          {dateRange && messages.length > 0 && (
            <DateJumper
              minDate={dateRange.min}
              maxDate={dateRange.max}
              onDateSelect={handleDateJump}
            />
          )}
        </>
      ) : (
        /* Calls tab */
        <CallList conversationId={selectedConversationId!} />
      )}
    </div>
  );
}
