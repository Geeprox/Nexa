# 设计 V1: 标签与视图 (Project)

## 架构概要
- Conversation 与 Note 为一等实体。
- Tag 作为轻量组织层。
- 自动标签通过后台任务生成并可被用户移除。
- 视图能力 V1 不实现，但预留结构化过滤规则与自然语言映射接口。

## 数据模型草案
- Tag { id, name, created_at }
- Tagging { id, tag_id, entity_type, entity_id, source, confidence, created_at }
  - entity_type: conversation | note
  - source: manual | auto
- ViewRule (预留) { id, name, rule_json, rule_nl, created_at }
  - rule_nl: 原始自然语言规则
  - rule_json 示例: { "tags": ["论文","对比"], "mode": "AND" }
  - rule_json 未来可扩展: { "op": "AND", "children": [ ... ] }

## 标签流程
1. 用户为 Conversation/Note 选择标签。
2. 写入 Tagging 记录 (source=manual)。
3. LLM 后台任务生成 Tagging (source=auto, confidence)。

## 视图流程 (未来扩展)
1. 用户输入自然语言规则或选择标签组合。
2. LLM 将规则映射为 rule_json。
3. 视图列表渲染筛选结果。

## 自动标签任务
- 任务类型: auto_tag_entity
- 默认使用低成本模型 (可在设置中配置)。
- 默认对所有新增内容或内容更新触发。
- 系统标签只允许删除，不支持转换为手动标签。

## 导出格式预留 (V1 不实现)
- 单空间导出目录结构:
  - index.json
  - conversations/
  - notes/
  - assets/
- index.json 包含 tags 与 views 的索引。
- conversations/{conversation_id}.json 包含节点树与消息。
- notes/{note_id}.json 保存笔记与高亮引用。
- tags.json 保存标签与 Tagging 关系。

## 对话树 JSON 结构草案
- conversation:
  - id, title, created_at
  - tags: [tag_id]
  - nodes: [ { id, parent_id, summary, position, messages: [...] } ]
  - edges: [ { source_id, target_id } ]
