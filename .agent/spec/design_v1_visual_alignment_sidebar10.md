# 设计 V1: 与 shadcn `sidebar-10` 的视觉对齐差异清单

## 1. 对齐基线
- 参考模板: `shadcn@latest` 的 `sidebar-10` (通过 `npx shadcn@latest view sidebar-10` 与 `view sidebar` 获取源码)。
- 对齐目标: 保持 Nexa 的产品语义 (研究/分叉/沉淀) 不变，吸收 `sidebar-10` 的视觉密度、层级方式、交互克制与配色组织。
- 结论: Nexa 当前界面在“气质方向”上接近，但在“token 分层、组件状态体系、响应式侧栏机制”上存在结构性差距。

## 2. 当前实现与 `sidebar-10` 的关键差异

| 维度 | `sidebar-10` 特征 | Nexa 当前实现 | 差异级别 | 改造方向 |
| --- | --- | --- | --- | --- |
| 颜色 token 分层 | 独立 `sidebar-*` 语义色，和全局色并存 | 仅全局 `--background/--muted/...`，无 `sidebar-*` | 高 | 引入 `--sidebar-*` 并扩展 Tailwind `colors.sidebar.*` |
| 侧栏结构 | `SidebarProvider + Sidebar + SidebarInset`，支持 `expanded/collapsed/offcanvas/mobile sheet` | 固定宽度 `<aside>`，无折叠态与移动端抽屉 | 高 | 迁移到 shadcn Sidebar 架构 |
| 导航状态 | `isActive`、hover 显示次动作、badge/分组/二级树 | 单层按钮列表，hover/active/focus 状态不完整 | 高 | 增加分组、active 显示、次级动作规则 |
| 顶栏操作风格 | 轻量 `ghost` icon button + popover 菜单 | 顶栏大量边框按钮，视觉权重偏高 | 中 | 主操作降噪为 ghost，次级操作进入 popover |
| 信息密度 | `text-sm` 为主，`h-8` 菜单节奏，低视觉噪声 | 组件尺寸接近，但节奏不统一 | 中 | 统一高度与间距节奏 (`h-8/px-2`) |
| 交互与键盘 | `Cmd/Ctrl + b` 切换侧栏，focus ring 统一 | 侧栏无键盘切换；按钮 focus 风格不统一 | 高 | 引入快捷键与 `focus-visible` 统一 ring |
| 响应式行为 | 移动端转 `Sheet` | 当前桌面固定双栏 | 高 | <=1200px 图谱和侧栏切换为抽屉/覆盖 |
| 可访问性 | icon 按钮带 sr 文本/语义 | 现有部分 icon 按钮缺 `aria-label` | 中 | 全面补齐 `aria-label` 与键盘可达性 |

## 3. 文件级差异定位 (当前仓库)
- token 层:
  - `src/app/globals.css`
  - `tailwind.config.ts`
- 布局层:
  - `src/app/page.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/TopBar.tsx`
- 领域层:
  - `src/components/chat/ChatPane.tsx`
  - `src/components/graph/GraphPane.tsx`

## 4. 重点观察 (与 `sidebar-10` 视觉语言的偏差)

### 4.1 Token 偏差
- 现状: 已有暖灰基调，接近目标气质。
- 问题: 侧栏未独立 token，导致导航 hover/active 与主内容区对比不够稳定。
- 影响: 后续要做折叠态、rail、分组动作时会出现颜色语义混乱。

### 4.2 组件结构偏差
- 现状: 侧栏是单文件固定布局，开发快。
- 问题: 无法承载 `sidebar-10` 的“分组 + 二级层级 + hover 次动作 + rail 折叠”。
- 影响: 信息密度上来后会变成“视觉拥挤 + 可操作性下降”。

### 4.3 交互与状态偏差
- 现状: 有 hover，但 focus/active/键盘路径不完整。
- 问题: icon-only 操作缺语义标签，状态反馈不系统。
- 影响: 可访问性与可学习性不足，和目标“IDE 化工具”不匹配。

