/**
 * Settings Store
 *
 * Zustand store for managing user preferences with localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateFormat = '12h' | '24h';
export type DateStyle = 'us' | 'eu' | 'iso';
export type Theme = 'dark' | 'light' | 'system';

export interface SettingsState {
  // Display settings
  dateFormat: DateFormat;
  dateStyle: DateStyle;
  theme: Theme;

  // Behavior settings
  showMessagePreview: boolean;
  autoScrollToBottom: boolean;
  confirmBeforeReset: boolean;

  // Actions
  setDateFormat: (format: DateFormat) => void;
  setDateStyle: (style: DateStyle) => void;
  setTheme: (theme: Theme) => void;
  setShowMessagePreview: (show: boolean) => void;
  setAutoScrollToBottom: (auto: boolean) => void;
  setConfirmBeforeReset: (confirm: boolean) => void;
  resetToDefaults: () => void;
}

const defaultSettings = {
  dateFormat: '12h' as DateFormat,
  dateStyle: 'us' as DateStyle,
  theme: 'dark' as Theme,
  showMessagePreview: true,
  autoScrollToBottom: true,
  confirmBeforeReset: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setDateFormat: (dateFormat) => set({ dateFormat }),
      setDateStyle: (dateStyle) => set({ dateStyle }),
      setTheme: (theme) => set({ theme }),
      setShowMessagePreview: (showMessagePreview) => set({ showMessagePreview }),
      setAutoScrollToBottom: (autoScrollToBottom) => set({ autoScrollToBottom }),
      setConfirmBeforeReset: (confirmBeforeReset) => set({ confirmBeforeReset }),

      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'phone-sms-viewer-settings',
    }
  )
);
