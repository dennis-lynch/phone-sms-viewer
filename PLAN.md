# Implementation Plan: Phone SMS Viewer

## Overview
Create a cross-platform desktop application (Windows/Linux) using Electron + TypeScript + React to browse and search SMS and call log backups from "SMS Backup & Restore Pro" Android app.

## Tech Stack
- **Framework**: Electron 28+ with TypeScript 5+
- **UI**: React 18 + TanStack Virtual (virtualization) + Tailwind CSS + shadcn/ui
- **State**: Zustand for state management
- **Database**: SQLite with better-sqlite3 (FTS5 for search)
- **XML Parsing**: sax-stream (streaming parser for large files)
- **ZIP Handling**: adm-zip
- **Build**: Vite (renderer) + esbuild (main process)
- **Packaging**: electron-builder

## XML Data Structure (from examples/)

### SMS Format (`sms-20260111012318.xml`)
- Root: `<smses count="20166" backup_set="uuid" backup_date="timestamp" type="full">`
- SMS: `<sms address="+1234" date="timestamp" type="1|2" body="text" contact_name="Name" />`
  - type: 1=Received, 2=Sent
- MMS: `<mms ...><parts>...</parts><addrs>...</addrs></mms>` (more complex, with media parts)
- Messages NOT grouped by conversation - app must group by phone number
- HTML entities in body text (&#128514; for emoji, etc.)
- Files can be 47MB+ with 20k+ messages

### Calls Format (`calls-2020-01-05_03-00-32.xml`)
- Root: `<calls count="2000" backup_set="uuid" backup_date="timestamp">`
- Call: `<call number="+1234" duration="37" date="timestamp" type="1|2|3|5" contact_name="Name" />`
  - type: 1=Incoming, 2=Outgoing, 3=Missed, 5=Rejected

## Implementation Phases

### Phase 0: Project Setup
**Goal**: Initialize project with proper tooling and configuration

1. **Initialize Electron + TypeScript project**
   - Set up package.json with all dependencies
   - Configure tsconfig.json (separate for main/renderer)
   - Set up Vite for renderer bundling
   - Configure esbuild for main process
   - Set up electron-builder configuration

2. **Create project structure**
   ```
   src/
   ├── main/              # Electron main process
   │   ├── index.ts
   │   ├── database/      # SQLite schema, queries
   │   ├── parsers/       # XML/ZIP parsers
   │   └── ipc/           # IPC handlers
   ├── renderer/          # React app
   │   ├── App.tsx
   │   ├── components/
   │   ├── hooks/
   │   ├── store/
   │   └── services/
   ├── preload/           # contextBridge
   └── shared/            # Shared types
   ```

3. **Configure development environment**
   - Set up Tailwind CSS + shadcn/ui
   - Configure ESLint + Prettier
   - Add dev scripts (dev, build, package)
   - Set up hot module reloading

4. **Create documentation files**
   - **CHANGELOG.md**: Initialize with v0.1.0 and semantic versioning format
   - **SETUP.md**: Step-by-step instructions for running the app locally
   - **.gitignore**: Add node_modules, dist, release, .env, *.db, temp files, OS files, IDE files

5. **Update CLAUDE.md**
   - Add build commands: `npm run dev`, `npm run build`, `npm run package`
   - Add test commands (when tests are added)
   - Document architecture: Electron main/renderer split, SQLite storage, streaming parsers
   - Add requirement to update CHANGELOG.md using semantic versioning for every change
   - Document XML structure and phone number normalization strategy

### Phase 1: Core Data Layer
**Goal**: Parse XML files and store in SQLite database

1. **Database schema** (`src/main/database/schema.ts`)
   - Conversations table (id, phone_number, contact_name, message_count, last_message_date)
   - Messages table (id, conversation_id, type, direction, body, body_hash, timestamp, normalized_phone)
     - **UNIQUE constraint**: `(timestamp, normalized_phone, body_hash)` for deduplication
   - Messages FTS5 virtual table for full-text search
   - Calls table (id, conversation_id, phone_number, contact_name, timestamp, duration, type)
     - **UNIQUE constraint**: `(timestamp, phone_number, duration, type)` for deduplication
   - Metadata table (for backup tracking, stores imported file paths and backup_set UUIDs)
   - Indexes on timestamp, conversation_id, phone_number

2. **Database initialization** (`src/main/database/database.ts`)
   - Create connection with better-sqlite3
   - Set up WAL mode, cache size, optimizations
   - Register REGEXP function for regex search
   - Create tables and indexes

3. **Prepared queries** (`src/main/database/queries.ts`)
   - Insert conversation, message, call
   - Get conversations (sorted by last message)
   - Get messages by conversation_id
   - Search messages (FTS5 + filters)
   - Get calls by phone number

4. **XML streaming parser** (`src/main/parsers/sms-parser.ts`)
   - Use sax-stream for memory-efficient parsing
   - Parse SMS and MMS elements
   - Decode HTML entities (&#128514; → emoji)
   - Emit progress events every 1000 messages
   - Handle malformed XML gracefully

5. **Phone number normalization** (`src/main/utils/phone-normalizer.ts`)
   - Normalize formats: +14084255283, 14084255283, 4084255283 → +14084255283
   - Group conversations by normalized number
   - Keep original for display

6. **ZIP extraction** (`src/main/parsers/zip-extractor.ts`)
   - Extract XML from ZIP to memory stream
   - Detect backup type (SMS vs calls) from filename or content
   - Handle corrupted ZIPs

7. **Deduplication utilities** (`src/main/utils/deduplication.ts`)
   - Generate SHA-256 hash of message body
   - Create composite deduplication key (timestamp + normalized_phone + body_hash)
   - Check if message/call already exists in database
   - Track statistics: total parsed, duplicates skipped, new messages added

8. **Conversation grouping logic**
   - Parse all messages, normalize phone numbers
   - Group by normalized number
   - Use most recent contact_name (prefer non-"(Unknown)")
   - Calculate message_count, first/last dates
   - Insert into conversations table
   - Apply deduplication during insertion (INSERT OR IGNORE or check before insert)

### Phase 2: IPC & File Loading
**Goal**: Connect main process parsers to renderer UI

1. **Preload script** (`src/preload/index.ts`)
   - Expose safe IPC API via contextBridge
   - Methods: openFile, importBackup, getConversations, getMessages, search, export

2. **IPC handlers** (`src/main/ipc/file-handlers.ts`)
   - Handle 'open-file-dialog' - show file picker for ZIP/XML
   - Handle 'import-backup' - parse file, populate database
   - Emit progress events during import
   - Handle errors gracefully

3. **File service** (`src/renderer/services/fileService.ts`)
   - Wrapper around IPC calls
   - TypeScript types for all requests/responses
   - Handle loading states and errors

4. **Loading UI**
   - Progress modal during import
   - Show: "Parsing messages... 5,432 / 20,166 (27%)"
   - Cancel button (send IPC cancel event)
   - Error display with retry option

### Phase 3: Basic UI & Conversation List
**Goal**: Display conversations and basic message thread

1. **App layout** (`src/renderer/components/layout/AppLayout.tsx`)
   - Menu bar (File, Edit, View, Search, Settings)
   - Sidebar for conversation list (250px wide, resizable)
   - Main content area for message thread
   - Status bar

2. **Conversation list** (`src/renderer/components/conversations/ConversationList.tsx`)
   - Fetch conversations on mount
   - Display: contact name, last message preview, timestamp
   - Click to select conversation
   - Highlight selected conversation

3. **Conversation item** (`src/renderer/components/conversations/ConversationItem.tsx`)
   - Avatar (first letter of contact name)
   - Contact name
   - Last message preview (truncated to 60 chars)
   - Timestamp (relative: "2 hours ago" or absolute: "Jul 24")
   - Message count badge

4. **Message thread** (`src/renderer/components/messages/MessageThread.tsx`)
   - Fetch messages for selected conversation
   - Display messages in chronological order
   - Scroll to bottom on load
   - Header with contact name and phone number

5. **Message bubble** (`src/renderer/components/messages/MessageBubble.tsx`)
   - Different styles for sent (blue, right) vs received (gray, left)
   - Show timestamp on hover or below message
   - Display message body with proper text wrapping
   - Render emoji correctly

6. **State management** (`src/renderer/store/appStore.ts`)
   - Zustand store for:
     - Selected conversation ID
     - Conversations list
     - Messages for active conversation
     - Loading states
     - Error states

### Phase 4: Virtualization & Performance
**Goal**: Handle large datasets (20k+ messages) smoothly

1. **Virtualized conversation list**
   - Use TanStack Virtual (react-virtual)
   - Estimate item size: 72px
   - Overscan: 10 items
   - Smooth scrolling

2. **Virtualized message thread**
   - Use TanStack Virtual
   - Variable item heights (messages vary in length)
   - Measure actual heights dynamically
   - Overscan: 20 messages

3. **Message grouping by date**
   - Group consecutive messages by day
   - Show date separator: "[2024-07-24]"
   - Group messages from same sender within 5 minutes

4. **Lazy loading**
   - Load initial 500 messages for conversation
   - Load more on scroll to top
   - "Load earlier messages" button

5. **Database optimizations**
   - Use transactions for bulk inserts
   - Batch queries where possible
   - Add indexes on frequently queried fields
   - Run ANALYZE after import

6. **Memory management**
   - Unload messages when switching conversations
   - Clear search results when closed
   - Limit conversation list to 1000 initially

### Phase 5: Search Functionality
**Goal**: Advanced search with filters

1. **Search bar** (`src/renderer/components/search/SearchBar.tsx`)
   - Text input with debounce (300ms)
   - Clear button
   - Regex toggle checkbox
   - Search on Enter or auto-search

2. **Search filters** (`src/renderer/components/search/SearchFilters.tsx`)
   - Date range picker (start/end dates)
   - Contact dropdown (all unique contacts)
   - Message type radio: All / Sent / Received
   - Apply/Clear filters buttons

3. **Search query builder** (`src/main/database/queries.ts`)
   - Build SQL query based on filters
   - Use FTS5 for text search: `messages_fts MATCH ?`
   - Use REGEXP for regex search
   - Add WHERE clauses for filters
   - Return highlighted results: `highlight(messages_fts, 0, '<mark>', '</mark>')`

4. **Search results view** (`src/renderer/components/search/SearchResults.tsx`)
   - Display matching messages with context
   - Show: contact name, message body (highlighted), timestamp
   - Click to jump to message in conversation
   - Group by conversation
   - Limit to 500 results initially

5. **Search state** (`src/renderer/store/searchStore.ts`)
   - Search query
   - Filters (dateRange, contact, messageType, useRegex)
   - Results array
   - Loading state

6. **Search IPC handlers** (`src/main/ipc/search-handlers.ts`)
   - Handle 'search-messages' request
   - Execute search query with filters
   - Return results with highlights
   - Handle regex errors gracefully

### Phase 6: Date Navigation
**Goal**: Jump to specific dates in conversation

1. **Date jumper button** (`src/renderer/components/messages/DateJumper.tsx`)
   - Floating action button: "📅 Jump to Date"
   - Opens date picker modal on click

2. **Date picker modal**
   - Calendar view for date selection
   - Year/month dropdowns for faster navigation
   - Quick buttons: "Oldest" / "Newest"
   - "Go" button to jump

3. **Scroll-to-date logic**
   - Find first message on selected date
   - Scroll to that message in virtualized list
   - Highlight message briefly (fade animation)

4. **Timeline navigation**
   - Optional: Timeline slider showing date range
   - Drag to scrub through conversation by date
   - Show tooltip with date on hover

### Phase 7: Call Logs
**Goal**: Display and browse call history

1. **Calls parser** (`src/main/parsers/calls-parser.ts`)
   - Parse calls XML with sax-stream
   - Map type codes: 1=Incoming, 2=Outgoing, 3=Missed, 5=Rejected
   - Insert into calls table
   - Link to conversations by phone number

2. **Call list view** (`src/renderer/components/calls/CallList.tsx`)
   - Table/list of calls
   - Columns: Contact, Type (icon), Duration, Date/Time
   - Filter by type (incoming/outgoing/missed)
   - Click to view conversation

3. **Call item** (`src/renderer/components/calls/CallItem.tsx`)
   - Icon for call type (📞 incoming, 📲 outgoing, 📵 missed)
   - Duration formatted (1m 23s)
   - Timestamp
   - Click to open conversation

4. **Integrate calls in conversation view**
   - Show calls inline with messages (optional)
   - Or separate "Calls" tab in conversation header

### Phase 8: Export & Copy
**Goal**: Copy and export messages

1. **Message selection** (`src/renderer/hooks/useSelection.ts`)
   - Checkbox mode toggle in toolbar
   - Click message to select (add to selection array)
   - Shift+click to select range
   - Cmd/Ctrl+A to select all visible

2. **Context menu** (right-click on message)
   - Copy message
   - Copy with context (N messages before/after)
   - Export selection
   - Select message

3. **Copy functionality** (`src/renderer/utils/clipboard.ts`)
   - Format: `[2024-07-24 10:33:56 PM] Mom: So how's it going?!`
   - Copy single or multiple messages
   - Copy to clipboard (navigator.clipboard API)

4. **Export dialog** (`src/renderer/components/export/ExportDialog.tsx`)
   - Format dropdown: Plain Text / CSV / JSON / HTML
   - Options: Include timestamps, contact names
   - Scope: Selected messages / Entire conversation / Search results
   - Export button (trigger IPC)

5. **Export handlers** (`src/main/ipc/export-handlers.ts`)
   - Generate file in selected format
   - Show save dialog
   - Write file to disk
   - Return success/error

6. **Export formats**
   - **Plain text**: One message per line with timestamp
   - **CSV**: Columns: Timestamp, Contact, Direction, Body
   - **JSON**: Structured array of message objects
   - **HTML**: Styled like iMessage export (bonus)

### Phase 9: Multi-Backup Support
**Goal**: Load and manage multiple backups

1. **Directory scanning**
   - File → Open Directory
   - Scan for all .zip and .xml files
   - Detect type (SMS vs calls) from filename
   - Show list of found backups

2. **Backup metadata tracking**
   - Store backup_set UUID in metadata table
   - Track which files have been imported
   - Detect duplicates by UUID

3. **Deduplication strategy** (`src/main/utils/deduplication.ts`)
   - **Message uniqueness**: Composite key of `(timestamp, normalized_phone_number, body_hash)`
   - **Hash function**: SHA-256 hash of message body (handles identical messages)
   - **Detection**: Before inserting, check if message with same key exists
   - **Calls uniqueness**: `(timestamp, phone_number, duration, type)` composite key
   - **Behavior**: Silently skip duplicates (no error, just don't insert)
   - **Logging**: Track number of duplicates skipped during import
   - **Database constraint**: Add UNIQUE index on deduplication keys

4. **Merge/replace logic**
   - When importing backup with same backup_set UUID:
     - Prompt user: "This backup was previously imported. Merge new messages or replace all?"
     - **Merge**: Import only messages not already in database (use deduplication keys)
     - **Replace**: Clear all data, reimport from scratch
   - When importing different backup files (different UUIDs):
     - Always merge, using deduplication to avoid duplicates
     - Show summary: "Imported 234 new messages, skipped 1,823 duplicates"

5. **Multi-file import workflow**
   - File → Import Multiple Files
   - Select multiple ZIP/XML files
   - Process sequentially, deduplicating across all files
   - Show progress: "Processing file 2 of 5... (1,234 messages, 432 duplicates)"
   - Final summary: "Total: 8,456 messages imported, 2,109 duplicates skipped"

6. **Backup switcher UI** (optional enhancement)
   - Dropdown in menu bar: "Active Backup: sms-2024-07-24.zip"
   - Switch between loaded backups
   - Show backup date and message count

### Phase 10: Polish & Settings
**Goal**: Final UX improvements and configuration

1. **Settings dialog**
   - Default file/directory location
   - Date format preference (12h/24h, US/EU)
   - Theme: Light / Dark / System
   - Auto-import on startup

2. **Dark mode**
   - CSS variables for colors
   - Toggle in View menu
   - Persist preference

3. **Error handling**
   - Toast notifications for errors
   - Graceful degradation on parse errors
   - Retry options for failed operations
   - Clear error messages

4. **Empty states**
   - No backup loaded: "Click File → Open Backup to get started"
   - No search results: "No messages found. Try different keywords."
   - No messages in conversation: "(No messages)"

5. **Keyboard shortcuts**
   - Cmd/Ctrl+O: Open file
   - Cmd/Ctrl+F: Focus search
   - Cmd/Ctrl+C: Copy selected
   - Esc: Clear search / close modals
   - ↑/↓: Navigate conversations

6. **Help documentation**
   - Help → Documentation (link to README)
   - Help → About (version, credits)
   - Tooltips on UI elements

## Critical Files to Create

### Main Process
- `src/main/index.ts` - Main process entry point
- `src/main/database/schema.ts` - Database schema and initialization
- `src/main/database/database.ts` - Database connection management
- `src/main/database/queries.ts` - All SQL queries and prepared statements
- `src/main/parsers/sms-parser.ts` - SMS XML streaming parser
- `src/main/parsers/calls-parser.ts` - Calls XML streaming parser
- `src/main/parsers/zip-extractor.ts` - ZIP file handling
- `src/main/ipc/file-handlers.ts` - File open/import IPC handlers
- `src/main/ipc/search-handlers.ts` - Search IPC handlers
- `src/main/ipc/export-handlers.ts` - Export IPC handlers
- `src/main/utils/phone-normalizer.ts` - Phone number normalization
- `src/main/utils/html-entities.ts` - HTML entity decoding
- `src/main/utils/deduplication.ts` - Message/call deduplication logic and hashing

### Renderer Process
- `src/renderer/App.tsx` - Root React component
- `src/renderer/index.tsx` - Renderer entry point
- `src/renderer/components/layout/AppLayout.tsx` - Main app layout
- `src/renderer/components/layout/Sidebar.tsx` - Conversation list sidebar
- `src/renderer/components/conversations/ConversationList.tsx` - Virtualized conversation list
- `src/renderer/components/conversations/ConversationItem.tsx` - Single conversation item
- `src/renderer/components/messages/MessageThread.tsx` - Virtualized message thread
- `src/renderer/components/messages/MessageBubble.tsx` - Message bubble component
- `src/renderer/components/messages/DateJumper.tsx` - Date navigation control
- `src/renderer/components/search/SearchBar.tsx` - Search input
- `src/renderer/components/search/SearchFilters.tsx` - Advanced search filters
- `src/renderer/components/search/SearchResults.tsx` - Search results view
- `src/renderer/components/export/ExportDialog.tsx` - Export options modal
- `src/renderer/store/appStore.ts` - Global state (Zustand)
- `src/renderer/store/searchStore.ts` - Search state
- `src/renderer/services/fileService.ts` - File operations IPC wrapper
- `src/renderer/services/searchService.ts` - Search operations IPC wrapper

### Shared
- `src/preload/index.ts` - contextBridge IPC API exposure
- `src/shared/types.ts` - TypeScript types shared between main/renderer

### Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - Base TypeScript config
- `tsconfig.main.json` - Main process TypeScript config
- `tsconfig.renderer.json` - Renderer process TypeScript config
- `vite.config.ts` - Vite bundler config for renderer
- `electron-builder.json` - Packaging configuration
- `tailwind.config.js` - Tailwind CSS config
- `.gitignore` - Git ignore rules

### Documentation
- `SETUP.md` - Installation and setup instructions
- `CHANGELOG.md` - Version history with semantic versioning
- `CLAUDE.md` - Updated with build commands, architecture, and CHANGELOG requirements
- `README.md` - Project overview and usage

## Key Architectural Decisions

1. **SQLite for storage**: Fast queries, FTS5 search, no external dependencies
2. **Streaming XML parser**: Handle 47MB+ files without memory issues
3. **TanStack Virtual**: Smooth scrolling with 20k+ messages
4. **Zustand for state**: Simpler than Redux, better than Context
5. **better-sqlite3**: Synchronous API, avoids async complexity in main process
6. **Phone number normalization**: Group conversations correctly despite format variations
7. **Read directly from ZIP**: No temp file extraction needed (unless file >100MB)
8. **Automatic deduplication**: UNIQUE constraints + composite keys prevent duplicate messages when importing multiple backup files

## Documentation Requirements

### .gitignore Contents
```
# Dependencies
node_modules/

# Build outputs
dist/
release/
out/

# Database files
*.db
*.db-wal
*.db-shm

# Environment
.env
.env.local

# Temp files
*.log
*.tmp
temp/

# OS files
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo

# Package lock (optional - keep if using npm, remove if using yarn/pnpm)
# package-lock.json
```

### CLAUDE.md Updates
Add these sections:
- **Commands**: `npm run dev`, `npm run build`, `npm run package`, `npm test`
- **Architecture**: Electron main/renderer split, SQLite with FTS5, streaming XML parser, virtualized UI
- **Phone Number Normalization**: Multiple formats → canonical +E.164 format
- **CHANGELOG Requirement**: "When adding features or fixing bugs, always update CHANGELOG.md using semantic versioning (MAJOR.MINOR.PATCH). Follow Keep a Changelog format."

### SETUP.md Structure
1. Prerequisites (Node.js 20+, npm/yarn)
2. Installation steps (`git clone`, `npm install`)
3. Running locally (`npm run dev`)
4. Building for production (`npm run build && npm run package`)
5. Loading backup files (where to find example files)
6. Troubleshooting common issues

### CHANGELOG.md Initial Content
```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - YYYY-MM-DD

### Added
- Initial project setup with Electron, TypeScript, and React
- XML parser for SMS Backup & Restore Pro format
- SQLite database for message storage
- Basic conversation list and message thread views

[Unreleased]: https://github.com/yourusername/phone-sms-viewer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/phone-sms-viewer/releases/tag/v0.1.0
```

## Testing Strategy

1. **Unit tests** (Jest)
   - Phone number normalization
   - HTML entity decoding
   - Date formatting utilities

2. **Integration tests**
   - XML parser with sample files
   - Database queries
   - Search with various filters

3. **Manual testing checklist**
   - Load small backup (< 100 messages)
   - Load large backup (20k+ messages)
   - Search with text, regex, filters
   - Export messages in all formats
   - Navigate by date
   - UI performance with large datasets

## Success Criteria

- ✅ Loads 46MB XML file in < 10 seconds
- ✅ Smooth scrolling through 20k+ messages
- ✅ Search returns results in < 1 second
- ✅ UI responsive, no lag when typing
- ✅ Correctly groups messages by phone number
- ✅ Handles all emoji and special characters
- ✅ Export works for all formats
- ✅ Runs on Windows and Linux
- ✅ Package size < 100MB

## Future Enhancements (Post-MVP)

- MMS media display (images/videos inline)
- Statistics dashboard (message counts, charts)
- Merge multiple backups automatically
- Cloud sync option
- PDF export
- Message editing (fix typos)
- Conversation notes
- Backup scheduling
