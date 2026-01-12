/**
 * App Layout Component
 *
 * Main application layout with:
 * - Header with toolbar
 * - Resizable sidebar for conversation list
 * - Main content area for message thread
 * - Status bar
 */

import React, { useState, useCallback, useRef } from 'react';

interface AppLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  content: React.ReactNode;
  statusBar: React.ReactNode;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 280;

export function AppLayout({ header, sidebar, content, statusBar }: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add/remove event listeners for resize
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white" ref={containerRef}>
      {/* Header */}
      <header className="flex-none">{header}</header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className="flex-none bg-gray-850 border-r border-gray-700 overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          {sidebar}
        </aside>

        {/* Resize handle */}
        <div
          className={`flex-none w-1 cursor-col-resize hover:bg-blue-500 transition-colors ${
            isResizing ? 'bg-blue-500' : 'bg-transparent'
          }`}
          onMouseDown={handleMouseDown}
        />

        {/* Main content */}
        <main className="flex-1 overflow-hidden">{content}</main>
      </div>

      {/* Status bar */}
      <footer className="flex-none">{statusBar}</footer>
    </div>
  );
}

/**
 * Header component for the app layout
 */
interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="flex-1" />
      {actions}
    </div>
  );
}

/**
 * Status bar component for the app layout
 */
interface StatusBarProps {
  children: React.ReactNode;
}

export function StatusBar({ children }: StatusBarProps) {
  return (
    <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-500">
      {children}
    </div>
  );
}
