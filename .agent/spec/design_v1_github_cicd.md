# 设计 V1: GitHub 与 CI/CD 准备

## 交付清单
- `LICENSE`（AGPLv3 正文）
- `/.github/workflows/ci.yml`
- `/.github/workflows/release-macos.yml`
- `./scripts/publish-github.sh`
- README/AGENTS 同步说明

## CI 设计
- `web-quality`（ubuntu）：
  - `npm ci`
  - `npm test`
  - `npm run build`
- `tauri-compile`（macos）：
  - Rust toolchain + cache
  - `cargo build`（`src-tauri`）

## Release 设计
- 触发：
  - `workflow_dispatch`
  - `push tag v*`
- 流程：
  - `npm ci`
  - `./scripts/build-macos.sh --skip-install --skip-tests`
  - 读取 `dist/releases/macos/latest.json`
  - 压缩 `.app` 并上传 artifact
  - tag 触发时发布 GitHub Release 附件

## 发布脚本设计
- `scripts/publish-github.sh`：
  - 参数：`--repo <owner/name> [--public|--private]`
  - 若无 remote：调用 `gh repo create ... --push`
  - 若已有 remote：直接 `git push`
  - 未登录时给出明确提示（`gh auth login`）

## 风险与限制
- 当前环境未认证 GitHub CLI 时无法直接完成远端创建与推送。
- `.dmg` 仍为后续增强项，当前发布主线以 `.app` 为准。
