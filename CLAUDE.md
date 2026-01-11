# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phone SMS Viewer is a viewer application to browse and search backed-up phone SMS and call logs.

## Current State

This repository is newly initialized with no source code yet. The project is in the planning/setup phase.

## Future Development Guidance

When implementing this project, consider:

- **Data Format**: Determine the backup file formats to support (e.g., XML, JSON, CSV, database exports from Android/iOS)
- **Architecture**: Choose between desktop application (Electron, native), web application, or CLI tool
- **Search Functionality**: Design efficient indexing for searching through potentially large SMS/call log datasets
- **Privacy**: Handle sensitive personal data appropriately with proper security considerations
- **UI/UX**: Design intuitive browsing with filtering by date, contact, conversation threading
