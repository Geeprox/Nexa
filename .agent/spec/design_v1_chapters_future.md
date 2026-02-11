# 设计: 自动章节生成 (V2，V1 预留)

## 架构概要
- Chapter 作为 Conversation 的子实体。
- Job 表支持章节生成与重算。
- 使用低成本模型完成章节分析。

## 数据模型草案
- Chapter { id, conversation_id, title, summary, start_node_id, end_node_id, created_at }
- Job { id, type, payload, status, created_at }

## 触发策略建议
- 每次回答完成后触发。
- 节流: 消息数量或字数阈值。
- 手动触发入口。

## 章节生成流程
1. Job 入队。
2. 低成本模型生成章节划分与摘要。
3. 写入 Chapter 表。
4. 更新章节目录索引。

## 扩展预留
- 章节版本控制。
- 章节编辑与手动调整。
