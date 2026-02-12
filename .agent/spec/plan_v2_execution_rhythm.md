# V2 Execution Rhythm Plan

## Purpose
定义 V2 执行节奏，聚焦三条主线：
- 自然语言视图规则（NL View Rules）
- 章节系统切片（Chapter Slices）
- 设置页与 LLM API 配置（Settings + LLM API）

本计划承接 V1 完成态（截至 2026-02-11），用于统一迭代拆分、里程碑验收与风险管理。

## Scope (V2)
- 交付自然语言规则到结构化视图规则的可用闭环。
- 交付设置页与模型 API 配置的可用闭环。
- 交付章节自动生成、目录跳转、失败恢复的可用闭环。
- 不引入 Workspace/Project，不改变 Conversation/Note 一等公民定位。

## Cadence
- 节奏单位：1 迭代 = 1 周 = 1 个可验收能力切片。
- 每个迭代必须包含：
  - 可演示的用户能力。
  - 测试补充与回归验证。
  - `npm test` 通过。
  - 文档（PRD/设计/计划）同步更新。

## Milestones
- M6 自然语言视图规则（预计 3 周）
  - M6.1: 规则存储与确定性解析底座（V2-R1）
  - M6.2: LLM 编译 + 校验 + 预览（V2-R2）
  - M6.3: 视图管理 UI 与可解释性（V2-R3）

- M7 设置页与 LLM API 配置（预计 2 周）
  - M7.1: 设置页路由与表单持久化（V2-S1）
  - M7.2: 连接测试与调用链接入（V2-S2/V2-S3）

- M8 章节系统切片（预计 3 周）
  - M8.1: 章节 schema + repository + 手动任务入口（V2-C1）
  - M8.2: 自动章节任务与节流（V2-C2）
  - M8.3: 章节目录 UI 与跳转联动（V2-C3）

- M9 稳定化与发布准备（预计 2 周）
  - M9.1: 规则与章节异常恢复、性能优化（V2-R4 + V2-C4）
  - M9.2: 设置链路安全强化（V2-S4）+ 回归测试、发布清单与交接文档

## Iteration Timeline (Draft)
- I0 Kickoff（2026-02-11 ~ 2026-02-13）
  - 目标：冻结 V2 PRD/设计与切片边界。
  - 产物：`prd_v2_*`、`design_v2_*`、`plan_v2_execution_rhythm.md`。

- I1（2026-02-16 ~ 2026-02-20）
  - 目标：V2-R1（view_rules schema + parser baseline）。

- I2（2026-02-23 ~ 2026-02-27）
  - 目标：V2-R2（LLM 编译 + validator + preview）。

- I3（2026-03-02 ~ 2026-03-06）
  - 目标：V2-R3（视图管理 UI + explain）。
  - 里程碑：M6 完成。

- I4（2026-03-09 ~ 2026-03-13）
  - 目标：V2-S1（设置页路由 + 配置持久化）。

- I5（2026-03-16 ~ 2026-03-20）
  - 目标：V2-S2/S3（连接测试 + 调用链接入）。
  - 里程碑：M7 完成。

- I6（2026-03-23 ~ 2026-03-27）
  - 目标：V2-C1（章节数据与手动任务链路）。

- I7（2026-03-30 ~ 2026-04-03）
  - 目标：V2-C2（自动生成 + 节流 + 可观测性）。

- I8（2026-04-06 ~ 2026-04-10）
  - 目标：V2-C3（目录 UI + 跳转联动）。
  - 里程碑：M8 完成。

- I9（2026-04-13 ~ 2026-04-17）
  - 目标：V2-R4/C4/S4（异常恢复、安全强化、性能优化、全链路回归）。
  - 里程碑：M9 完成。

## Quality Gates
- 覆盖率目标：statements/functions/lines `>= 80%`，branches `>= 70%`。
- 每个切片必须有测试与文档，无“仅代码交付”。
- 新增任务类型、表结构、迁移必须有回滚与兼容说明。

## Session Protocol (V2)
- Session Start
  - 读取 `AGENTS.md`、`plan_v2_execution_rhythm.md`。
  - 运行 `npm test` 验证基线。
  - 锁定当期迭代目标（仅一个主切片 in-progress）。

- Session End
  - 运行 `npm test`。
  - 更新当期迭代状态与风险。
  - 同步 PRD/设计中的变更决策。
  - 通过后可执行 `npm run commit:auto -- "<title>"`。

## Current Next Task
- I1 / V2-R1: 完成 `view_rules` schema、repository、deterministic parser 与对应测试。
