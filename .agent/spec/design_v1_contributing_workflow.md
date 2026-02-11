# 设计 V1: 贡献协作规范

## 交付物
- `CONTRIBUTING.md`（中文主文档）
- `CONTRIBUTING.en.md`（英文文档）
- `.github/PULL_REQUEST_TEMPLATE.md`（PR 模板）
- `README.md` / `README.en.md` 增加贡献入口
- `AGENTS.md` 更新文档索引

## 规范重点
1. 分支规则
   - 功能分支统一前缀：`codex/`
   - 建议格式：`codex/<scope>-<topic>`
2. 提交规则
   - 推荐 Conventional Commits（`feat:` / `fix:` / `docs:` 等）
3. 合并前门禁
   - `npm test`
   - `npm run build`
   - `cargo build`（`src-tauri`）
4. PR 结构
   - 变更摘要、验证结果、风险、回滚方案、关联文档
5. Review Checklist
   - 需求对齐、边界处理、测试覆盖、文档同步、可维护性

## 风险控制
- 通过 PR 模板约束“测试与文档”项为必填，减少遗漏。
- 将命令和路径写死在文档中，避免模糊描述。
