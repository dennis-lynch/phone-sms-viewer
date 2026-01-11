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
- Upgraded ESLint from v8 to v9 to resolve deprecation warnings
- Migrated to ESLint flat config format (eslint.config.mjs)
- Upgraded Electron from v28 to v36 (fixes ASAR integrity bypass vulnerability)
- Upgraded esbuild from v0.19 to v0.24 (fixes development server security issue)
- Upgraded better-sqlite3 from v9 to v11 (fixes C++20 build compatibility with Node.js 24)
- Updated all dependencies to latest versions for security and compatibility

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
