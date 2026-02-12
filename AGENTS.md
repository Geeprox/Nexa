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
- 分叉触发策略: 点击“分叉”不立即建图节点，先进入输入区引用态；用户发送后再创建新 Q-A Block 并切换/更新拓扑。
- 拓扑结构: 每个拓扑节点仅承载单个 Q-A Pair（动态高度，不截断）；拓扑态主区仅保留图谱与底部输入条，不再并排/上下展示完整聊天历史面板。
- 顶栏动作: 右上角与 `sidebar-10` `NavActions` 对齐（`Edit Oct 08`、Star、More 英文菜单）。
- 异常可观测性: 前端关键路径必须记录结构化异常日志（`window.error`、`unhandledrejection`、存储读写、LLM 调用、关键交互失败）。
- 脏数据处理: 持久化数据（本地存储/DB）在 schema 校验失败时必须自动清理并记录日志，避免刷新后出现 silent error。
- 发布流程: `./scripts/build-macos.sh` 负责本地发布构建，并生成 `dist/releases/macos/latest.json` 产物清单。
- 打包策略: 当前默认产出 `.app`（`.dmg` 作为后续可选增强）。
- CI/CD: 已预置 GitHub Actions（`ci.yml` + `release-macos.yml`）和发布辅助脚本 `./scripts/publish-github.sh`。
- 测试策略: 每次需求开发需补充测试用例并执行测试，覆盖率目标 >= 80%。
- 提交流程: 编译与测试通过后可使用 `npm run commit:auto -- \"<commit title>\"` 自动提交并生成变更说明。

## 需求与文档归档规范
- PRD: ./.agent/spec/prd_*.md
- 技术方案: ./.agent/spec/design_*.md
- 协作与交接文档: ./.agent/docs/*.md

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
- ./.agent/spec/prd_mvp_chat_branch_closeout.md
- ./.agent/spec/design_mvp_chat_branch_closeout.md
- ./.agent/spec/plan_mvp_chat_branch_closeout.md
- ./.agent/docs/CONTRIBUTING.md
- ./.agent/docs/CONTRIBUTING.en.md
- ./.agent/docs/HANDOFF.md
- ./.agent/docs/HANDOFF.en.md

## 待确认问题
- 视图规则中的排除语义（NOT）是否进入 V2.0。
- 章节范围按全会话时间线还是按活跃分支计算。

## 回归事故复盘（2026-02-12）
- 事故现象:
  - 侧栏/顶栏与 `sidebar-10` 视觉对齐不完整（字体过轻、图标与交互不一致）。
  - 页面层交互出现回退（用户感知侧栏折叠失效、选中文本分叉入口丢失）。
  - 输入区与回复操作区偏离目标参考（ChatGPT 风格与交互不一致）。
- 前因:
  - 组件级测试覆盖较多，但页面级真实交互路径覆盖不足。
  - 视觉对齐只做了“结构近似”，未做“像素级状态对照”与人工回归清单。
  - 在一次迭代内同时重构布局与交互，缺少“每步可回退验证点”。
  - 对 Radix 交互触发链理解不完整（`DropdownMenuTrigger` 在不同环境对 pointer/click 的触发差异），导致“更多菜单”在部分运行环境中点击无响应。
  - 选区分叉逻辑过度依赖 `anchorNode`，未覆盖反向选区与跨节点选区，导致分叉浮层在真实选择路径下丢失。
- 后果:
  - 出现用户可见的功能回退与交互不一致，测试未能第一时间拦截。
- 强制改进策略（必须执行）:
  - 每次 UI 重构后必须补充页面级回归测试，至少覆盖:
    - 侧栏折叠/展开（真实页面触发）。
    - 顶栏收藏与更多菜单可点击。
    - 回复文本选中后分叉浮层可见。
    - 输入区主按钮（+ 菜单、发送）可用。
  - 交互触发策略统一:
    - 对 Radix 触发器使用受控 `open/onOpenChange` 兜底，不依赖单一 pointer 事件链。
    - 对关键点击入口增加状态断言（如 `aria-expanded`、`aria-pressed`）与视觉态断言。
  - 异常日志与数据自愈:
    - 对存储读取/解析失败必须输出错误日志，并执行脏数据清除（不能静默失败）。
    - 对模型调用失败必须保留可见的降级反馈与日志上下文（会话 ID、节点 ID、消息 ID）。
  - 选区能力测试必须覆盖:
    - `selectionchange` 触发路径（无 mouseUp）。
    - 反向选区（anchor/focus 反转）。
    - 跨节点选区（通过 `Range` 定位目标消息容器）。
  - `sidebar-10` 对齐采用“三段校验”:
    - 结构对齐（组件层）。
    - 交互对齐（hover/active/open state）。
    - 视觉对齐（字体粗细、色阶、图标一致性）。
  - 对高风险改动（布局、交互入口）实行“先测后改再测”流程:
    - 改动前补回归用例。
    - 改动后通过 `npm run lint && npm test`。
    - 手动核验关键截图点位后再交付。
