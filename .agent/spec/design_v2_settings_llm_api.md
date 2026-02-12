# 设计 V2: 设置页与 LLM API 配置

## 目标
把当前侧栏 `设置` 占位入口升级为可用配置页，承接真实 LLM API 接入所需的所有关键参数。

## 页面结构
- 路由建议: `/settings`。
- 页面分区:
  1. `API Provider`
  2. `Connection`
  3. `Model Tiers`
  4. `Runtime Defaults`
  5. `Danger Zone`（重置）

## 信息架构
### 1) API Provider
- `providerType`: `openai-compatible`（V2 首版）

### 2) Connection
- `baseUrl`: string
- `apiKey`: secret string
- `organization`: optional string
- `project`: optional string
- `testConnection`: action

### 3) Model Tiers
- `tierHigh.model`
- `tierMedium.model`
- `tierLow.model`
- 可选:
  - `tier*.temperature`
  - `tier*.maxTokens`

### 4) Runtime Defaults
- `defaultTierForChat`（例如 `medium`）
- `defaultTierForBackground`（例如 `low`）

## 数据模型建议
```ts
interface LlmSettings {
  providerType: "openai-compatible";
  baseUrl: string;
  apiKeyMaskedHint?: string;
  apiKeyEncrypted?: string;
  organization?: string;
  project?: string;
  tiers: {
    high: { model: string; temperature?: number; maxTokens?: number };
    medium: { model: string; temperature?: number; maxTokens?: number };
    low: { model: string; temperature?: number; maxTokens?: number };
  };
  defaults: {
    chatTier: "high" | "medium" | "low";
    backgroundTier: "high" | "medium" | "low";
  };
  updatedAt: string;
}
```

## 存储策略
- V2 Web/Tauri 共用抽象:
  - `SettingsRepository` 负责读取/写入。
- 存储层分层:
  1. 非敏感字段（普通配置）可用 `localStorage/SQLite`。
  2. 敏感字段（API Key）优先走 Tauri 安全存储（若不可用则采用加密后本地存储 + 脱敏显示）。

## 表单与校验
- `baseUrl`:
  - 必填，必须是合法 URL。
- `apiKey`:
  - 必填；显示掩码；支持显隐。
- `tier model`:
  - 三档必填；不允许空字符串。
- `temperature`:
  - 可选，范围 `0~2`。
- `maxTokens`:
  - 可选，正整数。

## 连接测试流程
1. 用户点击 `Test Connection`。
2. 前端调用 `llmRouter.healthCheck(settings)`（建议新增）。
3. 返回:
  - `ok=true`: 展示成功反馈。
  - `ok=false`: 展示错误分类（认证失败/网络失败/模型不可用）。

## 与现有调用链整合
- `src/lib/llm/router.ts` 新增 `resolveRuntimeConfig()`：
  - 从 `SettingsRepository` 读取配置并组装 provider 参数。
- 调用入口若无可用配置，返回结构化错误:
  - `code: "LLM_SETTINGS_MISSING"`
  - `message: "请先在设置页完成 API 配置"`

## UI 行为细节
- 保存按钮状态:
  - 初始禁用（无修改）。
  - 修改后可保存。
  - 保存中显示 loading。
- 离开保护:
  - 有未保存改动时提示确认。
- 重置:
  - Danger Zone 中二次确认后执行。

## 测试矩阵
1. 单元测试
- 表单校验规则。
- `SettingsRepository` 序列化/反序列化。
- `resolveRuntimeConfig` 读取优先级。

2. 集成测试
- 点击设置入口 -> 打开设置页。
- 保存配置 -> 刷新恢复。
- 测试连接成功/失败路径。

3. 回归测试
- 不影响 V1 聊天 Mock 闭环。
- 不影响会话快照与分叉逻辑。

## 分阶段实施建议
1. V2-S1: 设置页路由 + 基础表单 + 本地持久化。
2. V2-S2: 连接测试 + 错误分类。
3. V2-S3: 调用链读配置 + 缺失配置引导。
4. V2-S4: 敏感信息安全增强（Tauri secure storage 接入）。
