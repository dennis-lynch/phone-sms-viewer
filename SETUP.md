# Setup Guide

This guide will help you set up the Phone SMS Viewer application for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+ or 24+** (LTS version recommended - v24.12+ tested and working)
- **npm 11+** (comes with Node.js)
- **Git** (for cloning the repository)

### For Windows (Required for better-sqlite3 native compilation fallback):
- **Visual Studio Build Tools 2022** with Desktop development with C++ workload
  - Or Visual Studio 2022 Community Edition
  - The prebuilt binaries should work, but these are needed if compilation is required

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd phone-sms-viewer
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies and automatically rebuild native modules for Electron (via the `postinstall` script).

**Note:** If you see errors about `better-sqlite3` native module version mismatch, run:
```bash
npm run rebuild
```

### 3. Running Locally

To run the application in development mode:

```bash
npm run dev
```

This command will:
- Start the Vite development server for the renderer process (React UI)
- Watch and compile the main process (Electron)
- Launch the application with hot module reloading

The application will open in a new window. Any changes you make to the code will automatically reload.

## Building for Production

### Build the Application

```bash
npm run build
```

This will compile both the main and renderer processes for production.

### Package the Application

To create distributable packages:

**For Windows:**
```bash
npm run package:win
```

**For Linux:**
```bash
npm run package:linux
```

**For both platforms:**
```bash
npm run package
```

The packaged applications will be in the `release/` directory.

## Loading Backup Files

Once the application is running:

1. Click **File → Open Backup** or press `Ctrl+O` (Windows/Linux) or `Cmd+O` (Mac)
2. Select your SMS/call log backup file:
   - `.zip` files from SMS Backup & Restore Pro
   - `.xml` files (unzipped backups)
3. Wait for the import to complete
4. Browse your conversations in the sidebar

### Example Files

Example backup files are located in the `examples/` directory:
- `sms-20260111012318.zip` - SMS messages backup
- `calls-2020-01-05_03-00-32.zip` - Call logs backup

## Development Commands

- `npm run dev` - Run in development mode with hot reload (auto-starts Electron)
- `npm run build` - Build for production
- `npm run start` - Start the built application
- `npm run package` - Create distributable packages
- `npm run rebuild` - Rebuild native modules for Electron
- `npm run clean` - Clean build output directories
- `npm run lint` - Run ESLint to check code quality
- `npm run type-check` - Run TypeScript type checking

## Keyboard Shortcuts

- `Ctrl+O` (Windows/Linux) or `Cmd+O` (Mac) - Open file dialog
- `Ctrl+F` (Windows/Linux) or `Cmd+F` (Mac) - Toggle search panel
- `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac) - Open settings
- `Escape` - Close dialogs and search panel

## Troubleshooting

### Build Errors

**Problem:** `better-sqlite3` native module build fails

**Solution:** Make sure you have the necessary build tools:
- **Windows:** Install Visual Studio Build Tools or Visual Studio with C++ support
- **Linux:** Install `build-essential` package: `sudo apt-get install build-essential`

### Application Won't Start

**Problem:** Application window doesn't open after running `npm run dev`

**Solution:**
1. Check the terminal for error messages
2. Make sure ports 5173 (Vite dev server) is not in use
3. Try deleting `node_modules` and `dist` folders, then run `npm install` again

### Import Fails

**Problem:** Backup file import fails or shows error

**Solution:**
1. Ensure the backup file is from SMS Backup & Restore Pro
2. Check that the file is not corrupted (try unzipping manually)
3. Look for error messages in the developer console (View → Toggle Developer Tools)

## Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Getting Help

If you encounter issues not covered here:
1. Check the GitHub Issues page
2. Review the error messages carefully
3. Make sure all dependencies are correctly installed
