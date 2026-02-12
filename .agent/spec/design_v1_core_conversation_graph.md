# 设计 V1: 分叉对话与图谱画布（更新版）

## 架构概要
- 前端: Next.js + React。
- 图谱引擎: React Flow。
- 会话快照: `localStorage`（`conversationSnapshot`）。
- 回复策略: 本地 Mock 模板 + 定时分片流式输出。

## 组件划分
- `Sidebar`：主导航、Favorites、Settings（移除登录占位与冗余搜索输入）。
- `TopBar`：动态标题 + `sidebar-10` 风格 `NavActions`（`Edit Oct 08` + Star + More）。
- `ChatPane`：聊天渲染、输入发送、重试版本切换、分叉入口。
- `GraphPane`：分支图谱渲染、节点拖拽、节点聚焦。
- `HomePage`：状态编排（消息、节点、视图切换、快照持久化）。

## 数据模型（前端态）
- `GraphNode { id, parentId, title, createdAt, position }`
- `ChatMessage { id, nodeId, role, content, replyToMessageId?, retryIndex?, isStreaming? }`
- `BranchCreatePayload`
  - `mode="clone"`: 从回复气泡创建分叉，克隆上下文。
  - `mode="selection"`: 从选中文字创建分叉，克隆上下文并追加强调消息。

## 流式 Mock 设计
1. 发送或重试触发 `startStreamingAssistantReply`。
2. 先插入空内容 assistant 消息（`isStreaming=true`）。
3. `setInterval` 按随机 chunk 长度推进文本。
4. 完成后置 `isStreaming=false` 并清理定时器。
5. 页面卸载时统一清理所有活跃定时器。

## 重试版本设计
- assistant 消息通过 `replyToMessageId` 绑定到同一用户问题。
- 同一组内以 `retryIndex` 递增表示版本。
- UI 默认显示最新版本；若组内有多个版本，显示 `< n / m >` 导航控制。
- `Retry` 新消息插入到该组最后一条 assistant 后，保证同组连续展示。

## 分叉流程设计
### A. 气泡分叉（Clone）
1. 定位来源消息。
2. 克隆从根到来源消息的上下文。
3. 重映射消息 ID 与 `replyToMessageId`。
4. 创建新节点并挂到 `parentId=sourceNodeId`。

### B. 选中文本分叉（Selection）
1. 在 assistant 气泡内选中文本后显示悬浮 `分叉`。
2. 先执行上下文克隆。
3. 在新分支末尾追加用户强调消息：
   - 包含选中文案。
   - 明确“最高优先级上下文”约束。

## 视图切换策略
- `hasBranches=false`：渲染 `ChatPane`。
- `hasBranches=true`：渲染 `GraphPane`。
- 切换条件由节点集合是否存在 `parentId!=null` 驱动。

## 顶部标题策略（架构预留）
- `TopBar` 接收外部 `title`，不内置固定会话文案。
- 由页面根据侧栏选中状态映射标题：
  - `Ask AI/全部对话`：展示当前会话标题（由内容摘要生成）。
  - `全部笔记`：展示“全部笔记”。
  - `搜索`：展示“搜索”。

## 可访问性与键盘
- 选中文本分叉支持 `Cmd/Ctrl + Enter`。
- `TopBar` More 菜单支持 `ArrowUp/Down/Home/End/Escape`。
- icon-only 按钮均配置语义标签（`aria-label`）。

## 风险与缓解
- 定时器竞争：通过 `messageId -> timerId` 映射统一清理。
- 快照兼容：`PersistedMessage` 扩展可选字段，兼容旧结构。
- 分叉上下文错位：克隆时全量 ID 重映射避免引用断链。

## 扩展预留
- 将 Mock 回复替换为真实 LLM API 仅需替换回复生成层。
- `Share` 按钮保留占位，后续可挂接图片生成分享。
- 图谱模式可扩展“节点详情/继续对话”双栏布局。
