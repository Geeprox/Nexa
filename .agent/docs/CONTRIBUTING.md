# Contributing to Nexa

中文 | [English](./CONTRIBUTING.en.md)

感谢参与 Nexa。请按以下流程提交代码，确保可维护性与质量一致性。

## 1) 分支规则
- 分支前缀必须是：`codex/`
- 建议格式：`codex/<scope>-<topic>`
- 示例：
  - `codex/graph-node-focus`
  - `codex/docs-handoff`

## 2) 提交规则
- 推荐使用 Conventional Commits：
  - `feat: ...`
  - `fix: ...`
  - `docs: ...`
  - `refactor: ...`
  - `test: ...`
- 每个 commit 聚焦单一目标，避免混合“功能+大重构+无关改动”。

## 3) 本地开发与验证
- 安装依赖：`npm install`
- Web 开发：`npm run dev`
- 桌面开发（macOS）：`./scripts/dev-macos.sh`

## 4) 合并前必跑检查
在 PR 前必须执行并通过：
- `npm test`
- `npm run build`
- `cd src-tauri && cargo build`

可选：一键验证并提交  
- `npm run commit:auto -- "<commit title>"`

## 5) PR 要求
- PR 标题清晰，描述只覆盖本次改动范围。
- PR 描述必须包含：
  - 变更摘要
  - 测试结果（命令与是否通过）
  - 风险点与回滚方式
  - 涉及文档（如有）

仓库已提供默认 PR 模板：`.github/PULL_REQUEST_TEMPLATE.md`

## 6) Code Review Checklist
- 需求对齐：
  - 是否准确实现需求？是否引入未讨论功能？
- 行为安全：
  - 边界条件、异常路径、错误提示是否完整？
- 测试覆盖：
  - 新增行为是否有用例？回归路径是否覆盖？
- 架构一致性：
  - 是否符合现有分层（UI / Domain / Infra）？
- 文档同步：
  - 是否更新 `AGENTS.md`、README、`.agent/spec/*`（如涉及决策变化）？

## 7) 文档维护约定
- 新功能建议补充：
  - PRD：`./.agent/spec/prd_*.md`
  - 设计：`./.agent/spec/design_*.md`
- 关键决策需写入：`AGENTS.md`
