# V1 Execution Rhythm Plan

## Purpose
Persist the end-to-end delivery rhythm so work can resume in any new session without losing context.

## Product Scope (Locked)
- Platform: macOS first (Tauri + Web), iOS migration-ready architecture.
- Interaction core: select assistant text -> popover "分叉" -> create branch node in graph canvas.
- Data model: Conversation and Note as first-class entities.
- Organization: global tags only, no Workspace/Project in V1.
- Views: not in V1 UI, but keep architecture for NL-to-rule view definitions.
- Chapters: not in V1 implementation, but keep data/task extension points.

## Delivery Cadence
- Cadence unit: 1 iteration = one user-visible capability + tests + docs sync.
- Each iteration must include:
  - Code implementation.
  - Test cases for new behavior and regression coverage.
  - `npm test` execution and pass.
  - AGENTS/docs update when decisions or behavior change.

## Milestones
- M1 Foundation (completed)
  - App skeleton, layout, Tauri shell, model abstractions, test harness.
- M2 Branching Interaction (completed)
  - M2.1 Select-to-branch interaction in chat (completed).
  - M2.2 Graph canvas with drag/zoom and branch rendering (completed).
  - M2.3 Active-node context switching in chat (completed).
- M3 Persistence and Search (completed)
  - M3.1 Local conversation snapshot persistence (completed).
  - M3.2 SQLite persistence for node/message/edge (completed).
  - M3.3 Conversation keyword search + node jump (first slice completed).
  - M3.4 FTS keyword search for conversation and notes (UI integrated, completed).
- M4 Tagging and Background Tasks (completed)
  - M4.1 Manual tags + auto tags + system-tag deletion (UI slice completed).
  - M4.2 Tag/Tagging persistence with SQLite bridge (completed).
  - M4.3 Background job orchestration (completed).
- M5 Hardening and Handoff (completed)
  - M5.1 Error handling and edge-case resilience for search/tag/background flows (completed).
  - M5.2 Release scripts and packaging hardening (completed).
  - M5.3 Final handoff docs and maintenance playbook (completed).
  - M5.4 Contributing workflow and PR/review checklist docs (completed).
  - M5.5 GitHub Actions / CI-CD baseline and license prep (completed).

## Session Start Protocol
- Step 1: read `AGENTS.md`.
- Step 2: read this plan file.
- Step 3: run `npm test` and verify baseline.
- Step 4: pick the top "next" task from milestone list.

## Session End Protocol
- Step 1: run `npm test`.
- Step 2: summarize behavior changes and test status.
- Step 3: update milestone status in this file.
- Step 4: update AGENTS index if new spec/design/plan docs were added.
- Step 5: when checks pass, use `npm run commit:auto -- "<title>"` to create a verified commit with auto-generated comments.

## Quality Gates
- Coverage threshold: >= 80% (statements/functions/lines), branches >= 70%.
- No feature considered complete without passing tests.
- No undocumented product decision.

## Current Next Task
- V2 planning kickoff: define NL view-rule mapping and chapter system implementation slices.
