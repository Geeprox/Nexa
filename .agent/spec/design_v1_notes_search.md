# 设计 V1: 高亮笔记与关键词搜索

## 架构概要
- 数据存储: SQLite + FTS5
- 索引对象: Message, Note, Node.summary

## 数据模型草案
- Note { id, title, content, source_node_id, source_message_id, created_at }
- Highlight { id, note_id, message_id, range_start, range_end, selected_text }
- Tag { id, name }
- Tagging { id, tag_id, entity_type, entity_id, source, confidence, created_at }

## 标注写入流程
1. 用户选中文本，记录 range_start, range_end。
2. 创建 Highlight。
3. 自动生成 Note，content 为选中文本 + 上下文摘要。

## 搜索实现
- 建立 FTS5 表覆盖 Message.content 与 Note.content。
- 搜索结果返回引用对象类型与 id。

## 定位策略
- 对话与节点结果: 跳转到对应节点。
- 笔记结果: 打开笔记并显示来源。

## 风险控制
- 消息内容变更导致 range 失效时，采用 selected_text 回退匹配。

## 扩展预留
- 预留向量索引表。
- 预留富文本格式字段。
