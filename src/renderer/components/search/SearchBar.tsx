/**
 * Search Bar Component
 *
 * Text input with debounced search, clear button, and regex toggle.
 * Triggers search on Enter or after debounce delay.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchStore } from '../../store/searchStore';

const DEBOUNCE_DELAY = 300; // milliseconds

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  // Debounced search
  const debouncedSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setQuery(localQuery);
      executeSearch();
    }, DEBOUNCE_DELAY);
  }, [localQuery, setQuery, executeSearch]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
    debouncedSearch();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setQuery(localQuery);
      executeSearch();
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
    // Re-execute search with new setting if there's a query
    if (localQuery.trim()) {
      executeSearch();
    }
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
