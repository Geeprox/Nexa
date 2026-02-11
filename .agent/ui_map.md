# UI Map (Nexa)

## Page Layout
- Root layout: `src/app/page.tsx`
  - Sidebar: `Sidebar` component
  - Top bar: `TopBar` component
  - Chat pane: `ChatPane` component
  - Graph pane: `GraphPane` component

## Sidebar
- File: `src/components/layout/Sidebar.tsx`
- Elements
  - App badge: "N" icon block
  - App title: "Nexa"
  - Subtitle: "研究与沉淀"
  - Search placeholder: "搜索对话或标签"
  - Nav items:
    - "全部对话"
    - "收藏"
    - "自动标签"
    - "标签"
  - Footer hint: "标签将用于生成智能视图"

## Top Bar
- File: `src/components/layout/TopBar.tsx`
- Elements
  - Title: "深度研究会话"
  - Status pill: "自动标签已开启"
  - Buttons:
    - "切换布局"
    - "生成标签"
    - "导出"
    - Settings icon button

## Chat Pane
- File: `src/components/chat/ChatPane.tsx`
- Elements
  - User bubble (right, secondary): example text "如何用 LLM 做文献对比？"
  - Assistant bubbles (left, white): example text
  - Selection popover: select assistant text, then click "分叉"
  - Input placeholder: "输入你的追问，支持流式回答与即时分叉"

## Graph Pane
- File: `src/components/graph/GraphPane.tsx`
- Elements
  - Header: "对话图谱"
  - Mode hint: "拖拽 / 缩放"
  - Canvas: React Flow graph canvas (drag, zoom, pan)
  - Node cards (dynamic): root + runtime branch nodes
  - Helper text: "点击聚焦到该分支"
