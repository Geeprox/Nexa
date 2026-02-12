# 设计 V1: 高亮笔记与关键词搜索（更新版）

## 设计目标
在不干扰当前聊天主流程的前提下，保留笔记与关键词搜索能力的扩展基础。

## 当前落地策略
- UI
  - 侧栏移除顶部搜索输入框。
  - 保留 `搜索` 与 `全部笔记` 导航项作为一级入口。
- 数据
  - 搜索仓储与笔记引用模型继续保留。
  - 可在后续页面复用现有查询接口。

## 数据模型（沿用）
- `Note { id, title, content, source_node_id, source_message_id, created_at }`
- `Highlight { id, note_id, message_id, range_start, range_end, selected_text }`
- 搜索索引对象：`Message.content`, `Note.content`, `Node.summary`

## 查询能力
- 关键词查询逻辑保留在仓储层。
- 结果对象需包含来源定位信息：
  - 对话命中：`nodeId + messageId`
  - 笔记命中：`noteId + sourceNodeId + sourceMessageId`

## 交互分层
- V1 当前层：导航入口层（无重复输入）。
- V2 目标层：独立搜索视图层（输入、筛选、结果定位）。

## 风险与控制
- 风险：入口存在但搜索面板未完整，用户感知“未完成”。
- 控制：在 V2 计划中将“独立搜索视图”作为明确切片，并保持已有数据层可复用。
