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
