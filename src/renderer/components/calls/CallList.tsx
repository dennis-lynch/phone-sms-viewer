/**
 * Call List Component
 *
 * Displays a virtualized list of call logs with:
 * - Filter by call type (all, incoming, outgoing, missed)
 * - Virtualized scrolling for performance
 * - Click to view conversation
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Call, CallTypeLabel } from '../../../shared/types';
import { CallItem, CallItemSkeleton } from './CallItem';
import * as databaseService from '../../services/databaseService';

const ITEM_HEIGHT = 72;
const OVERSCAN = 10;
const CALLS_PER_PAGE = 500;

type CallFilter = 'all' | CallTypeLabel;

interface CallListProps {
  /** If provided, only show calls for this conversation */
  conversationId?: number;
  /** Callback when a call is clicked */
  onCallClick?: (call: Call) => void;
}

export function CallList({ conversationId, onCallClick }: CallListProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CallFilter>('all');
  const [hasMore, setHasMore] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  // Load calls
  const loadCalls = useCallback(async (offset = 0, append = false) => {
    try {
      setLoading(true);
      setError(null);

      let loadedCalls: Call[];
      if (conversationId) {
        loadedCalls = await databaseService.getCallsByConversation(conversationId, CALLS_PER_PAGE, offset);
      } else {
        loadedCalls = await databaseService.getCalls(CALLS_PER_PAGE, offset);
      }

      if (append) {
        setCalls((prev) => [...prev, ...loadedCalls]);
      } else {
        setCalls(loadedCalls);
      }

      setHasMore(loadedCalls.length === CALLS_PER_PAGE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calls');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    loadCalls(0, false);
  }, [loadCalls]);

  // Filter calls
  const filteredCalls = useMemo(() => {
    if (filter === 'all') return calls;
    return calls.filter((call) => call.typeLabel === filter);
  }, [calls, filter]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: filteredCalls.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

  // Load more
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadCalls(calls.length, true);
    }
  };

  // Filter buttons
  const filterButtons: { label: string; value: CallFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Incoming', value: 'incoming' },
    { label: 'Outgoing', value: 'outgoing' },
    { label: 'Missed', value: 'missed' },
    { label: 'Rejected', value: 'rejected' },
  ];

  // Count calls by type
  const callCounts = useMemo(() => {
    const counts: Record<CallFilter, number> = {
      all: calls.length,
      incoming: 0,
      outgoing: 0,
      missed: 0,
      rejected: 0,
    };
    for (const call of calls) {
      counts[call.typeLabel]++;
    }
    return counts;
  }, [calls]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Filter bar */}
      <div className="flex-none px-4 py-3 border-b border-gray-700">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === btn.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {btn.label}
              {callCounts[btn.value] > 0 && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({callCounts[btn.value]})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto" ref={parentRef}>
        {/* Loading state */}
        {loading && calls.length === 0 && (
          <div className="divide-y divide-gray-700">
            {Array.from({ length: 8 }).map((_, i) => (
              <CallItemSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center h-full text-red-400 p-4">
            <p>Failed to load calls</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
            <button
              onClick={() => loadCalls(0, false)}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredCalls.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-lg">No calls found</p>
            {filter !== 'all' && (
              <p className="text-sm mt-1">Try changing the filter</p>
            )}
          </div>
        )}

        {/* Virtualized list */}
        {filteredCalls.length > 0 && (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const call = filteredCalls[virtualRow.index];
              return (
                <div
                  key={call.id || virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <CallItem
                    call={call}
                    onClick={onCallClick ? () => onCallClick(call) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="py-4 text-center">
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm text-gray-300"
            >
              Load more calls
            </button>
          </div>
        )}

        {/* Loading more indicator */}
        {loading && calls.length > 0 && (
          <div className="py-4 text-center text-gray-500 text-sm">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
