# phone-sms-viewer

A cross-platform desktop app (Windows/Linux) for browsing and searching SMS, MMS, and call log backups from the [SMS Backup & Restore Pro](https://play.google.com/store/apps/details?id=com.riteshsahu.SMSBackupRestorePro) Android app.

Built with Electron + TypeScript + React.

## Features

- Import ZIP or XML backup files (SMS, MMS, call logs)
- Browse conversations grouped by contact/phone number
- Full-text search with regex support across all messages
- View call logs with type indicators (incoming/outgoing/missed/rejected)
- Export messages as Plain Text, CSV, JSON, or HTML
- Copy selected messages to clipboard
- Virtual scrolling — handles 20,000+ messages without UI lag
- Automatic deduplication when importing multiple backups
- Phone number normalization to E.164 format for consistent grouping
- Streaming XML parser — processes 47MB+ files without loading into memory

## Requirements

- **Node.js** 20+ (LTS recommended)
- **npm** 11+
- **Windows**: [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with the "Desktop development with C++" workload (required for native SQLite module)
- **Linux**: `build-essential` package

## Installation

```bash
git clone <repository-url>
cd phone-sms-viewer
npm install
```

`npm install` automatically rebuilds native modules for Electron. If you see a version mismatch error, run:

```bash
npm run rebuild
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start in development mode with hot reload |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |
| `npm run build` | Build for production (main + renderer) |
| `npm run build:main` | Build main process only |
| `npm run build:renderer` | Build renderer process only |
| `npm run package` | Create distributable for current platform |
| `npm run package:win` | Windows NSIS installer + portable EXE |
| `npm run package:linux` | Linux AppImage + DEB |
| `npm start` | Run the built app (requires `npm run build` first) |

## Usage

### Importing a Backup

1. Launch the app (`npm run build && npm start` or open the packaged installer)
2. Press **Ctrl+O** or use **File → Open Backup**
3. Select a `.xml` or `.zip` backup file
4. An import progress dialog shows status — large files may take a few seconds

You can import multiple backups; duplicate messages are automatically skipped.

### Navigating

- The left sidebar lists all conversations sorted by most recent message
- Click a conversation to open the message thread
- Use the **Calls** tab in a conversation to view call history with that contact
- The **date jumper** button (bottom-right) lets you jump to a specific date

### Searching

- Press **Ctrl+F** to open the search panel
- Supports full-text search across all messages
- Toggle **Regex** to use regular expressions
- Filter by date range or message direction (sent/received)

### Exporting

- Right-click any message bubble to export it
- Select multiple messages and right-click for bulk export
- Formats: Plain Text, CSV, JSON, HTML

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+O | Open backup file |
| Ctrl+F | Toggle search panel |
| Ctrl+, | Open settings |
| Escape | Close dialogs / search |

## Supported Backup Formats

Both raw XML and ZIP-compressed backups are supported.

### SMS/MMS Backup (`sms-*.xml`)

```xml
<smses count="20166" backup_set="uuid" type="full">
  <!-- SMS message -->
  <sms address="+14084255283" date="1609459200000" type="1" body="Hello!" />
  <!-- type: 1=Received, 2=Sent -->

  <!-- MMS message -->
  <mms date="1609459200000">
    <parts><part text="Photo message" /></parts>
    <addrs><addr address="+14084255283" type="137" /></addrs>
  </mms>
</smses>
```

### Calls Backup (`calls-*.xml`)

```xml
<calls count="2000" backup_set="uuid">
  <call number="+14084255283" duration="37" date="1609459200000" type="1" />
  <!-- type: 1=Incoming, 2=Outgoing, 3=Missed, 5=Rejected -->
</calls>
```

## Project Structure

```
src/
├── main/                         # Electron main process (Node.js)
│   ├── index.ts                  # App entry, window creation, menu
│   ├── database/
│   │   ├── schema.ts             # SQLite table definitions, FTS5 setup
│   │   ├── database.ts           # DB connection, initialization
│   │   └── queries.ts            # All SQL queries (conversations, messages, search)
│   ├── ipc/
│   │   ├── index.ts              # Registers all IPC handlers
│   │   ├── file-handlers.ts      # File open dialog, import dispatch
│   │   ├── database-handlers.ts  # Query handlers (conversations, messages, search)
│   │   └── export-handlers.ts    # Message export in various formats
│   ├── parsers/
│   │   ├── sms-parser.ts         # XML → SMS/MMS row insertion
│   │   ├── calls-parser.ts       # XML → call log row insertion
│   │   └── zip-extractor.ts      # ZIP extraction before parsing
│   └── utils/
│       ├── phone-normalizer.ts   # Normalize phone numbers to E.164
│       ├── deduplication.ts      # Composite key dedup logic
│       └── html-entities.ts      # Decode &#128514; → emoji etc.
│
├── preload/
│   └── index.ts                  # contextBridge: exposes window.electronAPI to renderer
│
├── renderer/                     # React frontend
│   ├── App.tsx                   # Root component, keyboard shortcut handlers
│   ├── store/
│   │   ├── appStore.ts           # Main Zustand store (conversations, selection, loading)
│   │   ├── searchStore.ts        # Search state (query, filters, results)
│   │   ├── settingsStore.ts      # User preferences (theme, font size)
│   │   └── toastStore.ts         # Toast notification queue
│   ├── services/
│   │   ├── fileService.ts        # IPC calls for file import
│   │   └── databaseService.ts    # IPC calls for queries/export
│   ├── components/
│   │   ├── layout/AppLayout.tsx  # Resizable sidebar + main area
│   │   ├── conversations/        # ConversationList, ConversationItem
│   │   ├── messages/             # MessageThread, MessageBubble, DateJumper, ContextMenu
│   │   ├── calls/                # CallList, CallItem
│   │   ├── search/               # SearchPanel, SearchBar, SearchFilters, SearchResults
│   │   ├── import/               # ImportProgressModal
│   │   ├── export/               # ExportDialog
│   │   ├── settings/             # SettingsDialog, AboutDialog, ImportHistoryDialog
│   │   └── ui/                   # Toast
│   └── hooks/
│       └── useSelection.ts       # Multi-select logic for messages
│
└── shared/
    └── types.ts                  # TypeScript interfaces shared across processes
```

## Architecture

### Three Processes

**Main process** (`src/main/`) — Node.js backend. Owns the SQLite database, parses XML files, handles all file I/O, and exposes functionality to the renderer via IPC.

**Renderer process** (`src/renderer/`) — React frontend. Communicates with main exclusively through `window.electronAPI` (the preload bridge). Never touches files or the database directly.

**Preload script** (`src/preload/index.ts`) — Security bridge. Uses Electron's `contextBridge` to expose a safe, typed API surface. Keeps Node.js APIs isolated from web content.

### Data Flow

```
User opens file
  → file-handlers.ts detects type (zip/xml)
  → zip-extractor.ts unpacks if needed
  → sms-parser.ts / calls-parser.ts streams XML with fast-xml-parser
  → Batches of 1000 rows inserted into SQLite (with deduplication)
  → IPC progress events update ImportProgressModal in renderer
  → On completion, renderer reloads conversation list from DB
```

### Database

SQLite via `better-sqlite3` (synchronous — no async overhead). Key tables:

- `messages` — SMS/MMS rows; UNIQUE on `(timestamp, normalized_phone, body_hash)`
- `calls` — call log rows; UNIQUE on `(timestamp, phone_number, duration, type)`
- `messages_fts` — FTS5 virtual table for full-text search

### Phone Number Normalization

All phone numbers are normalized to E.164 on insert so conversations group correctly regardless of format variation across backups:

```
+14084255283  →  +14084255283  (already canonical)
14084255283   →  +14084255283  (11-digit US)
4084255283    →  +14084255283  (10-digit US)
```

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Desktop shell | Electron | 39.x |
| Frontend | React | 19.x |
| Language | TypeScript | 5.x |
| Build | Vite | 7.x |
| Styling | Tailwind CSS | 4.x |
| State | Zustand | 5.x |
| Virtual lists | TanStack Virtual | 3.x |
| Database | better-sqlite3 | 12.x |
| XML parsing | fast-xml-parser | 5.x |
| ZIP extraction | adm-zip | 0.5.x |
| Date utils | date-fns | 4.x |
| Packaging | electron-builder | 26.x |

## Contributing

See [CLAUDE.md](./CLAUDE.md) for architecture details, coding conventions, data format specs, and the CHANGELOG requirement.

## License

MIT
