# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

## [0.1.0] - TBD

### Added
- Initial release (planned)
- XML parser for SMS Backup & Restore Pro format
- SQLite database for message storage
- Basic conversation list and message thread views
- Advanced search with filters
- Export functionality

[Unreleased]: https://github.com/yourusername/phone-sms-viewer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/phone-sms-viewer/releases/tag/v0.1.0
