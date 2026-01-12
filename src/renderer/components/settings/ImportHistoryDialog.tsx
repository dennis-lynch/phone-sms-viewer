/**
 * Import History Dialog
 *
 * Displays a list of previously imported backup files with:
 * - File path and name
 * - Import date
 * - Message/call counts
 * - Backup type (SMS/Calls)
 */

import React, { useEffect, useState } from 'react';
import type { ImportMetadata } from '../../../shared/types';
import * as databaseService from '../../services/databaseService';

interface ImportHistoryDialogProps {
  onClose: () => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || filePath;
}

export function ImportHistoryDialog({ onClose }: ImportHistoryDialogProps) {
  const [history, setHistory] = useState<ImportMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await databaseService.getImportHistory();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load import history');
    } finally {
      setLoading(false);
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
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-medium text-white">Import History</h2>
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
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-400">
              <p>{error}</p>
              <button
                onClick={loadHistory}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No imports yet</p>
              <p className="text-sm mt-1">Import a backup file to see it here</p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-700/50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Type badge */}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          item.type === 'sms'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {item.type === 'sms' ? 'SMS' : 'Calls'}
                        </span>
                        <span className="font-medium text-white truncate">
                          {formatFileName(item.filePath)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate mt-1" title={item.filePath}>
                        {item.filePath}
                      </p>
                    </div>
                    <div className="flex-none text-right">
                      <div className="text-sm text-gray-400">
                        {formatDate(item.importDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    {item.messageCount > 0 && (
                      <div className="flex items-center gap-1 text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{item.messageCount.toLocaleString()} messages</span>
                      </div>
                    )}
                    {item.callCount > 0 && (
                      <div className="flex items-center gap-1 text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{item.callCount.toLocaleString()} calls</span>
                      </div>
                    )}
                    {item.backupDate > 0 && (
                      <div className="text-gray-500 text-xs">
                        Backup: {formatDate(item.backupDate)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-700">
          <div className="text-sm text-gray-500">
            {history.length} import{history.length !== 1 ? 's' : ''} total
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
