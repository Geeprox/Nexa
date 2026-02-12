# Nexa

English | [中文](./README.md)

**Nexa is an LLM IDE designed for deep research and knowledge accumulation.**

Unlike traditional linear chat interfaces, Nexa transforms LLM conversations into a visual knowledge exploration tool—where you can branch new questions from any response, track your thought process through interactive graphs, and turn every conversation into a traceable, reusable knowledge asset.

![Nexa Branching Conversation Graph](./docs/screenshots/conversation-graph.png)

## Why Nexa?

When using conventional LLM chat tools, we often face these challenges:

- **Digressions interrupt the main thread**—you want to explore a point in depth, but fear losing the current context
- **Conversations are hard to revisit**—after multiple rounds of discussion, finding a previous argument buried in long threads becomes difficult
- **Knowledge cannot accumulate**—valuable insights are scattered across separate sessions, hard to organize and reuse

Nexa addresses these problems with "branching dialogue + knowledge graphs."

## Core Features

### 🌿 Branching Conversations

Select any piece of a response to spawn a new follow-up branch. Each branch evolves independently without interference—you can return to any node at any time to continue exploring.

- Conduct multi-angle inquiries on specific arguments during literature research
- Try multiple solutions simultaneously when debugging code
- Dive deep into unfamiliar concepts when learning new domains

### 🕸️ Visual Graph

Conversations are no longer a straight line, but an interactive mind map you can zoom and pan:

- **Topology view**—visualize the derivation paths and thought processes
- **Node focus**—focus on any node to see its complete context
- **Branch comparison**—view responses from different branches side by side to aid decision-making

### 📝 Notes & Tags

Save insights from conversations as notes with one click, building your personal knowledge base:

- **Manual tags**—add custom tags to notes and conversations
- **Auto tags**—system automatically extracts keywords to help organize content
- **Global search**—quickly locate historical content through keywords

### 🎯 Tiered Model Routing

Automatically select models from different tiers based on task complexity:

- **High/Mid/Low three-tier config**—complex reasoning, daily chat, and lightweight tasks each get the right model
- **Background task optimization**—batch processing automatically uses lightweight models to save costs

## Quick Start

Prerequisites: `Node.js 20+`, `npm`, `Rust stable` (for desktop)

```bash
npm install
npm run dev
```

## macOS Desktop

```bash
# Development mode
npm run dev:macos

# Build release version
npm run release:macos
```

## Tech Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Graph**: React Flow for interactive node graphs
- **Desktop**: Tauri (Rust)
- **Local Storage**: SQLite

## License

Licensed under the **GNU Affero General Public License v3.0** (**AGPL-3.0-only**).
Commercial closed-source distribution requires a separate commercial license.
