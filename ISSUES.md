# Issues Found During Testing

This document captures issues found during setup and run testing, with proposed fixes.

## Testing Date: January 12, 2026

## Status: ALL ISSUES RESOLVED

All critical and medium priority issues have been fixed and tested successfully.

---

## Issue 1: better-sqlite3 Native Module Version Mismatch

### Symptom
When running `npm start` after a fresh `npm install`, the app crashes with:
```
Error: The module '...\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 137. This version of Node.js requires
NODE_MODULE_VERSION 140.
```

### Cause
The `better-sqlite3` package ships prebuilt binaries compiled for Node.js, but Electron uses a different Node.js version internally. The native module needs to be recompiled for Electron's Node.js version.

### Fix
Add `@electron/rebuild` as a dev dependency and create a postinstall script:

```bash
npm install --save-dev @electron/rebuild
```

Add to package.json scripts:
```json
{
  "scripts": {
    "postinstall": "electron-rebuild"
  }
}
```

### Priority: **HIGH** - FIXED

---

## Issue 2: Production Build Path Incorrect

### Symptom
When running `npm start` (production mode), the app shows:
```
Failed to load URL: file:///D:/repos/phone-sms-viewer/renderer/index.html
with error: ERR_FILE_NOT_FOUND
```

### Cause
The path in `src/main/index.ts` was `'../renderer/index.html'` but since main.js is in `dist/`, and renderer files are in `dist/renderer/`, the correct path should be `'renderer/index.html'`.

### Fix
**Already applied** - Changed path from `'../renderer/index.html'` to `'renderer/index.html'` in `src/main/index.ts`.

### Priority: **HIGH** - FIXED

---

## Issue 3: Dev Mode Doesn't Start Electron

### Symptom
Running `npm run dev` starts the Vite dev server and watchers, but doesn't launch Electron. The user has to manually run `npm start` or `electron .` in another terminal.

### Cause
The dev script runs three concurrent processes:
1. `dev:main` - esbuild watch for main process
2. `dev:preload` - esbuild watch for preload
3. `dev:renderer` - vite dev server

But there's no script to actually start Electron with `NODE_ENV=development`.

### Fix
Option A: Add a wait-on script to start Electron after Vite is ready:

```bash
npm install --save-dev wait-on cross-env
```

Update package.json:
```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:main\" \"npm:dev:preload\" \"npm:dev:renderer\" \"npm:dev:electron\"",
    "dev:electron": "wait-on http://localhost:5173 && cross-env NODE_ENV=development electron ."
  }
}
```

Option B: Simpler approach - Add instructions to SETUP.md explaining that users need to run `npm start` in a separate terminal after `npm run dev`.

### Priority: **MEDIUM** - FIXED

---

## Issue 4: SETUP.md Documentation Gaps

### Symptom
Setup instructions don't mention:
1. Need for `electron-rebuild` after npm install
2. Two-terminal workflow for dev mode
3. The actual keyboard shortcut is Ctrl+O not just "File → Open Backup"

### Fix
Update SETUP.md with:
- Post-install rebuild step
- Clarified dev mode instructions
- Correct keyboard shortcuts

### Priority: **MEDIUM** - FIXED

---

## Issue 5: Missing npm Scripts for Common Tasks

### Symptom
No convenient scripts for:
- Rebuilding native modules
- Cleaning dist folder
- Running Electron directly

### Fix
Add these scripts to package.json:
```json
{
  "scripts": {
    "rebuild": "electron-rebuild",
    "clean": "rimraf dist",
    "electron": "electron ."
  }
}
```

### Priority: **LOW** - FIXED

---

## Summary of Required Changes

### High Priority (App Won't Run)
1. ~~Add `@electron/rebuild` and postinstall script~~ DONE

### Medium Priority (Dev Experience)
2. ~~Fix dev mode to auto-start Electron OR update documentation~~ DONE
3. ~~Update SETUP.md with complete instructions~~ DONE

### Low Priority (Nice to Have)
4. ~~Add convenience npm scripts~~ DONE
5. ~~Consider adding `rimraf` for clean builds~~ DONE

---

## Fix Implementation Plan

### Phase 1: Critical Fixes - COMPLETED
1. ~~Add `@electron/rebuild` to devDependencies~~ DONE
2. ~~Add `postinstall` script to rebuild native modules~~ DONE
3. ~~Test fresh `npm install` workflow~~ DONE

### Phase 2: Dev Experience - COMPLETED
1. ~~Add `wait-on` and `cross-env` dependencies~~ DONE
2. ~~Update dev script to auto-start Electron~~ DONE
3. ~~Update SETUP.md with complete instructions~~ DONE

### Phase 3: Polish - COMPLETED
1. ~~Add convenience scripts (clean, rebuild, electron)~~ DONE
2. Update README.md with quick start - Not required (SETUP.md sufficient)
3. ~~Test on fresh clone~~ DONE - Both dev and production modes tested successfully

---

## Final Testing Results

### Date: January 12, 2026

**Tests Performed:**
1. `npm run build` - PASSED (main, preload, and renderer built successfully)
2. `npm start` (production mode) - PASSED (app launched without errors)
3. `npm run dev` (development mode) - PASSED (Vite server started, Electron auto-launched)

**All issues resolved.**
