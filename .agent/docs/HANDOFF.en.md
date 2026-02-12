# Nexa Handoff

English | [中文](./HANDOFF.md)

Updated: February 11, 2026

## 1. V1 Scope
- Delivered: branching conversation graph, graph interaction, conversation search, tag system (manual + system), background auto-tagging jobs, macOS Tauri shell.
- Not delivered yet (architecture reserved): chapter generation, natural-language views, export UI, iOS client.

## 2. Local Startup
- Web dev: `npm run dev`
- macOS desktop dev: `./scripts/dev-macos.sh`
- Proxy mode: `./scripts/dev-macos.sh --proxy <proxy-url>`

## 3. Quality Gates
- Tests + coverage: `npm test`
- Web build: `npm run build`
- Desktop compile check: `cd src-tauri && cargo build`
- Verified commit flow: `npm run commit:auto -- "<title>"`

## 4. Core Module Map
- Page orchestration: `src/app/page.tsx`
- Chat UI: `src/components/chat/ChatPane.tsx`
- Graph UI: `src/components/graph/GraphPane.tsx`
- Sidebar/Topbar: `src/components/layout/Sidebar.tsx`, `src/components/layout/TopBar.tsx`
- DB adapters: `src/lib/db/index.ts`, `src/lib/db/sqlite.ts`
- Tag repository: `src/lib/db/tagRepository.ts`
- Background jobs: `src/lib/jobs/queue.ts`, `src/lib/jobs/autoTagOrchestrator.ts`
- Search: `src/lib/search/ftsSearchRepository.ts`
- Snapshot persistence: `src/lib/session/conversationSnapshot.ts`

## 5. macOS Release Flow
1. Run: `./scripts/build-macos.sh`
2. Release manifest: `dist/releases/macos/latest.json`
3. Current baseline guarantees `.app`; `.dmg` is optional in the manifest.

## 6. Common Maintenance Tasks
- Update model task routing: `src/lib/llm/router.ts`
- Update auto-tag rules: `src/lib/tagging/index.ts`
- Update close-to-hide behavior: `src-tauri/src/main.rs`
- Update packaging settings: `src-tauri/tauri.conf.json`

## 7. Troubleshooting
- `npm install` network issues: use `--proxy` or `NEXA_PROXY`.
- Tauri icon/package errors: verify files under `src-tauri/icons/*`.
- White screen: run `npm run build` first to catch type errors, then inspect Tauri dev console.
- Auto-tag failures: top status shows error; click “生成标签” to retry.

## 8. V2 Suggestions
- Natural-language view rule mapping (`rule_nl` -> `rule_json`).
- Chapter splitting + summary persistence.
- iOS client migration (keep Domain/Infra isolated from Web-specific UI logic).
