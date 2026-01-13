# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-01-12

### Fixed
- **GPU cache errors on Windows**: Added Electron command-line switches to disable GPU disk cache, eliminating "Unable to move the cache: Access is denied" errors
- **File type detection failing**: Rewrote `getBackupInfo` and `getCallsBackupInfo` functions to use synchronous file reading with regex matching instead of streaming SAX parser, which was failing silently on Windows
- **SAX parser crash on error**: Removed invalid `parser.resume()` calls from error handlers - SAXStream doesn't have this method, and errors are non-fatal anyway
- **Improved import diagnostics**: Added detailed console logging during file import to help diagnose import failures

## [1.0.0] - 2026-01-12

### Added
- Initial project setup with Electron, TypeScript, and React
- Project structure with main process, renderer process, and preload scripts
- Tailwind CSS for styling
- TypeScript configuration for strict type checking
- ESLint 9 with flat config format for code quality
- Comprehensive documentation (SETUP.md, CLAUDE.md)
- **Phase 1: Core Data Layer**
  - SQLite database schema with FTS5 full-text search support
  - Database connection manager with WAL mode and optimizations
  - Prepared queries for messages, calls, conversations, and search
  - SMS/MMS XML streaming parser using SAX for memory-efficient parsing
  - Call log XML streaming parser
  - ZIP file extractor for backup archives
  - Phone number normalization to E.164 format
  - HTML entity decoder for message bodies (emoji, special characters)
  - Message deduplication using SHA-256 hash + timestamp + phone composite key
  - Shared TypeScript types for main/renderer processes
- **Phase 2: IPC & File Loading**
  - Modular IPC handlers for file operations and database queries
  - Secure preload script exposing electron API to renderer
  - File service for opening files, directories, and importing backups
  - Database service wrapper with error handling
  - Zustand store for application state management
  - Import progress modal with cancel support
  - Multi-file import with progress tracking
  - Empty state UI when no backups are loaded
  - Basic app layout with header, footer, and status bar
- **Phase 3: Basic UI & Conversation List**
  - AppLayout component with resizable sidebar (drag to resize, 200-500px range)
  - ConversationList component with real-time search filtering
  - ConversationItem component with avatar, contact name, preview, timestamp, and message count badge
  - MessageThread component with header showing contact info and message count
  - MessageBubble component with sent/received styles (blue right-aligned vs gray left-aligned)
  - DateSeparator component with "Today", "Yesterday", or full date display
  - URL detection and linkification in message bodies
  - Message grouping by date for organized display
  - Auto-scroll to bottom on conversation load
  - Load more button for older messages with pagination support
  - Skeleton loaders for conversations and messages during loading states
- **Phase 4: Virtualization & Performance**
  - Virtualized conversation list using TanStack Virtual (react-virtual)
    - Fixed 72px item height estimate with 10-item overscan
    - Smooth scrolling with large conversation lists (1000+)
  - Virtualized message thread with dynamic height measurement
    - Variable height support for different message lengths
    - 20-item overscan for smooth scrolling
    - Date separators integrated into virtualized list
  - Database optimization with ANALYZE after imports
    - Automatic ANALYZE call after single file import
    - Automatic ANALYZE call after multi-file import batch
  - Memory management improvements
    - Messages cleared when switching conversations
    - Conversation list limited to 1000 by default
    - Lazy loading with 500 messages per page
- **Phase 5: Search Functionality**
  - Zustand search store for managing search state and filters
  - SearchBar component with 300ms debounced input
    - Auto-search on typing with debounce
    - Immediate search on Enter key
    - Clear button to reset search
    - Regex toggle for regular expression patterns
  - SearchFilters component for advanced filtering
    - Date range picker (start and end dates)
    - Message direction filter (All/Sent/Received)
    - Apply and Clear buttons
  - SearchResults component with virtualized list
    - FTS5 full-text search with highlighted matches
    - REGEXP support for regex patterns
    - Results show contact name, message body, timestamp, and direction
    - Click to navigate to conversation
    - Virtualized for performance with large result sets
  - SearchPanel combining all search components
  - Keyboard shortcuts
    - Ctrl/Cmd+F to toggle search panel
    - Escape to close search
  - Search button in header toolbar
- **Phase 6: Date Navigation**
  - DateJumper floating action button for navigating to specific dates
    - Fixed position FAB in bottom-right corner
    - Calendar icon with hover effect
  - DatePickerModal with full calendar interface
    - Month/year dropdown selectors for fast navigation
    - Calendar grid showing available days
    - Days outside message date range are disabled
    - Quick buttons: "Oldest" and "Newest" for jumping to ends
    - Date range info showing conversation span
    - "Go to Date" button to confirm selection
  - Scroll-to-date functionality
    - Smooth scrolling to first message on selected date
    - Brief highlight animation (2s fade) on jumped-to message
    - Uses virtualizer.scrollToIndex for efficient navigation
  - Date range display in conversation header
    - Shows message date span (e.g., "Jan 2023 - Dec 2024")
    - Displays alongside message count
