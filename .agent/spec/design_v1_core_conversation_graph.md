# 设计 V1: 分叉对话与图谱画布

## 架构概要
- 前端框架: Next.js + React
- 图谱引擎: React Flow
- 数据层: SQLite (通过 Tauri 端口或本地服务)

## 组件划分
- ConversationPane: 线性聊天窗口
- GraphCanvas: 图谱画布
- NodeCard: 节点卡片展示摘要
- BranchAction: 选中文本后的分叉入口

## 数据模型草案
- Conversation { id, title, root_node_id, created_at }
- Node { id, conversation_id, parent_id, summary, status, pos_x, pos_y, created_at }
- Edge { id, conversation_id, source_id, target_id }
- Message { id, node_id, role, content, created_at }
- Selection { id, message_id, range_start, range_end, created_at }

## 分叉流程
1. 用户在回答内选中文本。
2. 创建 Selection 记录。
3. 新建 Node 并关联 parent_id。
4. 生成 Edge 连接父节点。
5. 图谱插入节点并定位在父节点右侧。

## 布局策略
- 初始布局采用“父右子”简单网格。
- 节点数量增加后允许手动拖拽覆盖自动布局。
- 可预留自动布局策略扩展点。

## 交互细节
- 拖拽: 节点位置实时写入 Node.pos_x/pos_y。
- 缩放与平移: 画布状态本地存储并按会话恢复。
- 聚焦: 点击节点将聊天视图切换到该分支。

## 性能
- 节点渲染使用虚拟化。
- 画布缩放与拖拽尽量走 transform.

## 扩展预留
- 为章节系统预留 Node.summary 与 Conversation.summary 字段。
- 后台任务表 Job 预留节点摘要计算任务。
