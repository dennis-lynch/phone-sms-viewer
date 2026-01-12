/**
 * Search Filters Component
 *
 * Advanced search filters including:
 * - Date range picker (start/end dates)
 * - Message direction (All/Sent/Received)
 * - Apply/Clear buttons
 */

import React from 'react';
import { useSearchStore } from '../../store/searchStore';
import type { MessageDirection } from '../../../shared/types';

interface SearchFiltersProps {
  onApply?: () => void;
}

export function SearchFilters({ onApply }: SearchFiltersProps) {
  const {
    startDate,
    endDate,
    direction,
    setStartDate,
    setEndDate,
    setDirection,
    executeSearch,
    clearFilters,
  } = useSearchStore();

  // Convert timestamp to date input value
  const formatDateForInput = (timestamp: number | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  // Parse date input to timestamp
  const parseDateInput = (value: string): number | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return date.getTime();
  };

  // Handle start date change
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(parseDateInput(e.target.value));
  };

  // Handle end date change
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timestamp = parseDateInput(e.target.value);
    // Set to end of day
    if (timestamp) {
      const endOfDay = new Date(timestamp);
      endOfDay.setHours(23, 59, 59, 999);
      setEndDate(endOfDay.getTime());
    } else {
      setEndDate(undefined);
    }
  };

  // Handle direction change
  const handleDirectionChange = (newDirection: MessageDirection | 'all') => {
    setDirection(newDirection);
  };

  // Handle apply
  const handleApply = () => {
    executeSearch();
    onApply?.();
  };

  // Handle clear
  const handleClear = () => {
    clearFilters();
  };

  // Check if any filters are active
  const hasActiveFilters = startDate || endDate || direction !== 'all';

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">From:</label>
          <input
            type="date"
            value={formatDateForInput(startDate)}
            onChange={handleStartDateChange}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">To:</label>
          <input
            type="date"
            value={formatDateForInput(endDate)}
            onChange={handleEndDateChange}
            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Direction filter */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-400 mr-1">Type:</label>
          <DirectionButton
            label="All"
            active={direction === 'all'}
            onClick={() => handleDirectionChange('all')}
          />
          <DirectionButton
            label="Sent"
            active={direction === 'sent'}
            onClick={() => handleDirectionChange('sent')}
          />
          <DirectionButton
            label="Received"
            active={direction === 'received'}
            onClick={() => handleDirectionChange('received')}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={handleApply}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Direction toggle button
 */
interface DirectionButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function DirectionButton({ label, active, onClick }: DirectionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Compact version of filters for inline display
 */
export function SearchFiltersCompact() {
  const { startDate, endDate, direction, clearFilters } = useSearchStore();

  const hasFilters = startDate || endDate || direction !== 'all';

  if (!hasFilters) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      {startDate && <span>From: {formatDate(startDate)}</span>}
      {endDate && <span>To: {formatDate(endDate)}</span>}
      {direction !== 'all' && <span>Type: {direction}</span>}
      <button
        onClick={clearFilters}
        className="text-gray-500 hover:text-white ml-1"
        title="Clear filters"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
