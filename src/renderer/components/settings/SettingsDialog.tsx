/**
 * Settings Dialog
 *
 * Modal dialog for configuring user preferences:
 * - Date/time format
 * - Display options
 * - Behavior options
 */

import React from 'react';
import { useSettingsStore, DateFormat, DateStyle, Theme } from '../../store/settingsStore';

interface SettingsDialogProps {
  onClose: () => void;
}

const dateFormatOptions: { value: DateFormat; label: string; example: string }[] = [
  { value: '12h', label: '12-hour', example: '3:45 PM' },
  { value: '24h', label: '24-hour', example: '15:45' },
];

const dateStyleOptions: { value: DateStyle; label: string; example: string }[] = [
  { value: 'us', label: 'US (MM/DD/YYYY)', example: '01/15/2024' },
  { value: 'eu', label: 'EU (DD/MM/YYYY)', example: '15/01/2024' },
  { value: 'iso', label: 'ISO (YYYY-MM-DD)', example: '2024-01-15' },
];

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const {
    dateFormat,
    dateStyle,
    theme,
    showMessagePreview,
    autoScrollToBottom,
    confirmBeforeReset,
    setDateFormat,
    setDateStyle,
    setTheme,
    setShowMessagePreview,
    setAutoScrollToBottom,
    setConfirmBeforeReset,
    resetToDefaults,
  } = useSettingsStore();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      resetToDefaults();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Date & Time */}
          <section>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
              Date & Time
            </h3>

            {/* Time format */}
            <div className="mb-4">
              <label className="block text-sm text-white mb-2">Time Format</label>
              <div className="grid grid-cols-2 gap-2">
                {dateFormatOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateFormat(option.value)}
                    className={`p-3 rounded-md border text-left transition-colors ${
                      dateFormat === option.value
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-400">{option.example}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date style */}
            <div>
              <label className="block text-sm text-white mb-2">Date Style</label>
              <div className="grid grid-cols-3 gap-2">
                {dateStyleOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateStyle(option.value)}
                    className={`p-3 rounded-md border text-left transition-colors ${
                      dateStyle === option.value
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label.split(' ')[0]}</div>
                    <div className="text-xs text-gray-400">{option.example}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
              Appearance
            </h3>

            {/* Theme */}
            <div>
              <label className="block text-sm text-white mb-2">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`p-3 rounded-md border text-center transition-colors ${
                      theme === option.value
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Note: Light theme is coming soon. Currently only dark mode is supported.
              </p>
            </div>
          </section>

          {/* Behavior */}
          <section>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
              Behavior
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMessagePreview}
                  onChange={(e) => setShowMessagePreview(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                <div>
                  <span className="text-white">Show message preview</span>
                  <p className="text-xs text-gray-500">Show last message in conversation list</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScrollToBottom}
                  onChange={(e) => setAutoScrollToBottom(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                <div>
                  <span className="text-white">Auto-scroll to bottom</span>
                  <p className="text-xs text-gray-500">Scroll to latest messages when opening conversation</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmBeforeReset}
                  onChange={(e) => setConfirmBeforeReset(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                <div>
                  <span className="text-white">Confirm before reset</span>
                  <p className="text-xs text-gray-500">Ask for confirmation before resetting database</p>
                </div>
              </label>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-700">
          <button
            onClick={handleResetToDefaults}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
