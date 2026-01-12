/**
 * Search State Store
 *
 * Zustand store for managing search state including:
 * - Search query and filters
 * - Search results
 * - Loading and error states
 */

import { create } from 'zustand';
import type { SearchFilters, SearchResult, MessageDirection } from '../../shared/types';
import * as databaseService from '../services/databaseService';

// ============================================================================
// Types
// ============================================================================

export interface SearchState {
  // Search UI state
  isSearchOpen: boolean;
  query: string;
  useRegex: boolean;

  // Filters
  startDate: number | undefined;
  endDate: number | undefined;
  direction: MessageDirection | 'all';
  conversationId: number | undefined;

  // Results
  results: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  hasSearched: boolean;

  // Actions
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  setQuery: (query: string) => void;
  setUseRegex: (useRegex: boolean) => void;
  setStartDate: (date: number | undefined) => void;
  setEndDate: (date: number | undefined) => void;
  setDirection: (direction: MessageDirection | 'all') => void;
  setConversationId: (id: number | undefined) => void;

  executeSearch: () => Promise<void>;
  clearSearch: () => void;
  clearFilters: () => void;

  // Helper to build filters object
  getFilters: () => SearchFilters;
}

// ============================================================================
// Store
// ============================================================================

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  isSearchOpen: false,
  query: '',
  useRegex: false,

  startDate: undefined,
  endDate: undefined,
  direction: 'all',
  conversationId: undefined,

  results: [],
  isSearching: false,
  searchError: null,
  hasSearched: false,

  // ============================================================================
  // UI Actions
  // ============================================================================

  openSearch: () => {
    set({ isSearchOpen: true });
  },

  closeSearch: () => {
    set({ isSearchOpen: false });
  },

  toggleSearch: () => {
    set((state) => ({ isSearchOpen: !state.isSearchOpen }));
  },

  // ============================================================================
  // Filter Actions
  // ============================================================================

  setQuery: (query: string) => {
    set({ query });
  },

  setUseRegex: (useRegex: boolean) => {
    set({ useRegex });
  },

  setStartDate: (startDate: number | undefined) => {
    set({ startDate });
  },

  setEndDate: (endDate: number | undefined) => {
    set({ endDate });
  },

  setDirection: (direction: MessageDirection | 'all') => {
    set({ direction });
  },

  setConversationId: (conversationId: number | undefined) => {
    set({ conversationId });
  },

  // ============================================================================
  // Search Actions
  // ============================================================================

  getFilters: () => {
    const state = get();
    return {
      query: state.query,
      useRegex: state.useRegex,
      startDate: state.startDate,
      endDate: state.endDate,
      direction: state.direction,
      conversationId: state.conversationId,
    };
  },

  executeSearch: async () => {
    const { query } = get();

    // Don't search with empty query
    if (!query.trim()) {
      set({ results: [], hasSearched: false, searchError: null });
      return;
    }

    set({ isSearching: true, searchError: null });

    try {
      const filters = get().getFilters();
      const results = await databaseService.searchMessages(filters);

      set({
        results,
        isSearching: false,
        hasSearched: true,
      });
    } catch (error) {
      set({
        searchError: error instanceof Error ? error.message : 'Search failed',
        isSearching: false,
        hasSearched: true,
        results: [],
      });
    }
  },

  clearSearch: () => {
    set({
      query: '',
      results: [],
      hasSearched: false,
      searchError: null,
    });
  },

  clearFilters: () => {
    set({
      startDate: undefined,
      endDate: undefined,
      direction: 'all',
      conversationId: undefined,
    });
  },
}));
