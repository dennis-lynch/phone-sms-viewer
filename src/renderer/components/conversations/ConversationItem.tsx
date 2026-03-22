/**
 * Conversation Item Component
 *
 * Displays a single conversation in the list with:
 * - Avatar (first letter of contact name)
 * - Contact name
 * - Last message preview
 * - Timestamp
 * - Message count badge
 */

import React from 'react';
import type { Conversation } from '../../../shared/types';
import { formatRelativeTime, truncatePreview, getInitials } from '../../services/databaseService';

function formatSize(bytes: number): string {
  if (bytes < 1024) return '< 1 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  lastMessagePreview?: string;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isSelected,
  lastMessagePreview,
  onClick,
}: ConversationItemProps) {
  const initials = getInitials(conversation.contactName || conversation.phoneNumber);
  const displayName = conversation.contactName || conversation.phoneNumber;
  const timestamp = conversation.lastMessageDate
    ? formatRelativeTime(conversation.lastMessageDate)
    : '';
  const preview = truncatePreview(lastMessagePreview || '', 50);

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-start gap-3 text-left transition-colors ${
        isSelected
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-transparent hover:bg-gray-700'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-none w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
          isSelected ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-200'
        }`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: name and timestamp */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-medium truncate ${
              isSelected ? 'text-white' : 'text-gray-100'
            }`}
          >
            {displayName}
          </span>
          {timestamp && (
            <span
              className={`flex-none text-xs ${
                isSelected ? 'text-blue-200' : 'text-gray-500'
              }`}
            >
              {timestamp}
            </span>
          )}
        </div>

        {/* Bottom row: preview and badges */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className={`text-sm truncate ${
              isSelected ? 'text-blue-100' : 'text-gray-400'
            }`}
          >
            {preview || 'No messages'}
          </span>
          <div className="flex-none flex items-center gap-1">
            {conversation.totalBodySize > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
                title="Total message size"
              >
                {formatSize(conversation.totalBodySize)}
              </span>
            )}
            {conversation.messageCount > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
                title="Message count"
              >
                {conversation.messageCount > 999
                  ? '999+'
                  : conversation.messageCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/**
 * Skeleton loader for conversation items
 */
export function ConversationItemSkeleton() {
  return (
    <div className="w-full p-3 flex items-start gap-3 animate-pulse">
      <div className="flex-none w-10 h-10 rounded-full bg-gray-700" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 bg-gray-700 rounded w-32" />
          <div className="h-3 bg-gray-700 rounded w-12" />
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="h-3 bg-gray-700 rounded w-48" />
        </div>
      </div>
    </div>
  );
}