- **Phase 7: Call Logs**
  - CallItem component with call type icons (incoming, outgoing, missed, rejected)
    - Color-coded icons: green (incoming), blue (outgoing), red (missed), orange (rejected)
    - Duration formatting (e.g., "1h 23m 45s")
    - Relative timestamp display (e.g., "2h ago")
  - CallList component with virtualized scrolling
    - Filter buttons by call type (All, Incoming, Outgoing, Missed, Rejected)
    - Call count badges on filter buttons
    - Load more pagination support
  - Conversation view tabs to switch between Messages and Calls
    - Tab bar in conversation header
    - Message and call counts displayed on tabs
    - Automatic tab reset when switching conversations
- **Phase 8: Export & Copy**
  - useSelection hook for message selection
    - Single click selection
    - Shift+click for range selection
    - Ctrl/Cmd+click for multi-selection
    - Select all and clear selection functions
  - Context menu component for messages
    - Copy, select, export menu options
    - Position adjustment for viewport boundaries
    - Keyboard escape to close
  - Clipboard utility functions
    - Copy single or multiple messages
    - Format options: timestamps, contact names, direction
    - Copy body only option
  - ExportDialog component with format selection
    - Formats: Plain Text, CSV, JSON, HTML
    - Scope: Selected messages, entire conversation, search results
    - Options: Include timestamps, include contact names
    - Export summary preview
  - Export IPC handlers in main process
    - Plain text export with timestamps and contact names
    - CSV export with proper escaping
    - JSON export with ISO timestamps
    - HTML export with styled message bubbles
    - Save dialog integration
- **Phase 9: Multi-Backup Support**
  - Import History dialog showing all imported backups
    - File path, import date, message/call counts
    - Type badge (SMS/Calls)
    - Backup date information
  - Toolbar button for quick access to import history
- **Phase 10: Polish & Settings**
  - Settings dialog with user preferences
    - Date/time format options (12h/24h)
    - Date style options (US/EU/ISO)
    - Theme selection (Dark/Light/System)
    - Behavior options (message preview, auto-scroll, confirmations)
  - Settings store with localStorage persistence
  - About dialog with app information and features list
  - Toast notification system
    - Success, error, warning, info toast types
    - Auto-dismiss with configurable duration
    - Manual dismiss option
  - Enhanced keyboard shortcuts
    - Ctrl/Cmd+O: Open file dialog
    - Ctrl/Cmd+F: Toggle search panel
    - Ctrl/Cmd+,: Open settings
    - Escape: Close dialogs and search
  - Toolbar buttons for Settings, History, and About dialogs
- Launch scripts for easy startup
  - `run.bat` - Windows batch script
  - `run.ps1` - Windows PowerShell script
  - `run.sh` - Linux/macOS shell script

### Changed
- **MAJOR:** Upgraded React from v18 to v19 (latest major version with improved performance)
- **MAJOR:** Upgraded Tailwind CSS from v3 to v4 (CSS-first configuration, better performance)
- **MAJOR:** Upgraded Vite from v5 to v7 (faster builds and HMR)
- **MAJOR:** Upgraded Electron from v28 to v39 (latest, fixes ASAR integrity bypass vulnerability)
- **MAJOR:** Upgraded electron-builder from v25 to v26 (latest major version)
- Upgraded ESLint from v8 to v9 (latest) with flat config format (eslint.config.mjs)
- Upgraded esbuild from v0.19 to v0.27 (latest, fixes development server security issue)
- Upgraded better-sqlite3 from v9 to v12 (latest with better Windows prebuilt binaries)
- Upgraded TypeScript from v5.3 to v5.9 (latest)
- Upgraded Zustand from v4 to v5 (latest state management)
- Upgraded all @types packages to match new React 19 and latest versions
- Updated all other dependencies to absolute latest stable versions
- Migrated Tailwind config to v4 CSS-first format with `@import "tailwindcss"`
- Added .npmrc configuration for legacy peer deps compatibility

### Fixed
- **better-sqlite3 native module version mismatch**: Added @electron/rebuild dependency with postinstall script to automatically rebuild native modules for Electron's Node.js version
- **Production build path incorrect**: Fixed renderer path from `'../renderer/index.html'` to `'renderer/index.html'` in main process
- **Dev mode doesn't auto-start Electron**: Added wait-on and cross-env dependencies with dev:electron script to automatically launch Electron after Vite server is ready

[1.0.1]: https://github.com/yourusername/phone-sms-viewer/releases/tag/v1.0.1
[1.0.0]: https://github.com/yourusername/phone-sms-viewer/releases/tag/v1.0.0
