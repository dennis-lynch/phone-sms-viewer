# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phone SMS Viewer is a cross-platform desktop application (Windows/Linux) built with Electron + TypeScript + React to browse and search SMS and call log backups from "SMS Backup & Restore Pro" Android app.
## IMPORTANT: USE LATEST EXTERNAL LIBRARIES
Always use the latest up-to-date libraries for dependencies.  Do not use older versions that may be deprecated or buggy.  Search the web for the newest versions if needed.

## Commands

### Development
- `npm run dev` - Run application in development mode with hot reload
- `npm run lint` - Run ESLint to check code quality
- `npm run type-check` - Run TypeScript type checking without emitting files

### Building
- `npm run build` - Build both main and renderer processes for production
- `npm run build:main` - Build only the main process (Electron backend)
- `npm run build:renderer` - Build only the renderer process (React frontend)

### Packaging
- `npm run package` - Create distributable packages for current platform
- `npm run package:win` - Package for Windows (NSIS installer + portable)
- `npm run package:linux` - Package for Linux (AppImage + deb)

### Running
- `npm start` - Start the application (must run `npm run build` first)

## Architecture

### High-Level Structure

This is an Electron application with three main processes:

1. **Main Process** (`src/main/`): Node.js backend
   - Database management (SQLite with better-sqlite3)
   - XML parsing (streaming parser for large files)
   - File I/O operations
   - IPC handlers for communication with renderer

2. **Renderer Process** (`src/renderer/`): React frontend
   - UI components (Tailwind CSS + shadcn/ui)
   - State management (Zustand)
   - Virtualized lists (TanStack Virtual)
   - Service layer for IPC communication

3. **Preload Script** (`src/preload/`): Security bridge
   - Exposes safe IPC API via contextBridge
   - Isolates main process from renderer

### Data Flow

1. User selects backup file (ZIP or XML)
2. Main process extracts and streams XML parsing
3. Streaming SAX parser processes messages incrementally
4. Messages are deduplicated and inserted into SQLite database
5. Renderer queries database via IPC for display
6. UI renders conversations with virtual scrolling for performance

### Database (SQLite)

- **Storage**: better-sqlite3 (synchronous, faster than async)
- **Search**: FTS5 (Full-Text Search) for fast message searching
- **Deduplication**: UNIQUE constraints on composite keys prevent duplicate imports
  - Messages: `(timestamp, normalized_phone, body_hash)`
  - Calls: `(timestamp, phone_number, duration, type)`

### Phone Number Normalization

Multiple phone number formats are normalized to canonical E.164 format:
- `+14084255283` (already E.164) → `+14084255283`
- `14084255283` (11 digits, US) → `+14084255283`
- `4084255283` (10 digits, US) → `+14084255283`

This ensures conversations are correctly grouped even if phone numbers vary in format across backups.

### XML Parsing Strategy

- **Streaming parser** (sax-stream): Processes large files (47MB+) without loading entire file into memory
- **Progressive import**: Inserts batches of 1000 messages at a time with progress updates
- **HTML entity decoding**: Converts `&#128514;` to emoji, `&lt;3` to `<3`, etc.

### Virtual Scrolling

For performance with 20k+ messages:
- **TanStack Virtual**: Only renders visible items + overscan
- **Dynamic heights**: Measures actual message heights for accurate scrolling
- **Lazy loading**: Loads messages in chunks (500 at a time)

## IMPORTANT: CHANGELOG Requirement

**When adding features, fixing bugs, or making any changes, ALWAYS update CHANGELOG.md using semantic versioning:**

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, backwards compatible

Follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:
- Add entry under new version number.  Use semantic versioning to increase the number as appropriate (MAJOR, MINOR, PATCH)
- Use categories: Added, Changed, Deprecated, Removed, Fixed, Security


Example:
```markdown
## [Unreleased]

### Added
- Search feature with regex support

### Fixed
- Bug where emoji weren't rendering correctly
```

## Data Formats

### SMS/MMS Backup (XML)
- Root: `<smses count="20166" backup_set="uuid" type="full">`
- Messages are NOT pre-grouped - app groups by normalized phone number
- SMS: `<sms address="+1234" date="timestamp" type="1|2" body="text" />`
  - type: 1=Received, 2=Sent
- MMS: `<mms><parts><part text="..." /></parts><addrs><addr address="+1234" /></addrs></mms>`

### Calls Backup (XML)
- Root: `<calls count="2000" backup_set="uuid">`
- Call: `<call number="+1234" duration="37" date="timestamp" type="1|2|3|5" />`
  - type: 1=Incoming, 2=Outgoing, 3=Missed, 5=Rejected

## Development Guidelines

- **No malware code**: This app handles sensitive personal data (messages, call logs). Security is paramount.
- **Performance**: Large backups (20k+ messages) must load smoothly without UI lag
- **Deduplication**: When importing multiple backups, duplicates are automatically skipped
- **Error handling**: Parse errors should be graceful - show what was successfully imported
