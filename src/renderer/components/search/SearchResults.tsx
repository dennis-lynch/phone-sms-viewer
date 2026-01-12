/**
 * Search Results Component
 *
 * Displays search results with:
 * - Contact name and message body (with highlights)
 * - Timestamp
 * - Click to jump to message in conversation
 * - Virtualized list for performance
 */

import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSearchStore } from '../../store/searchStore';
import { useAppStore } from '../../store/appStore';
import type { SearchResult } from '../../../shared/types';

const ITEM_HEIGHT = 80; // Estimated height of each result item
const OVERSCAN = 10;

interface SearchResultsProps {
  onResultClick?: () => void;
}

export function SearchResults({ onResultClick }: SearchResultsProps) {
  const { results, isSearching, searchError, hasSearched, query } = useSearchStore();
  const { selectConversation } = useAppStore();

  const parentRef = useRef<HTMLDivElement>(null);

  // Set up virtualizer
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  // Handle result click - navigate to conversation
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      selectConversation(result.conversationId);
      onResultClick?.();
    },
    [selectConversation, onResultClick]
  );

  // Loading state
  if (isSearching) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
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
          <span>Searching...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (searchError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-4">
        <svg
          className="w-12 h-12 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="font-medium">Search failed</p>
        <p className="text-sm text-gray-500 mt-1">{searchError}</p>
      </div>
    );
  }

  // Empty state - no search yet
  if (!hasSearched) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
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
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg">Search your messages</p>
        <p className="text-sm text-gray-600 mt-1">
          Enter a search term to find messages
        </p>
      </div>
    );
  }

  // No results
  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
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
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg">No results found</p>
        <p className="text-sm text-gray-600 mt-1">
          No messages match "{query}"
        </p>
      </div>
    );
  }

  // Results list
  return (
    <div className="flex-1 flex flex-col">
      {/* Results count */}
      <div className="flex-none px-4 py-2 border-b border-gray-700 text-sm text-gray-400">
        {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
      </div>

      {/* Virtualized results */}
      <div className="flex-1 overflow-y-auto" ref={parentRef}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const result = results[virtualRow.index];
            return (
              <div
                key={`${result.message.id}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <SearchResultItem result={result} onClick={() => handleResultClick(result)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual search result item
 */
interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  const { message, contactName, highlightedBody } = result;

  // Format timestamp
  const timestamp = new Date(message.timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // Get direction icon
  const directionIcon = message.direction === 'sent' ? (
    <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ) : (
    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex flex-col gap-1 text-left hover:bg-gray-800 transition-colors border-b border-gray-700/50"
    >
      {/* Header: contact name, direction, timestamp */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-white truncate">
          {contactName || 'Unknown'}
        </span>
        {directionIcon}
        <span className="flex-none text-xs text-gray-500">{timestamp}</span>
      </div>

      {/* Message body with highlights */}
      <div
        className="text-sm text-gray-300 line-clamp-2"
        dangerouslySetInnerHTML={{
          __html: highlightedBody || escapeHtml(message.body),
        }}
      />
    </button>
  );
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Search result skeleton for loading states
 */
export function SearchResultSkeleton() {
  return (
    <div className="px-4 py-3 flex flex-col gap-2 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 bg-gray-700 rounded w-24" />
        <div className="h-3 bg-gray-700 rounded w-3" />
        <div className="h-3 bg-gray-700 rounded w-32" />
      </div>
      <div className="h-4 bg-gray-700 rounded w-full" />
      <div className="h-4 bg-gray-700 rounded w-3/4" />
    </div>
  );
}
