# PRD V1: GitHub 与 CI/CD 准备

## 背景
项目将开源发布，需要具备标准 LICENSE、自动化质量检查与基础发布流水线，以保证外部贡献可控、主干质量稳定。

## 目标
- 增加标准开源许可证文件（AGPLv3）。
- 预置 GitHub Actions：
  - PR/主干的 CI 质量检查。
  - macOS 发布构建流水线（基础版）。
- 提供仓库发布脚本，降低首次推送 GitHub 的操作成本。

## 非目标
- 不实现完整签名/公证流程。
- 不实现多平台安装包发布（先聚焦 macOS）。

## 功能需求
- 仓库根目录包含 `LICENSE`（AGPLv3）。
- `/.github/workflows/ci.yml`：
  - push/pull_request 触发。
  - 执行 `npm test`、`npm run build`、`cargo build`。
- `/.github/workflows/release-macos.yml`：
  - tag 或手动触发。
  - 构建 macOS `.app`，上传产物与 manifest。
- 发布脚本：
  - `./scripts/publish-github.sh` 支持创建仓库并推送。

## 验收标准
- 本地脚本和工作流配置文件就绪。
- 文档（README/AGENTS）包含 CI/CD 入口说明。
