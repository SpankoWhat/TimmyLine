# Changelog

All notable changes to TimmyLine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- No notable changes yet.

## [3.0.0] — 2026-05-03

### Added

- **Entity-Centric Timeline View** — Added dedicated entity timeline sections, related event/action rows, inline relation badges, presence indicators, and expandable detail panels with inline edit and delete actions.
- **Microsoft Entra Bearer Authentication** — Added bearer-token support for Microsoft Entra-backed API authentication flows.
- **AWS Secrets Manager Runtime Injection** — Added a helper script and Docker entrypoint support for loading auth credentials from AWS Secrets Manager into the process environment at startup.
- **Timestamp Preferences** — Added user-configurable time formatting preferences with a dedicated modal and store.
- **Vitest Coverage Foundation** — Added Vitest configuration plus session and authorization helper tests.

### Changed

- **Timeline Experience** — Refactored timeline management and socket integration, and expanded timeline row and detail interactions for denser analysis workflows.
- **Access Control** — Tightened admin access validation, service context handling, and session ownership and authentication behavior across analyst routes and APIs.
- **Exports and Health APIs** — Added export classification and warning handling, improved export logging, and simplified the health response payload.
- **Navigation and UI Polish** — Improved sidebar sign-out behavior, compact incident header presentation, and timestamp formatting across the app.
- **Dependencies and Tooling** — Updated core SvelteKit and Vite dependencies and aligned the project with the new test tooling.
- **Documentation** — Updated setup, configuration, deployment, and authentication docs to describe the env-only credential model and AWS-backed runtime injection flow.

## [0.1.0] — 2025-03-18

### Added

- **Incident Management** — Full CRUD for incidents with priority levels, status tracking, and SOAR ticket ID linking.
- **Timeline Events** — Create and manage timeline events with timestamps, severity, confidence, source reliability, JSON data blobs, and notes.
- **Investigation Actions** — Track analyst actions with tool references, results, and next steps.
- **Entity Tracking** — IOC and asset management (IPs, domains, hashes, users, hosts) with status, criticality, and JSON attributes.
- **Annotation System** — Analyst notes, hypotheses, and observations with confidence levels and polymorphic references.
- **Relationship Linking** — Many-to-many relationships between events, actions, and entities via junction tables with contextual metadata.
- **Timeline Views** — Log view (dense data table) and Vertical Timeline view (chronological cards with date separators, time gap detection, and rapid-fire clustering).
- **Real-Time Collaboration** — Socket.IO-based multi-analyst presence tracking with lobby awareness, incident room focus tracking, and edit locking.
- **OAuth Authentication** — Google, Microsoft Entra ID, and GitHub OAuth providers with database-backed sessions.
- **API Key Access** — Programmatic access via `tml_`-prefixed API keys with role-based scoping and SHA-256 storage.
- **MCP Server** — Model Context Protocol endpoint with 37 tools for AI agent integration, in-process service calls, and session management.
- **HTML Export** — Self-contained incident export with embedded styles, interactive rows, and JSON viewer.
- **Command Palette** — Global `Ctrl+K` keyboard shortcut for navigation, creation, and configuration commands.
- **Display Field Configuration** — Per-user field visibility, pinning, and drag-and-drop reordering with localStorage persistence.
- **Lookup Table Management** — Configurable event, action, entity, annotation, and relation types with soft-delete and restore.
- **Production Deployment** — Docker image, Docker Compose, adapter-node build, and custom server.js with Socket.IO support.
- **CI/CD** — GitHub Actions for continuous integration and automated releases with tarball + Docker image publishing.
