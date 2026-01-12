/**
 * Import Progress Modal
 *
 * Displays import progress, results, and errors.
 * Allows cancellation of ongoing imports.
 */

import React, { useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import * as fileService from '../../services/fileService';

export function ImportProgressModal() {
  const {
    showImportModal,
    import: importState,
    updateImportProgress,
    updateFileProgress,
    cancelImport,
    clearImportResult,
  } = useAppStore();

  // Subscribe to progress events
  useEffect(() => {
    const unsubProgress = fileService.onImportProgress(updateImportProgress);
    const unsubFileProgress = fileService.onImportFileProgress(updateFileProgress);

    return () => {
      unsubProgress();
      unsubFileProgress();
    };
  }, [updateImportProgress, updateFileProgress]);

  if (!showImportModal) {
    return null;
  }

  const { isImporting, progress, fileProgress, result, error } = importState;

  // Calculate percentage
  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  // Determine phase label
  const getPhaseLabel = () => {
    if (!progress) return 'Preparing...';

    switch (progress.phase) {
      case 'parsing':
        return 'Parsing messages...';
      case 'inserting':
        return 'Saving to database...';
      case 'grouping':
        return 'Organizing conversations...';
      case 'complete':
        return 'Complete!';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {result ? 'Import Complete' : error ? 'Import Failed' : 'Importing Backup'}
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Importing state */}
          {isImporting && (
            <div className="space-y-4">
              {/* File progress (for multi-file imports) */}
              {fileProgress && fileProgress.totalFiles > 1 && (
                <div className="text-sm text-gray-400">
                  File {fileProgress.currentFile} of {fileProgress.totalFiles}:{' '}
                  <span className="text-gray-300">{fileProgress.fileName}</span>
                </div>
              )}

              {/* Phase label */}
              <div className="text-white">{getPhaseLabel()}</div>

              {/* Progress bar */}
              {progress && progress.total > 0 && (
                <>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Stats */}
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>
                      {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
                    </span>
                    <span>{percentage}%</span>
                  </div>

                  {/* Detailed stats */}
                  <div className="text-sm text-gray-400 space-y-1">
                    <div>Messages imported: {progress.messagesImported.toLocaleString()}</div>
                    <div>Duplicates skipped: {progress.duplicatesSkipped.toLocaleString()}</div>
                    {progress.errors > 0 && (
                      <div className="text-yellow-400">Errors: {progress.errors}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Success result */}
          {result && result.success && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Import completed successfully!</span>
              </div>

              <div className="text-sm text-gray-400 space-y-1">
                <div>Total parsed: {result.totalParsed.toLocaleString()}</div>
                <div>Messages imported: {result.messagesImported.toLocaleString()}</div>
                {result.callsImported > 0 && (
                  <div>Calls imported: {result.callsImported.toLocaleString()}</div>
                )}
                <div>Duplicates skipped: {result.duplicatesSkipped.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Error result */}
          {(error || (result && !result.success)) && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span>Import failed</span>
              </div>

              <div className="text-sm text-gray-400">
                {error}
                {result?.errors && result.errors.length > 0 && (
                  <ul className="mt-2 list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          {isImporting ? (
            <button
              onClick={cancelImport}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={clearImportResult}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
