# Contributing to Nexa

English | [中文](./CONTRIBUTING.md)

Thanks for contributing to Nexa. Please follow this workflow to keep quality and maintainability consistent.

## 1) Branch Rules
- Branch prefix must be: `codex/`
- Recommended format: `codex/<scope>-<topic>`
- Examples:
  - `codex/graph-node-focus`
  - `codex/docs-handoff`

## 2) Commit Rules
- Conventional Commits are recommended:
  - `feat: ...`
  - `fix: ...`
  - `docs: ...`
  - `refactor: ...`
  - `test: ...`
- Keep each commit focused on one goal. Avoid mixing unrelated changes.

## 3) Local Dev & Verification
- Install deps: `npm install`
- Web dev: `npm run dev`
- Desktop dev (macOS): `./scripts/dev-macos.sh`

## 4) Required Checks Before PR
Run and pass all:
- `npm test`
- `npm run build`
- `cd src-tauri && cargo build`

Optional one-shot verify + commit:
- `npm run commit:auto -- "<commit title>"`

## 5) PR Requirements
- PR title should be specific.
- PR description must include:
  - change summary
  - test results (commands + pass/fail)
  - risk and rollback notes
  - updated docs (if applicable)

Default PR template is provided at `.github/PULL_REQUEST_TEMPLATE.md`.

## 6) Code Review Checklist
- Requirement alignment:
  - Does it implement agreed scope only?
- Behavioral safety:
  - Are edge cases and error paths handled?
- Test coverage:
  - Are new behaviors and regressions covered?
- Architecture consistency:
  - Does it respect current layering (UI / Domain / Infra)?
- Docs sync:
  - Were `AGENTS.md`, README, and `.agent/spec/*` updated when decisions changed?

## 7) Documentation Convention
- For new capability slices, add:
  - PRD: `./.agent/spec/prd_*.md`
  - Design: `./.agent/spec/design_*.md`
- Persist key decisions in `AGENTS.md`.
