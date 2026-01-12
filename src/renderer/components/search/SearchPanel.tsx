/**
 * Search Panel Component
 *
 * Full search panel that combines:
 * - SearchBar for query input
 * - SearchFilters for advanced filtering
 * - SearchResults for displaying matches
 */

import React, { useState } from 'react';
import { SearchBar } from './SearchBar';
import { SearchFilters } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { useSearchStore } from '../../store/searchStore';

interface SearchPanelProps {
  onClose?: () => void;
}

export function SearchPanel({ onClose }: SearchPanelProps) {
  const [showFilters, setShowFilters] = useState(false);
  const { clearSearch, closeSearch } = useSearchStore();

  const handleClose = () => {
    clearSearch();
    closeSearch();
    onClose?.();
  };

  const handleResultClick = () => {
    // Optionally close search panel when clicking a result
    // onClose?.();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header with search bar */}
      <div className="flex-none bg-gray-800 border-b border-gray-700 p-3">
        <div className="flex items-center gap-2">
          <SearchBar autoFocus onClose={handleClose} />

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded transition-colors ${
              showFilters
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'
            }`}
            title="Toggle filters"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && <SearchFilters />}

      {/* Results */}
      <SearchResults onResultClick={handleResultClick} />
    </div>
  );
}
