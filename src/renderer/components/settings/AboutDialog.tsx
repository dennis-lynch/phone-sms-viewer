/**
 * About Dialog
 *
 * Shows application information:
 * - App name and version
 * - Description
 * - Links
 */

import React from 'react';

interface AboutDialogProps {
  onClose: () => void;
}

const APP_VERSION = '0.1.0';

export function AboutDialog({ onClose }: AboutDialogProps) {
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
          <h2 className="text-lg font-medium text-white">About</h2>
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
        <div className="p-6 text-center">
          {/* App icon */}
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          {/* App name and version */}
          <h1 className="text-xl font-semibold text-white mb-1">Phone SMS Viewer</h1>
          <p className="text-gray-400 text-sm mb-4">Version {APP_VERSION}</p>

          {/* Description */}
          <p className="text-gray-300 mb-6">
            A desktop application to browse and search SMS and call log backups
            from SMS Backup & Restore Pro.
          </p>

          {/* Features */}
          <div className="text-left bg-gray-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Features</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Import SMS and call log backups (XML/ZIP)</li>
              <li>• Full-text search with regex support</li>
              <li>• Browse conversations and call history</li>
              <li>• Export messages in multiple formats</li>
              <li>• Fast virtualized scrolling for large datasets</li>
            </ul>
          </div>

          {/* Tech stack */}
          <div className="text-xs text-gray-500">
            Built with Electron, React, TypeScript, and SQLite
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
