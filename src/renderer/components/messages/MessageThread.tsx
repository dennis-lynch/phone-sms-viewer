/**
 * Message Thread Component
 *
 * Displays messages for the selected conversation with:
 * - Header with contact name and phone number
 * - Scrollable message list with date separators
 * - Auto-scroll to bottom on load
 * - Load more button for older messages
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { MessageBubble, DateSeparator, MessageBubbleSkeleton } from './MessageBubble';
import type { Message } from '../../../shared/types';

/**
 * Groups messages by date for display with separators
 */
interface MessageGroup {
  date: Date;
  messages: Message[];
}

function groupMessagesByDate(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  for (const message of messages) {
    const messageDate = new Date(message.timestamp);
    const dateKey = messageDate.toDateString();

    if (!currentGroup || currentGroup.date.toDateString() !== dateKey) {
      currentGroup = {
        date: new Date(messageDate.setHours(0, 0, 0, 0)),
        messages: [],
      };
      groups.push(currentGroup);
    }

    currentGroup.messages.push(message);
  }

  return groups;
}

/**
 * Format phone number for display
 */
function formatPhone(phone: string): string {
  // Simple formatting - add proper library if needed
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // Get current conversation
  const conversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConversationId);
  }, [conversations, selectedConversationId]);

  // Group messages by date
  const messageGroups = useMemo(() => {
    return groupMessagesByDate(messages);
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [messages]);

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoad.current = true;
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
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex-none h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4">
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

        {/* Message count */}
        {conversation && (
          <span className="text-sm text-gray-500">
            {conversation.messageCount.toLocaleString()} messages
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {/* Load more button */}
        {hasMoreMessages && (
          <div className="flex justify-center mb-4">
            <button
              onClick={loadMoreMessages}
              disabled={messagesLoading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm text-gray-300 transition-colors"
            >
              {messagesLoading ? 'Loading...' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {/* Loading state */}
        {messagesLoading && messages.length === 0 && (
          <div className="space-y-4">
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

        {/* Message groups */}
        {messageGroups.map((group) => (
          <div key={group.date.toISOString()}>
            <DateSeparator date={group.date} />
            <div className="space-y-2">
              {group.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
