# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Database

The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.

## Commands

```bash
npm run setup        # First-time: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server (Next.js 15 + Turbopack)
npm run build        # Production build
npm run lint         # ESLint via next lint
npm run test         # Run Vitest suite
npm run db:reset     # Reset SQLite database (destructive)
```

To run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

Environment: copy `.env.example` if present, or set `ANTHROPIC_API_KEY` in `.env`. Without it, the app falls back to a mock provider returning static code.

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language; Claude generates code that populates a virtual file system, which is rendered in an iframe preview.

### Request Flow

```
Chat input → POST /api/chat/route.ts
  → Vercel AI SDK + Anthropic (claude-haiku)
    → Tool calls: str_replace_editor / file_manager
      → FileSystemContext handles tool results → VirtualFileSystem updated
        → PreviewFrame re-renders iframe
          → Prisma saves project state to SQLite (authenticated users only)
```

### Key Abstractions

**VirtualFileSystem** (`src/lib/file-system.ts`) — in-memory tree, no disk I/O. All paths are root-relative (`/App.jsx`). Serializes to/from JSON for database persistence.

**FileSystemContext** (`src/lib/contexts/file-system-context.tsx`) — wraps VirtualFileSystem, processes tool calls from Claude (`str_replace_editor` and `file_manager`), and exposes file CRUD to UI components.

**ChatContext** (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, connects tool call results to FileSystemContext, tracks anonymous work.

**AI Tools** (`src/lib/tools/`):
- `str-replace.ts` — replace a code region in an existing file (old_code → new_code)
- `file-manager.ts` — create, delete, or view files

**System Prompt** (`src/lib/prompts/generation.tsx`) — instructs Claude to produce `/App.jsx` as root, use React + Tailwind (no inline styles), use `@/` imports for internal references.

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`) — compiles virtual files via Babel, builds an import map, and injects into the preview iframe.

**Mock Provider** (`src/lib/provider.ts`) — used when `ANTHROPIC_API_KEY` is absent; returns static code, limits tool steps to 4.

### Authentication

JWT-based, stored in an HTTP-only cookie (7-day expiry). Middleware at `src/middleware.ts` protects `/api/projects` and `/api/filesystem`. Server actions in `src/actions/index.ts` handle sign-up/in/out and project CRUD. Projects may be anonymous (`userId = null`).

### Database

Prisma + SQLite (`prisma/dev.db`). Schema: `User` (1-to-many) `Project`. Project `messages` and `data` (file system snapshot) are stored as JSON strings.

### Page Routing

- `/` (`src/app/page.tsx`) — auth check; redirects authenticated users to their latest project or creates one; anonymous users get MainContent directly.
- `/[projectId]` (`src/app/[projectId]/page.tsx`) — loads project from DB, renders MainContent with project data; requires authentication.

### Layout

`MainContent` (`src/app/main-content.tsx`) renders three resizable panels: Chat (`src/components/chat/`), Code Editor (`src/components/editor/`), and Live Preview (`src/components/preview/PreviewFrame.tsx`).

### Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).
