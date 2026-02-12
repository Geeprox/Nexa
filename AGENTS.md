# Nexa AGENTS

## 项目愿景
将传统线性 LLM ChatBot 升级为“知识学习、研究与沉淀”的 IDE，支持分叉式对话图谱、笔记沉淀与可回溯的知识结构。

## 当前关键决策
- 技术路线: Web 技术栈优先，轻量快速交付。
- 终端封装: macOS 首发，Tauri 作为桌面壳。
- UI 风格: Notion 风格 + shadcn `sidebar-10` 强对齐（结构、图标、关键菜单文案优先复用）。
- 交互核心: 选中回答即分叉，图谱可拖拽、可缩放、可聚焦。
- 章节: V1 不实现，但必须在架构层完整预留。
- 模型策略: 高/中/低分层模型配置，后台任务可委派轻量模型。
- 许可证: AGPLv3 (商业闭源需另行授权)。
- 数据导出: V1 不做，但设计中必须定义可承接树状对话结构的导出格式。
- 组织方式: 不设 Workspace/Project，Conversation 与 Note 一等公民。
- 标签体系: 保留“手动标签 + 自动标签”数据与任务能力；V1 主界面暂不暴露标签管理入口。
- 视图: V1 不实现，但需预留面向“自然语言视图/LLM 智能聚合”的架构。
- 视图规则: 基础 AND/OR 必须支持；未来支持 LLM 生成聚合逻辑；需保存原始自然语言输入。
- 系统标签: 仅支持删除，不需要转换为手动标签。
- 标签范围: 全局标签库。
- 自动标签: 默认对所有内容自动打标签 (可节流)，入口后置到设置/详情页规划。
- 登录态: V1 不支持用户登录，不展示用户信息占位。
- 分叉视图: 会话无分叉时展示聊天视图；产生分叉后主区域切换为图谱视图。
- 顶栏动作: 右上角与 `sidebar-10` `NavActions` 对齐（`Edit Oct 08`、Star、More 英文菜单）。
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
- ./.agent/spec/prd_v2_nl_view_rules.md
- ./.agent/spec/design_v2_nl_view_rules.md
- ./.agent/spec/prd_v2_settings_llm_api.md
- ./.agent/spec/design_v2_settings_llm_api.md
- ./.agent/spec/prd_v2_chapters_slicing.md
- ./.agent/spec/design_v2_chapters_slicing.md
- ./.agent/spec/plan_v2_execution_rhythm.md

## 待确认问题
- 视图规则中的排除语义（NOT）是否进入 V2.0。
- 章节范围按全会话时间线还是按活跃分支计算。