## 5. 最小改造路径 (按优先级)

### P0 (必须): 建立 `sidebar-10` 同款语义基础
- 修改:
  - 在 `src/app/globals.css` 添加 `--sidebar-*` 变量 (light 先行)。
  - 在 `tailwind.config.ts` 添加 `colors.sidebar.{DEFAULT,foreground,primary,...}`。
- 验收:
  - 侧栏相关类可使用 `bg-sidebar`, `text-sidebar-foreground`, `hover:bg-sidebar-accent`。
  - 不再在侧栏组件写硬编码白底/灰底。

### P1 (必须): 迁移侧栏骨架到 shadcn Sidebar 模式
- 修改:
  - 新增通用 Sidebar UI 组件 (provider、trigger、rail、menu family)。
  - 重写 `src/components/layout/Sidebar.tsx` 为分组结构。
  - 在 `src/app/page.tsx` 引入 `SidebarProvider` 与 `SidebarInset`。
- 验收:
  - 桌面支持 expanded/collapsed。
  - 移动端可抽屉打开侧栏。
  - 侧栏主导航、收藏、标签区可分组展示。

### P2 (高优): 顶栏与操作风格降噪
- 修改:
  - 调整 `src/components/layout/TopBar.tsx`：
  - 高频动作用 ghost icon/button。
  - 低频动作收敛到 popover/dropdown。
  - 所有 icon-only 按钮补 `aria-label`。
- 验收:
  - 顶栏视觉重心下降，标题与当前会话信息更突出。
  - 按钮 hover/focus 与侧栏风格一致。

### P3 (高优): 聊天区与图谱区风格统一
- 修改:
  - `src/components/chat/ChatPane.tsx`：
  - 统一 focus ring、浮动分叉按钮交互态。
  - 输入栏与 `sidebar-10` 的轻边框节奏对齐。
  - `src/components/graph/GraphPane.tsx`：
  - 节点 hover/active 采用语义色。
  - 连线与网格颜色改为 token，不用硬编码 rgba。
- 验收:
  - 三栏视觉语言一致，无突兀区域。
  - 图谱激活节点与聊天当前分支信息形成联动可见性。

### P4 (建议): 无障碍和键盘链路补齐
- 修改:
  - 统一 `focus-visible:ring` 策略。
  - 补齐主按钮 `aria-label`、菜单键盘导航。
  - 增加 `Cmd/Ctrl + b` 切换侧栏。
- 验收:
  - 键盘可完成“切侧栏 -> 切分支 -> 触发操作”主路径。
  - icon-only 控件可被读屏正确识别。

## 6. 设计取舍建议
- 建议采用“结构强对齐、配色中度对齐”策略:
  - 结构与交互模式尽量贴近 `sidebar-10`。
  - 配色保持 Nexa 的暖灰纸面基调，只在侧栏 token 语义上向 `sidebar-10` 靠拢。
- 原因:
  - 你认可的视觉目标主要来自其信息组织方式与密度控制，不是简单复制颜色值。
  - 完全复刻冷灰配色会削弱 Nexa 当前“研究纸面感”的品牌记忆点。

## 7. 建议执行顺序 (一周节奏)
- Day 1: P0 token 层改造 + 快照验证。
- Day 2-3: P1 侧栏骨架迁移 + 响应式联调。
- Day 4: P2 顶栏降噪与动作重排。
- Day 5: P3 聊天/图谱统一与 A11y 回归。

## 8. 完成定义 (DoD)
- 侧栏具备 `expanded/collapsed/mobile` 三态。
- 导航具有清晰 `default/hover/active/focus` 状态。
- icon-only 控件全部具备 `aria-label`。
- 颜色与间距主要来源于语义 token，不依赖硬编码。
- 与 `sidebar-10` 相比，达到“同类工具感”而非“样式拼贴感”。

