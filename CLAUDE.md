# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexa is an LLM research IDE built around branching dialogue, graph-based reasoning, and long-term knowledge capture. It transforms traditional linear LLM chat into a forkable conversation graph with note-taking and traceable knowledge structures.

Key concept: Users can select any AI response to create a fork/branch in the conversation, visualized as an interactive graph using React Flow.

## Common Commands

### Development
- `npm run dev` - Start Next.js development server
- `npm run dev:macos` - Start Tauri desktop dev mode (macOS)

### Build & Quality
- `npm run build` - Build production web app
- `npm test` - Run Vitest with coverage (thresholds: 80% lines/functions/statements, 70% branches)
- `npm run test:watch` - Run Vitest in watch mode
- `npm run lint` - Run ESLint
- `cd src-tauri && cargo build` - Build Rust backend

### Release
- `npm run release:macos` - Build macOS release bundle
- `npm run commit:auto -- "<commit title>"` - Verified commit (runs tests/build before committing)

## Pre-commit Checklist (Required)

Before submitting changes, all of these must pass:
1. `npm test`
2. `npm run build`
3. `cd src-tauri && cargo build`

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 14 (React 18), TypeScript 5.5, Tailwind CSS 3.4
- **UI Components**: shadcn/ui ("new-york" style) + Radix UI primitives
- **Graph Visualization**: @xyflow/react (React Flow)
- **Desktop**: Tauri v1.5 (Rust backend)
- **Testing**: Vitest 2.0 with jsdom, @testing-library/react
- **State**: React hooks (centralized in HomePage component)

### Key State Management Pattern

State is centralized in `src/app/page.tsx` (HomePage component):

- `WorkspaceState`: Top-level app state containing conversations, notes, and model provider settings
- `ConversationSnapshot`: Versioned conversation state with nodes and messages
- `GraphNode`: Visual node in the conversation graph (position, parentId, title)
- `ChatMessage`: Individual message with role, content, nodeId, retryIndex

Data flow: User actions trigger callbacks in HomePage → state updates propagate to child components → automatic persistence via useEffect.

### Branching/Forking Logic

- Linear chat view until first branch is created
- After branching, main area switches to graph view
- Each node contains a single Q-A pair (dynamic height, not truncated)
- Text selection triggers branch creation UI (quote preview shown in composer)
- Forking strategy: Clicking "fork" enters input reference state; node is created after user sends message

### Key Directories

```
src/
  app/              # Next.js app router (page.tsx is main 1000+ line HomePage component)
  components/       # React components organized by feature
    ui/             # shadcn/ui components
    chat/           # ChatPane, ChatComposer
    graph/          # GraphPane (React Flow wrapper)
    layout/         # Sidebar, TopBar
    notes/          # NotesPane
    conversation/   # ConversationListPane
  lib/
    db/             # SQLite database layer with repositories
    llm/            # LLM integration (router, OpenAI, mock provider)
    graph/          # Graph layout algorithms (non-overlapping node positioning)
    search/         # Full-text search
    tagging/        # Auto-tagging system
    jobs/           # Background job queue
    session/        # Workspace state, conversation snapshots
    logging/        # Structured error logging
src-tauri/          # Rust Tauri backend
.agent/
  spec/             # PRDs and design docs (prd_*.md, design_*.md)
  docs/             # Contributing guidelines, handoff docs
```

## Development Conventions

### Branch Naming
- **Required prefix**: `codex/`
- Format: `codex/<scope>-<topic>`
- Example: `codex/graph-node-focus`

### Commit Convention
Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`

### Styling
- Use `cn()` utility from `class-variance-authority` + `tailwind-merge` for class merging
- CSS variables for theming (HSL values)
- shadcn/ui "new-york" style
- Reference `sidebar-10` for layout/structural alignment

### Error Handling
- Use structured logging via `logError()` / `logInfo()` in `src/lib/logging/`
- Window error event listeners for unhandled errors
- Data validation with automatic cleanup on schema failure (no silent errors)

### Testing Requirements
- Coverage thresholds enforced: 80% lines/functions/statements, 70% branches
- Page-level regression tests required after UI changes (sidebar collapse, menu clicks, text selection forking)
- Test setup in `vitest.setup.ts` includes crypto polyfill and ResizeObserver mock

## Key Configuration

- **Path alias**: `@/` maps to `./src/*` (TypeScript and Vitest)
- **Coverage**: Reports to `.coverage-tmp/` directory
- **License**: AGPL-3.0-only (commercial use requires separate license)

## Important Files to Reference

- `AGENTS.md` - Project vision, key decisions, V1/V2 scope boundaries, regression postmortems
- `.agent/spec/prd_*.md` - Product requirements
- `.agent/spec/design_*.md` - Technical design documents
- `.agent/docs/CONTRIBUTING.md` - Full contribution guidelines
