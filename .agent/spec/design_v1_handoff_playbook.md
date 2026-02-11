# 设计 V1: 交接与维护手册

## 设计目标
把 V1 的“运行知识、维护知识、发布知识”沉淀为可复用文档，降低会话依赖和单点维护风险。

## 交付结构
- `docs/HANDOFF.md`：中文主文档（默认入口）。
- `docs/HANDOFF.en.md`：英文镜像文档。
- `README.md` / `README.en.md`：增加 handoff 跳转入口。
- `AGENTS.md`：更新文档索引与关键流程说明。
- `.agent/spec/plan_v1_execution_rhythm.md`：里程碑状态更新。

## 文档信息架构
1. 当前交付范围（V1 能力边界）
2. 本地开发与验证命令
3. 核心模块索引（UI/Domain/Infra）
4. 发布流程（脚本、产物、manifest）
5. 常见维护任务（改模型路由、改自动标签、改搜索、改桌面行为）
6. 故障排查手册
7. V2 扩展建议

## 关键实现约束
- 文档中所有命令必须可直接执行，不使用伪代码命令。
- 发布链路以脚本为中心：
  - `./scripts/dev-macos.sh`
  - `./scripts/build-macos.sh`
  - `./scripts/collect-macos-artifacts.cjs`
- 产物清单固定位置：
  - `dist/releases/macos/latest.json`

## 维护机制
- 每次迭代结束必须执行：
  - `npm test`
  - `npm run build`
  - `cargo build`
- 如功能边界或发布流程变化：
  - 先更新 `AGENTS.md` 再更新 handoff 文档。

## 风险控制
- `.dmg` 打包在不同 macOS 环境可能失败：
  - 先保证 `.app` 稳定产出；
  - manifest 对 `.dmg` 采用可选字段。
- 通过测试门禁防止维护文档与实现偏离。
