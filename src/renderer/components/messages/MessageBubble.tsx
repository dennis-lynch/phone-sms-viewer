/**
 * Message Bubble Component
 *
 * Displays a single message with:
 * - Different styles for sent (right, blue) vs received (left, gray)
 * - Timestamp below the message
 * - Proper text wrapping for long messages
 * - URL detection and linking
 */

import React, { useMemo } from 'react';
import type { Message } from '../../../shared/types';

interface MessageBubbleProps {
  message: Message;
  showTimestamp?: boolean;
}

/**
 * Formats a timestamp for display
 */
function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * URL regex pattern
 */
const URL_PATTERN = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

/**
 * Converts URLs in text to clickable links
 */
function linkifyText(text: string): React.ReactNode[] {
  const parts = text.split(URL_PATTERN);

  return parts.map((part, index) => {
    if (URL_PATTERN.test(part)) {
      // Reset regex lastIndex
      URL_PATTERN.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 hover:text-blue-200 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageBubble({ message, showTimestamp = true }: MessageBubbleProps) {
  const isSent = message.direction === 'sent';
  const time = formatMessageTime(message.timestamp);

  // Process message body for display
  const processedBody = useMemo(() => {
    if (!message.body) return null;
    return linkifyText(message.body);
  }, [message.body]);

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] ${isSent ? 'items-end' : 'items-start'}`}
      >
        {/* Message bubble */}
        <div
          className={`px-3 py-2 rounded-2xl ${
            isSent
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-700 text-gray-100 rounded-bl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {processedBody || <span className="italic text-gray-400">(empty)</span>}
          </p>
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <p
            className={`text-xs text-gray-500 mt-1 ${
              isSent ? 'text-right' : 'text-left'
            }`}
          >
            {time}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Date separator component for grouping messages by date
 */
interface DateSeparatorProps {
  date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const formattedDate = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if same day
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();

    if (isSameDay(date, today)) {
      return 'Today';
    } else if (isSameDay(date, yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  }, [date]);

  return (
    <div className="flex items-center justify-center py-4">
      <div className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-400">
        {formattedDate}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for messages
 */
export function MessageBubbleSkeleton({ isSent }: { isSent: boolean }) {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-pulse`}>
      <div
        className={`px-3 py-2 rounded-2xl ${
          isSent
            ? 'bg-blue-600/30 rounded-br-sm'
            : 'bg-gray-700/50 rounded-bl-sm'
        }`}
      >
        <div className="h-4 bg-current opacity-20 rounded w-32" />
      </div>
    </div>
  );
}
