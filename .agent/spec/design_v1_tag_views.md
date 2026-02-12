# 设计 V1: 标签与视图（更新版）

## 设计目标
在不影响当前核心交互（聊天、流式、分叉、图谱切换）的前提下，保留标签体系与视图规则的完整扩展路径。

## 当前策略
- UI 策略
  - 侧栏下线标签管理区。
  - 仅保留 `设置` 按钮作为后续配置入口。
- 数据策略
  - `Tag / Tagging / ViewRule` 相关模型保持不变。
  - 自动标签流水线与测试用例保持可运行。

## 数据模型（保留）
- `Tag { id, name, created_at }`
- `Tagging { id, tag_id, entity_type, entity_id, source, confidence, created_at }`
  - `entity_type`: `conversation | note`
  - `source`: `manual | auto`
- `ViewRule (预留) { id, name, rule_json, rule_nl, created_at }`

## 入口延后设计
- 当前不提供标签管理 UI，但预留两条入口路径：
  1. `Settings` 页面入口（全局策略、自动标签开关、阈值等）。
  2. 内容详情入口（单条 Conversation/Note 的标签编辑）。

## 自动标签链路
1. 内容变更后触发 auto-tag 任务。
2. 生成系统标签（`source=auto`）。
3. 支持删除系统标签（不支持转换为手动）。
4. 结果写回标签关系存储。

## 与视图规则的耦合点
- `ViewRule` 执行层统一读取 `manual + auto` 标签。
- `rule_nl` 与 `rule_json` 双轨持久化保持不变。
- `NOT` 语义是否进入 V2 仍作为待确认项。

## 风险与控制
- 风险：UI 无入口导致能力“不可见”。
- 控制：在 V2 设置页文档中明确补齐计划，并在 AGENTS 决策中记录“入口后置”。
