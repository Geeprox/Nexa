# Nexa AGENTS

## 项目愿景
将传统线性 LLM ChatBot 升级为“知识学习、研究与沉淀”的 IDE，支持分叉式对话图谱、笔记沉淀与可回溯的知识结构。

## 当前关键决策
- 技术路线: Web 技术栈优先，轻量快速交付。
- 终端封装: macOS 首发，Tauri 作为桌面壳。
- UI 风格: Notion 风格 + shadcn 侧边栏布局参考 (类似 sidebar-10)。
- 交互核心: 选中回答即分叉，图谱可拖拽、可缩放、可聚焦。
- 章节: V1 不实现，但必须在架构层完整预留。
- 模型策略: 高/中/低分层模型配置，后台任务可委派轻量模型。
- 许可证: AGPLv3 (商业闭源需另行授权)。
- 数据导出: V1 不做，但设计中必须定义可承接树状对话结构的导出格式。
- 组织方式: 不设 Workspace/Project，Conversation 与 Note 一等公民。
- 标签体系: 用户手动标签 + LLM 自动标签 (样式区分，可见)。
- 视图: V1 不实现，但需预留面向“自然语言视图/LLM 智能聚合”的架构。
- 视图规则: 基础 AND/OR 必须支持；未来支持 LLM 生成聚合逻辑；需保存原始自然语言输入。
- 系统标签: 仅支持删除，不需要转换为手动标签。
- 标签范围: 全局标签库。
- 自动标签: 默认对所有内容自动打标签 (可节流)。
- 发布流程: `./scripts/build-macos.sh` 负责本地发布构建，并生成 `dist/releases/macos/latest.json` 产物清单。
- 打包策略: 当前默认产出 `.app`（`.dmg` 作为后续可选增强）。
- CI/CD: 已预置 GitHub Actions（`ci.yml` + `release-macos.yml`）和发布辅助脚本 `./scripts/publish-github.sh`。
- 测试策略: 每次需求开发需补充测试用例并执行测试，覆盖率目标 >= 80%。
- 提交流程: 编译与测试通过后可使用 `npm run commit:auto -- \"<commit title>\"` 自动提交并生成变更说明。

## 需求与文档归档规范
- PRD: ./.agent/spec/prd_*.md
- 技术方案: ./.agent/spec/design_*.md

## 已生成文档索引
- ./.agent/spec/prd_v1_core_conversation_graph.md
- ./.agent/spec/design_v1_core_conversation_graph.md
- ./.agent/spec/prd_v1_notes_search.md
- ./.agent/spec/design_v1_notes_search.md
- ./.agent/spec/prd_v1_model_tiers.md
- ./.agent/spec/design_v1_model_tiers.md
- ./.agent/spec/prd_v1_tag_views.md
- ./.agent/spec/design_v1_tag_views.md
- ./.agent/spec/prd_v1_chapters_future.md
- ./.agent/spec/design_v1_chapters_future.md
- ./.agent/spec/design_v1_platform_migration.md
- ./.agent/spec/plan_v1_execution_rhythm.md
- ./.agent/spec/design_v1_visual_language.md
- ./.agent/spec/design_v1_visual_alignment_sidebar10.md
- ./.agent/spec/prd_v1_handoff_playbook.md
- ./.agent/spec/design_v1_handoff_playbook.md
- ./.agent/spec/prd_v1_contributing_workflow.md
- ./.agent/spec/design_v1_contributing_workflow.md
- ./.agent/spec/prd_v1_github_cicd.md
- ./.agent/spec/design_v1_github_cicd.md

## 待确认问题
- 视图的自然语言规则如何映射为结构化过滤逻辑。
