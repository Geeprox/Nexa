# 设计 MVP: Chat + Branch 收口（2026-02）

## 1. 设计目标
将 MVP 主链统一为可维护架构：
- 单一工作区状态源。
- 聊天/图谱可共享同一会话快照。
- Mock provider 行为贴近真实 API 调用形态。
- 关键异常可观测，持久化有自愈机制。

## 2. 模块与职责
## 2.1 `src/app/page.tsx`
- 编排工作区数据：会话、当前会话、笔记、模型设置。
- 路由式切换主视图：`ask-ai` / `conversations` / `notes` / `search`。
- 统一处理：发送、重试、分叉引用态、记笔记、节点拖拽、设置保存。

## 2.2 `src/components/chat/ChatPane.tsx`
- 线性聊天消息渲染与输入区。
- assistant 消息分组展示（按 `replyToMessageId`）。
- Retry 版本切换控制。
- 回复动作区（Copy/Retry/Share/Create Branch/Take Note）。
- 选区浮层动作（Create branch from selection / Take note from selection），仅在鼠标释放后触发。

## 2.3 `src/components/chat/ChatComposer.tsx`
- 输入条组件，支持引用态（输入框上方展示引用内容 + 清除按钮）。
- 在线性模式与拓扑模式复用。

## 2.4 `src/components/graph/GraphPane.tsx`
- React Flow 节点渲染、拖拽与激活切换。
- 节点卡片展示：单个 Q-A Pair（动态高度，不截断）、消息数、时间。
- 支持在节点内选中文本后触发分叉/记笔记浮层。

## 2.5 `src/components/layout/Sidebar.tsx`
- 导航主入口：搜索、Ask AI、全部对话、全部笔记、设置。
- 会话列表快捷切换与新建会话。
- 样式与交互对齐 shadcn sidebar-10 基线。

## 2.6 `src/components/layout/TopBar.tsx`
- 左侧：侧栏触发器 + 当前标题。
- 右侧：日期、收藏切换、更多菜单（dropdown）。
- 收藏状态使用 `aria-pressed` 作为测试与可访问性断言。

## 2.7 `src/components/settings/SettingsModal.tsx`
- 弹层形式提供模型服务商配置。
- 保存后更新工作区中的 provider 配置。

## 2.8 `src/lib/session/workspaceState.ts`
- 工作区状态 schema 规范化、读取、保存、清理。
- 从 legacy `conversationSnapshot` 迁移到 `workspaceState`。
- 脏数据自动移除，避免刷新异常。

## 2.9 `src/lib/llm/mockProvider.ts`
- 提供 async generator 流式接口。
- 入参保留 provider URL 与 key，接口形式与真实 provider 对齐。
- 支持中断信号与日志。

## 2.10 `src/lib/logging/logger.ts`
- 统一 `info/warn/error` 输出格式。
- 页面层挂接全局错误事件并上报。

## 3. 数据结构
## 3.1 工作区状态
`WorkspaceState`:
- `version: 2`
- `conversations: WorkspaceConversation[]`
- `activeConversationId: string`
- `notes: WorkspaceNote[]`
- `modelProvider: { providerUrl, apiKey }`

## 3.2 会话快照
`ConversationSnapshot`:
- `nodes[]`
- `messagesByNode`
- `activeNodeId`
- `conversationTags[]`（保留字段）
- `dismissedAutoTags[]`（保留字段）

## 3.3 消息模型
`ChatMessage`:
- `role: user | assistant`
- `replyToMessageId`（assistant 归组）
- `retryIndex`（版本号）
- `isStreaming`（流式状态）
- `quotedText/quotePreview`（分叉引用上下文展示）
- `quotedMessageId/quotedNodeId`（引用来源定位）

## 4. 关键流程
## 4.1 发送消息
1. 线性模式下：用户消息追加到线性消息流。
2. 拓扑模式下：以当前激活节点为父节点新建 Q-A Block。
3. 若存在分叉引用态，则优先使用引用来源作为父节点并携带引用上下文。
4. 插入 streaming assistant 占位消息并逐 chunk 更新，完成后 `isStreaming=false`。

## 4.2 Retry
1. 找到目标 user prompt 与历史 assistant 版本。
2. 新版本插入到该组末尾。
3. 默认选中最新版本，支持左右切换。

## 4.3 创建分叉
1. 用户触发分叉后不立即建节点，先进入引用态。
2. 非选区分叉使用来源消息前 100 字作为引用预览；选区分叉使用选中文案。
3. 用户发送追问后才创建新 Q-A Block，并将引用信息写入用户消息。
4. 首次分叉发送时，先将线性消息重排为“一问一答链”，再挂接新分叉块。

## 4.4 记笔记
1. 从消息动作或选区浮层生成 Note。
2. 按时间倒序插入工作区笔记集合。
3. 在 NotesPane 渲染并显示来源会话。

## 4.5 持久化与自愈
1. 每次状态关键变更后保存工作区。
2. 读取失败或 schema 不合法时：
   - 记录日志。
   - 清理坏数据。
   - 尝试从 legacy 迁移。

## 5. 异常与日志策略
- 必须记录：
  - 全局运行时错误。
  - 存储 parse/save 异常。
  - mock provider 中断/失败。
  - 复制失败等关键交互错误。
- 日志建议附带上下文：`conversationId/nodeId/messageId`。

## 6. 测试策略
## 6.1 页面级回归
- 侧栏折叠/展开。
- 分叉触发后进入引用态（未发送前不切拓扑）。
- 发送后切换拓扑，且主区不再展示线性聊天历史面板。
- 图谱模式下输入框可持续发送并新增 Q-A Block。
- 全部会话切换。
- 笔记记录与展示。
- 设置弹层保存。
- 顶栏收藏与更多菜单。

## 6.2 组件级
- ChatPane: 动作按钮、选区浮层、Retry 切换。
- GraphPane: 节点摘要信息渲染、节点激活/移动。
- Sidebar/TopBar: 关键交互可点击。

## 6.3 状态层
- Workspace 迁移、schema 清理、自愈保存。

## 7. 后续扩展预留
- provider adapter 可直接替换 mock 实现，保留接口不变。
- Notes 可继续扩展标签和回链定位。
- 图谱区可增加节点详情抽屉，不破坏当前布局。
