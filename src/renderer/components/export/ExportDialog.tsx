/**
 * Export Dialog Component
 *
 * Modal dialog for exporting messages with options:
 * - Format: Plain Text, CSV, JSON, HTML
 * - Options: Include timestamps, contact names
 * - Scope: Selected messages, entire conversation, search results
 */

import React, { useState } from 'react';
import type { Message, ExportOptions } from '../../../shared/types';

type ExportFormat = ExportOptions['format'];
type ExportScope = ExportOptions['scope'];

interface ExportDialogProps {
  /** Messages to export */
  messages: Message[];
  /** Selected message count (for scope display) */
  selectedCount: number;
  /** Conversation name for filename */
  conversationName?: string;
  /** Available scopes */
  availableScopes: ExportScope[];
  /** Initial scope */
  initialScope?: ExportScope;
  /** Called when export is requested */
  onExport: (options: ExportOptions) => void;
  /** Called when dialog is closed */
  onClose: () => void;
}

const formatOptions: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'text', label: 'Plain Text', description: 'Simple text format, one message per line' },
  { value: 'csv', label: 'CSV', description: 'Comma-separated values for spreadsheets' },
  { value: 'json', label: 'JSON', description: 'Structured data format for developers' },
  { value: 'html', label: 'HTML', description: 'Styled web page format' },
];

const scopeLabels: Record<ExportScope, string> = {
  selection: 'Selected Messages',
  conversation: 'Entire Conversation',
  search: 'Search Results',
  all: 'All Messages',
};

export function ExportDialog({
  messages,
  selectedCount,
  conversationName,
  availableScopes,
  initialScope = 'conversation',
  onExport,
  onClose,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('text');
  const [scope, setScope] = useState<ExportScope>(
    availableScopes.includes(initialScope) ? initialScope : availableScopes[0]
  );
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeContactNames, setIncludeContactNames] = useState(true);

  const handleExport = () => {
    onExport({
      format,
      includeTimestamps,
      includeContactNames,
      scope,
    });
  };

  const getMessageCount = (): number => {
    switch (scope) {
      case 'selection':
        return selectedCount;
      case 'conversation':
      case 'search':
      case 'all':
        return messages.length;
      default:
        return 0;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white">Export Messages</h2>
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
        <div className="p-4 space-y-6">
          {/* Scope selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What to export
            </label>
            <div className="space-y-2">
              {availableScopes.map((scopeOption) => (
                <label
                  key={scopeOption}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="scope"
                    value={scopeOption}
                    checked={scope === scopeOption}
                    onChange={() => setScope(scopeOption)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
                  />
                  <span className="text-white">
                    {scopeLabels[scopeOption]}
                    {scopeOption === 'selection' && selectedCount > 0 && (
                      <span className="text-gray-400 text-sm ml-2">
                        ({selectedCount} messages)
                      </span>
                    )}
                    {scopeOption === 'conversation' && (
                      <span className="text-gray-400 text-sm ml-2">
                        ({messages.length} messages)
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Export format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormat(option.value)}
                  className={`p-3 rounded-md border text-left transition-colors ${
                    format === option.value
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                <span className="text-white">Include timestamps</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeContactNames}
                  onChange={(e) => setIncludeContactNames(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                <span className="text-white">Include contact names</span>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-700/50 rounded-md p-3">
            <div className="text-sm text-gray-400">
              Exporting <span className="text-white font-medium">{getMessageCount()}</span> messages
              {conversationName && (
                <span>
                  {' '}from <span className="text-white">{conversationName}</span>
                </span>
              )}
              {' '}as <span className="text-white font-medium">{formatOptions.find(f => f.value === format)?.label}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={getMessageCount() === 0}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-md transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
