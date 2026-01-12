/**
 * Message Selection Hook
 *
 * Manages message selection state for copy and export operations.
 * Supports:
 * - Single selection (click)
 * - Range selection (shift+click)
 * - Multi-selection (ctrl/cmd+click)
 * - Select all
 * - Clear selection
 */

import { useState, useCallback, useMemo } from 'react';
import type { Message } from '../../shared/types';

export interface SelectionState {
  /** Set of selected message IDs */
  selectedIds: Set<number>;
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** The ID of the last selected message (for range selection) */
  lastSelectedId: number | null;
}

export interface UseSelectionResult {
  /** Current selection state */
  selectedIds: Set<number>;
  /** Whether selection mode is active */
  isSelectionMode: boolean;
  /** Toggle selection mode on/off */
  toggleSelectionMode: () => void;
  /** Enable selection mode */
  enableSelectionMode: () => void;
  /** Disable selection mode and clear selection */
  disableSelectionMode: () => void;
  /** Check if a message is selected */
  isSelected: (messageId: number) => boolean;
  /** Handle message click for selection */
  handleSelect: (messageId: number, messages: Message[], event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => void;
  /** Toggle a single message's selection */
  toggleSelection: (messageId: number) => void;
  /** Select all messages */
  selectAll: (messages: Message[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Get selected messages from a list */
  getSelectedMessages: (messages: Message[]) => Message[];
  /** Number of selected messages */
  selectedCount: number;
}

export function useSelection(): UseSelectionResult {
  const [state, setState] = useState<SelectionState>({
    selectedIds: new Set(),
    isSelectionMode: false,
    lastSelectedId: null,
  });

  const toggleSelectionMode = useCallback(() => {
    setState((prev) => ({
      selectedIds: prev.isSelectionMode ? new Set() : prev.selectedIds,
      isSelectionMode: !prev.isSelectionMode,
      lastSelectedId: null,
    }));
  }, []);

  const enableSelectionMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSelectionMode: true,
    }));
  }, []);

  const disableSelectionMode = useCallback(() => {
    setState({
      selectedIds: new Set(),
      isSelectionMode: false,
      lastSelectedId: null,
    });
  }, []);

  const isSelected = useCallback(
    (messageId: number) => state.selectedIds.has(messageId),
    [state.selectedIds]
  );

  const toggleSelection = useCallback((messageId: number) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedIds);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      return {
        ...prev,
        selectedIds: newSelected,
        lastSelectedId: messageId,
      };
    });
  }, []);

  const handleSelect = useCallback(
    (
      messageId: number,
      messages: Message[],
      event?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }
    ) => {
      const isShiftKey = event?.shiftKey ?? false;
      const isCtrlOrCmd = (event?.ctrlKey ?? false) || (event?.metaKey ?? false);

      setState((prev) => {
        const newSelected = new Set(prev.selectedIds);

        if (isShiftKey && prev.lastSelectedId !== null) {
          // Range selection
          const lastIndex = messages.findIndex((m) => m.id === prev.lastSelectedId);
          const currentIndex = messages.findIndex((m) => m.id === messageId);

          if (lastIndex !== -1 && currentIndex !== -1) {
            const startIndex = Math.min(lastIndex, currentIndex);
            const endIndex = Math.max(lastIndex, currentIndex);

            for (let i = startIndex; i <= endIndex; i++) {
              const id = messages[i].id;
              if (id !== undefined) {
                newSelected.add(id);
              }
            }
          }

          return {
            ...prev,
            selectedIds: newSelected,
          };
        } else if (isCtrlOrCmd) {
          // Toggle single selection
          if (newSelected.has(messageId)) {
            newSelected.delete(messageId);
          } else {
            newSelected.add(messageId);
          }

          return {
            ...prev,
            selectedIds: newSelected,
            lastSelectedId: messageId,
          };
        } else {
          // Single selection (replaces previous selection)
          return {
            ...prev,
            selectedIds: new Set([messageId]),
            lastSelectedId: messageId,
          };
        }
      });
    },
    []
  );

  const selectAll = useCallback((messages: Message[]) => {
    setState((prev) => ({
      ...prev,
      selectedIds: new Set(messages.filter((m) => m.id !== undefined).map((m) => m.id!)),
      lastSelectedId: null,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIds: new Set(),
      lastSelectedId: null,
    }));
  }, []);

  const getSelectedMessages = useCallback(
    (messages: Message[]) => {
      return messages.filter((m) => m.id !== undefined && state.selectedIds.has(m.id));
    },
    [state.selectedIds]
  );

  const selectedCount = useMemo(() => state.selectedIds.size, [state.selectedIds]);

  return {
    selectedIds: state.selectedIds,
    isSelectionMode: state.isSelectionMode,
    toggleSelectionMode,
    enableSelectionMode,
    disableSelectionMode,
    isSelected,
    handleSelect,
    toggleSelection,
    selectAll,
    clearSelection,
    getSelectedMessages,
    selectedCount,
  };
}
