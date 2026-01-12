/**
 * Call Item Component
 *
 * Displays a single call log entry with:
 * - Call type icon (incoming, outgoing, missed, rejected)
 * - Contact name
 * - Duration
 * - Timestamp
 */

import React from 'react';
import type { Call } from '../../../shared/types';
import { formatDuration, formatRelativeTime } from '../../services/databaseService';

interface CallItemProps {
  call: Call;
  onClick?: () => void;
}

/**
 * Icon for different call types
 */
function CallTypeIcon({ type }: { type: Call['typeLabel'] }) {
  const baseClasses = 'w-5 h-5';

  switch (type) {
    case 'incoming':
      return (
        <svg className={`${baseClasses} text-green-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l5 5m0 0l-5 5m5-5H9" />
        </svg>
      );
    case 'outgoing':
      return (
        <svg className={`${baseClasses} text-blue-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5l-5 5m0 0l5 5m-5-5h10" />
        </svg>
      );
    case 'missed':
      return (
        <svg className={`${baseClasses} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l-6 6m0-6l6 6" />
        </svg>
      );
    case 'rejected':
      return (
        <svg className={`${baseClasses} text-orange-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
    default:
      return (
        <svg className={`${baseClasses} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      );
  }
}

/**
 * Format full timestamp for display
 */
function formatFullTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Get label for call type
 */
function getTypeLabel(type: Call['typeLabel']): string {
  switch (type) {
    case 'incoming':
      return 'Incoming';
    case 'outgoing':
      return 'Outgoing';
    case 'missed':
      return 'Missed';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

export function CallItem({ call, onClick }: CallItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-700 hover:bg-gray-800/50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Call type icon */}
      <div className="flex-none">
        <CallTypeIcon type={call.typeLabel} />
      </div>

      {/* Contact info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">
          {call.contactName || call.phoneNumber}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{getTypeLabel(call.typeLabel)}</span>
          <span className="text-gray-600">|</span>
          <span>{formatDuration(call.duration)}</span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex-none text-right">
        <div className="text-sm text-gray-400">
          {formatRelativeTime(call.timestamp)}
        </div>
        <div className="text-xs text-gray-500">
          {formatFullTimestamp(call.timestamp)}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for call items
 */
export function CallItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700 animate-pulse">
      <div className="flex-none w-5 h-5 bg-gray-700 rounded" />
      <div className="flex-1">
        <div className="h-4 bg-gray-700 rounded w-32 mb-2" />
        <div className="h-3 bg-gray-700 rounded w-24" />
      </div>
      <div className="flex-none text-right">
        <div className="h-3 bg-gray-700 rounded w-16 mb-1" />
        <div className="h-3 bg-gray-700 rounded w-20" />
      </div>
    </div>
  );
}
