# Nexa Handoff

中文 | [English](./HANDOFF.en.md)

更新时间：2026-02-11

## 1. V1 交付边界
- 已交付：分叉对话、图谱交互、会话搜索、标签体系（手动+系统）、自动标签后台任务、macOS Tauri 壳。
- 未交付（已预留架构）：章节自动拆分、自然语言视图聚合、导出 UI、iOS 客户端。

## 2. 本地启动
- Web 开发：`npm run dev`
- macOS 桌面开发：`./scripts/dev-macos.sh`
- 代理模式：`./scripts/dev-macos.sh --proxy <proxy-url>`

## 3. 质量门禁
- 单测与覆盖率：`npm test`
- Web 构建：`npm run build`
- 桌面编译检查：`cd src-tauri && cargo build`
- 提交规范：`npm run commit:auto -- "<title>"`

## 4. 核心模块索引
- 页面编排：`src/app/page.tsx`
- 对话视图：`src/components/chat/ChatPane.tsx`
- 图谱视图：`src/components/graph/GraphPane.tsx`
- 侧栏与顶部栏：`src/components/layout/Sidebar.tsx`、`src/components/layout/TopBar.tsx`
- 数据适配层：`src/lib/db/index.ts`、`src/lib/db/sqlite.ts`
- 标签仓储：`src/lib/db/tagRepository.ts`
- 后台任务：`src/lib/jobs/queue.ts`、`src/lib/jobs/autoTagOrchestrator.ts`
- 搜索：`src/lib/search/ftsSearchRepository.ts`
- 快照持久化：`src/lib/session/conversationSnapshot.ts`

## 5. macOS 发布流程
1. 执行：`./scripts/build-macos.sh`
2. 产物清单：`dist/releases/macos/latest.json`
3. 当前默认保证 `.app` 产出；`.dmg` 在 manifest 中是可选字段。

## 6. 常见维护任务
- 调整模型任务路由：`src/lib/llm/router.ts`
- 调整自动标签规则：`src/lib/tagging/index.ts`
- 调整窗口行为（关闭即隐藏）：`src-tauri/src/main.rs`
- 调整打包参数：`src-tauri/tauri.conf.json`

## 7. 常见故障排查
- `npm install` 网络失败：使用 `--proxy` 或 `NEXA_PROXY`。
- Tauri 图标/打包错误：检查 `src-tauri/icons/*` 是否完整。
- 页面白屏：先执行 `npm run build` 排查类型错误，再查 Tauri dev console。
- 自动标签失败：顶部状态会显示错误，可点击“生成标签”重试。

## 8. V2 建议
- 自然语言视图规则映射（`rule_nl` -> `rule_json`）。
- 章节自动拆分与摘要入库。
- iOS 客户端接入（保持 Domain/Infra 与 UI 解耦，不引入 Web 独有耦合逻辑）。
