# Nexa

English | [中文](./README.md)

Nexa is an LLM research IDE built around branching dialogue, graph-based reasoning, and long-term knowledge capture.

## V1 Scope
- Branching conversation graph (select answer text to fork)
- Conversation / Note as first-class entities with global tags (manual + auto)
- Local persistence and keyword search
- Tiered model routing (high / mid / low)
- macOS desktop shell (Tauri)

## Quick Start
Prerequisites: `Node.js 20+`, `npm`, `Rust stable` (for desktop)

```bash
npm install
npm run dev
```

## macOS Desktop Dev & Build
```bash
npm run dev:macos
npm run release:macos
```

Release artifact manifest: `dist/releases/macos/latest.json` (`.app` required, `.dmg` optional).

## Quality Checks
```bash
npm test
npm run build
cd src-tauri && cargo build
```

## CI/CD
- CI workflow: `/.github/workflows/ci.yml`
- macOS release workflow: `/.github/workflows/release-macos.yml`
- GitHub publish helper: `./scripts/publish-github.sh`

## License
Licensed under the **GNU Affero General Public License v3.0** (**AGPL-3.0-only**).  
Commercial closed-source distribution requires a separate commercial license.
