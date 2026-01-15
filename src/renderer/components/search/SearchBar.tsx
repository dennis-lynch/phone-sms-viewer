/**
 * Search Bar Component
 *
 * Text input with search button, clear button, and regex toggle.
 * Triggers search on Enter key or Search button click.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchStore } from '../../store/searchStore';

interface SearchBarProps {
  autoFocus?: boolean;
  onClose?: () => void;
}

export function SearchBar({ autoFocus = false, onClose }: SearchBarProps) {
  const {
    query,
    useRegex,
    isSearching,
    setQuery,
    setUseRegex,
    executeSearch,
    clearSearch,
  } = useSearchStore();

  const [localQuery, setLocalQuery] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local query with store
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle input change (no auto-search)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  };

  // Execute search
  const handleSearch = () => {
    setQuery(localQuery);
    executeSearch();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      onClose?.();
    }
  };

  // Handle clear
  const handleClear = () => {
    setLocalQuery('');
    clearSearch();
    inputRef.current?.focus();
  };

  // Handle regex toggle
  const handleRegexToggle = () => {
    setUseRegex(!useRegex);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search input */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search messages..."
          value={localQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 pl-9 pr-8 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Search icon */}
        <svg
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isSearching ? 'text-blue-400 animate-pulse' : 'text-gray-400'
          }`}
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

        {/* Clear button */}
        {localQuery && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            title="Clear search"
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

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={isSearching || !localQuery.trim()}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isSearching || !localQuery.trim()
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
        title="Search (Enter)"
      >
        {isSearching ? 'Searching...' : 'Search'}
      </button>

      {/* Regex toggle */}
      <button
        onClick={handleRegexToggle}
        className={`px-2 py-2 rounded-md text-xs font-mono transition-colors ${
          useRegex
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
        }`}
        title={useRegex ? 'Regex enabled' : 'Enable regex'}
      >
        .*
      </button>

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          title="Close search (Esc)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  );
}
