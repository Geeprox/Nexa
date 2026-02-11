# 设计 V1: 分层模型配置与任务委派

## 架构概要
- Provider 抽象层统一 OpenAI 兼容协议。
- ModelProfile 管理高/中/低配置。
- TaskRouter 根据任务类型选择模型层。

## 数据模型草案
- ModelProfile { id, tier, provider, base_url, api_key_ref, model_id, created_at }
- TaskType { id, name }
- TaskRouting { task_type_id, tier }

## 任务类型建议
- chat_stream: high
- summarize_node: low
- summarize_conversation: mid
- background_index: low
- auto_tag_entity: low

## 运行流程
1. 任务触发 -> 读取 TaskRouting。
2. 选定 ModelProfile。
3. 调用 Provider 统一接口。

## 安全
- API Key 本地加密存储。
- 不将 key 写入日志。

## 扩展预留
- 支持多供应商适配器。
- 支持“高/低”两档模式。
