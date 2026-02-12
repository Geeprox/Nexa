# 设计 V2: 自然语言视图规则（细化版）

## 目标
将用户输入 `rule_nl` 编译成稳定可执行的 `rule_json`，并提供预览、可解释与失败恢复能力。  
该设计直接对应 `V2-R1 ~ V2-R4` 实现切片。

## 现状对齐
1. 已有规则结构与执行器：`src/lib/views/rules.ts`。
2. 已有 `ViewRule` 类型定义：`src/lib/db/types.ts`。
3. `DatabaseAdapter` 已预留 `saveViewRule`，但 `InMemoryAdapter` 目前为 no-op，`SqliteAdapter` 尚未落表。
4. 当前 sqlite 采用“统一 schema 列表 + IF NOT EXISTS”方式，可通过追加语句完成 V2 增量。

## 总体架构
1. `Input Layer`
- 接收 `{ name, ruleNl }`。

2. `Compile Layer`
- `deterministic parser`（优先）。
- `llm compiler`（兜底）。
- `validator + canonicalizer`（强约束输出）。

3. `Persist Layer`
- `view_rules` 表保存已发布规则。
- `view_rule_revisions` 表保存最近可用历史版本（最小回滚）。

4. `Execute Layer`
- 读取实体标签集。
- 调用规则执行器产出命中实体及统计。

5. `Presentation Layer`
- 展示 `rule_nl`、结构化摘要、改写说明、错误信息。

## 规则模型（V2）
### AST
```ts
type RuleOperator = "AND" | "OR";

interface TagRuleNode {
  kind: "tag";
  tag: string;
}

interface GroupRuleNode {
  kind: "group";
  op: RuleOperator;
  children: Array<TagRuleNode | GroupRuleNode>;
}
```

### 持久化格式（canonical JSON）
```json
{
  "kind": "group",
  "op": "AND",
  "children": [
    { "kind": "tag", "tag": "研究方法" },
    {
      "kind": "group",
      "op": "OR",
      "children": [
        { "kind": "tag", "tag": "对比分析" },
        { "kind": "tag", "tag": "文献研究" }
      ]
    }
  ]
}
```

规范化规则：
1. `tag` 去前后空格并统一大小写策略（中文不变，英文字母小写）。
2. `children` 去重（按 `kind+tag` 或序列化摘要）。
3. 序列稳定化（同级按 `kind/tag/op` 排序）便于 diff 与测试。

## 编译链路
### Step 1 预处理
- 全角/半角统一、空白压缩、关键词归一（`and` -> `AND`）。

### Step 2 确定性解析（Parser）
- 支持 token：`(`, `)`, `AND`, `OR`, `TAG_TERM`。
- 运算优先级：`AND` 高于 `OR`。
- 解析失败输出语法错误（位置 + 原因）。

### Step 3 LLM 兜底编译
- 触发条件：
  - parser 失败。
  - parser 成功但置信度规则不满足（例如识别词元过少）。
- 输入：
  - 原始 `rule_nl`。
  - 标签词典（来自全局标签库，可选）。
  - 允许语法白名单（仅 AND/OR/group/tag）。
- 输出：
  - AST 草案 + `rewrite_note`。

### Step 4 校验与规范化
- 校验点：
  - 根节点必须为 `group`。
  - `children.length >= 1`。
  - `op` 仅允许 `AND | OR`。
  - 节点深度与节点数限制（默认 `maxDepth=8`, `maxNodes=128`）。
- 成功后生成 canonical JSON。

### Step 5 预览执行
- 在 Conversation + Note 标签集上执行，返回：
  - `totalHits`
  - `conversationHits`
  - `noteHits`
  - `sampleItems[]`

### Step 6 发布保存
- 写入 `view_rules` 当前版本。
- 同时写入 `view_rule_revisions`（保留最近 N 版，默认 `N=5`）。

## 数据模型与 SQL
### `view_rules`
```sql
CREATE TABLE IF NOT EXISTS view_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rule_nl TEXT NOT NULL,
  rule_json TEXT NOT NULL,
  parse_version TEXT NOT NULL,
  compile_source TEXT NOT NULL, -- deterministic | llm
  rewrite_note TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_view_rules_created_at ON view_rules(created_at);
CREATE INDEX IF NOT EXISTS idx_view_rules_updated_at ON view_rules(updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_view_rules_name_nocase ON view_rules(name COLLATE NOCASE);
```

### `view_rule_revisions`
```sql
CREATE TABLE IF NOT EXISTS view_rule_revisions (
  id TEXT PRIMARY KEY,
  view_rule_id TEXT NOT NULL,
  rule_nl TEXT NOT NULL,
  rule_json TEXT NOT NULL,
  parse_version TEXT NOT NULL,
  compile_source TEXT NOT NULL,
  rewrite_note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (view_rule_id) REFERENCES view_rules(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_view_rule_revisions_view_rule ON view_rule_revisions(view_rule_id, created_at DESC);
```

## Repository/API 设计
建议新增模块：
1. `src/lib/views/parser.ts`
- `parseRuleNl(input: string): ParseResult`
2. `src/lib/views/compiler.ts`
- `compileRule(input: CompileInput): Promise<CompileResult>`
3. `src/lib/views/validator.ts`
- `validateRuleAst(ast: unknown): ValidationResult`
4. `src/lib/views/repository.ts`
- `createViewRule`
- `listViewRules`
- `updateViewRule`
- `deleteViewRule`
- `listViewRuleRevisions`
5. `src/lib/views/executor.ts`
- `previewRuleExecution`
- `executeRuleOnEntities`

`CompileResult` 建议结构：
```ts
interface CompileResult {
  ok: boolean;
  ruleJson?: string;
  compileSource?: "deterministic" | "llm";
  rewriteNote?: string;
  errorCode?: "PARSE_ERROR" | "LLM_TIMEOUT" | "VALIDATION_ERROR";
  errorMessage?: string;
}
```

## 执行策略
1. 先聚合实体标签：
- `conversation -> tag[]`
- `note -> tag[]`
2. 调用统一 evaluator（复用 `evaluateRule` 或其扩展版）。
3. 仅返回预览所需字段，避免在 UI 侧做二次重计算。

## 错误处理与回退
1. 创建/更新失败时不覆盖当前可用规则。
2. 更新失败可一键回滚到最近 revision。
3. LLM 超时后返回 parser 草案或错误提示，不静默失败。

## 可观测性
新增事件（埋点或日志）：
1. `view_rule_compile_started`
2. `view_rule_compile_succeeded`
3. `view_rule_compile_failed`
4. `view_rule_preview_executed`
5. `view_rule_published`

关键指标：
- 编译成功率、LLM 回退率、预览耗时 p95、执行错误率。

## 测试矩阵
1. 单元测试
- parser（优先级、括号、空输入、非法 token）。
- validator（非法结构拒绝）。
- canonicalizer（去重、排序稳定）。

2. 仓储测试
- sqlite migration。
- `view_rules` CRUD。
- revision 保留与回滚。

3. 集成测试
- 创建 -> 预览 -> 发布 -> 编辑 -> 回滚闭环。
- Conversation/Note 双实体一致性。

4. 回归测试
- 不破坏 V1 标签、搜索、任务队列行为。

## 分阶段落地
1. `V2-R1`
- schema + repository + parser + validator。
2. `V2-R2`
- llm compiler + preview executor + error code。
3. `V2-R3`
- UI create/edit/delete + explain panel + revision 回滚。
4. `V2-R4`
- 性能优化 + 失败恢复 hardening + 指标看板接入。
