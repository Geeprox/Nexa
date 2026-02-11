# Nexa

中文 | [English](./README.en.md)

Nexa 是一个面向研究与学习的 LLM 交互 IDE，核心体验是“分叉对话 + 图谱推演 + 标签沉淀”。

## V1 范围
- 分叉式会话图谱（选中回答即可分叉追问）
- Conversation / Note 一等公民与全局标签体系（手动 + 自动）
- 本地持久化与关键词搜索
- 高/中/低分层模型路由
- macOS 桌面壳（Tauri）

## 快速开始
前置依赖：`Node.js 20+`、`npm`、`Rust stable`（桌面端）

```bash
npm install
npm run dev
```

## macOS 桌面开发与构建
```bash
npm run dev:macos
npm run release:macos
```

发布构建产物清单：`dist/releases/macos/latest.json`（包含 `.app`，`.dmg` 为可选）

## 质量校验
```bash
npm test
npm run build
cd src-tauri && cargo build
```

## CI/CD
- CI：`/.github/workflows/ci.yml`
- macOS 发布：`/.github/workflows/release-macos.yml`
- GitHub 发布脚本：`./scripts/publish-github.sh`

## 许可证
本项目采用 **GNU Affero General Public License v3.0**（**AGPL-3.0-only**）。  
如果需要商业闭源发布，请联系作者获取单独商业授权。
