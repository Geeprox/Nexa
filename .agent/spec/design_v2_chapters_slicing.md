# 设计 V2: 章节系统切片（细化版）

## 目标
基于现有 `JobQueue + DatabaseAdapter` 实现章节自动生成闭环，覆盖“可生成、可跳转、可恢复、可观测”。

## 现状对齐
1. 已有任务队列：`src/lib/jobs/queue.ts`。
2. 已有 `jobs` 持久化能力：`src/lib/db/sqlite.ts`。
3. 已有模型路由：`src/lib/llm/router.ts`（可扩展 task type）。
4. 当前缺失：
- 章节表结构。
- 章节仓储与编排模块。
- 章节 UI。

## 架构分层
1. `Trigger Layer`
- 新消息到达或手动点击触发。

2. `Orchestrator Layer`
- 入队、节流、并发控制、状态回传。

3. `Generation Layer`
- 基于消息时间线生成章节草案（标题/摘要/锚点）。

4. `Persist Layer`
- 原子写入 `chapter_runs + chapters`。

5. `Presentation Layer`
- 章节列表、状态展示、跳转联动。

## 数据模型与 SQL
### `chapters`
```sql
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  start_node_id TEXT,
  end_node_id TEXT,
  start_message_id TEXT,
  end_message_id TEXT,
  version INTEGER NOT NULL,
  source_job_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (start_node_id) REFERENCES nodes(id) ON DELETE SET NULL,
  FOREIGN KEY (end_node_id) REFERENCES nodes(id) ON DELETE SET NULL,
  FOREIGN KEY (start_message_id) REFERENCES messages(id) ON DELETE SET NULL,
  FOREIGN KEY (end_message_id) REFERENCES messages(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_chapters_conversation_ordinal
  ON chapters(conversation_id, version, ordinal);
CREATE INDEX IF NOT EXISTS idx_chapters_conversation_version
  ON chapters(conversation_id, version DESC);
```

### `chapter_runs`
```sql
CREATE TABLE IF NOT EXISTS chapter_runs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- auto | manual
  status TEXT NOT NULL,       -- queued | running | failed | completed
  input_message_count INTEGER NOT NULL,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chapter_runs_conversation_created_at
  ON chapter_runs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chapter_runs_status
  ON chapter_runs(status, created_at DESC);
```

## 类型与接口设计
建议新增：
1. `src/lib/chapters/types.ts`
```ts
interface Chapter {
  id: string;
  conversationId: string;
  ordinal: number;
  title: string;
  summary: string;
  startNodeId: string | null;
  endNodeId: string | null;
  startMessageId: string | null;
  endMessageId: string | null;
  version: number;
  sourceJobId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

2. `src/lib/chapters/repository.ts`
- `listLatestChapters(conversationId)`
- `replaceChaptersVersion(conversationId, version, chapters)`
- `createChapterRun(triggerType, inputMessageCount)`
- `updateChapterRunStatus(runId, status, errorMessage?)`

3. `src/lib/chapters/orchestrator.ts`
- `enqueueIfNeeded(conversationId, options)`
- `enqueueAndWait(conversationId, triggerType)`

4. `src/lib/chapters/generator.ts`
- `generateChapters(input): Promise<GeneratedChapter[]>`

## 任务编排
新增任务类型：`generate_chapters`。

建议在 `router.ts` 添加：
```ts
type TaskType = ... | "generate_chapters";
defaultTaskRouting.generate_chapters = "low";
```

当 token 预算超过阈值时允许 fallback 到 `mid`（配置开关控制）。

## 章节生成流程（执行态）
1. 触发器判断是否满足阈值/节流。
2. 创建 `chapter_run(status=queued)`。
3. 入队 `generate_chapters`。
4. worker 执行：
- 标记 run `running`。
- 加载 conversation 节点与消息时间线。
- 生成章节草案。
- 校验锚点合法性。
- 计算新版本号并事务写入。
- 标记 run `completed`。
5. 失败分支：
- run `failed` + 记录错误信息。
- 不覆盖上一版 chapters。

## 触发与节流
默认配置：
1. `minIntervalMs = 60000`
2. `minNewMessages = 8`
3. `maxConcurrentPerConversation = 1`
4. `manualTriggerBypassThrottle = true`

## 增量重算策略
### 判定逻辑
1. 若新增消息均位于“最后一章尾部”之后，尝试局部重算最后 1-2 章。
2. 若新增消息跨越多个历史区域，直接全量重算。

### 回退逻辑
1. 局部重算失败 -> 自动回退全量重算一次。
2. 全量重算失败 -> 保留上一版并标记失败状态。

## 锚点规则
1. 每章必须有至少一个可定位锚点：
- 优先 `start_message_id/end_message_id`。
- 无消息锚点时使用节点锚点。
2. 锚点合法性校验：
- 锚点实体必须存在于当前 conversation。
- `start` 时间序不晚于 `end`。

## UI 接入设计
1. `ChapterList`（侧边或次级面板）
- 显示章节序号、标题、摘要（截断）。
- 显示状态徽标：`ready | generating | failed`。
2. 交互
- 点击章节 -> 设置 `activeNodeId + focusedMessageId`。
- 失败状态显示“重试”按钮。
3. 兼容移动端
- 在 compact 布局下沿用抽屉模式显示章节列表。

## 错误码建议
1. `CHAPTER_TRIGGER_THROTTLED`
2. `CHAPTER_INVALID_ANCHOR`
3. `CHAPTER_GENERATION_TIMEOUT`
4. `CHAPTER_PERSIST_FAILED`

## 可观测性
埋点/日志：
1. `chapter_run_enqueued`
2. `chapter_run_started`
3. `chapter_run_completed`
4. `chapter_run_failed`
5. `chapter_jump_clicked`

指标：
- run 成功率、平均耗时、p95 耗时、失败类型分布、重试成功率。

## 测试矩阵
1. 单元测试
- 节流判定。
- 锚点合法性校验。
- 版本号增长与局部/全量选择逻辑。

2. 集成测试
- sqlite migration。
- run 状态流转与失败回退。
- 版本替换写入原子性。

3. UI 测试
- 目录渲染、章节高亮、跳转定位、失败重试。

4. 回归测试
- 不影响 V1 标签、搜索、分叉图谱交互。

## 实施顺序
1. `V2-C1`
- schema + types + repository + run lifecycle。
2. `V2-C2`
- orchestrator + generator + auto trigger。
3. `V2-C3`
- ChapterList UI + 跳转联动 + 手动重试。
4. `V2-C4`
- 增量重算优化 + 指标 + 失败恢复 hardening。
