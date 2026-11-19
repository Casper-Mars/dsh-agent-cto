# 屏：设备列表

- 目标：查看设备状态并快速新建
- 断点：≥1280 三栏（侧栏 + 主区）/ 768–1279 两栏（隐藏侧栏）/ <768 单栏（隐藏侧栏与负责人列）
- 结构：侧栏导航 / 页头（标题 + 新建）/ 错误条（条件显示）/ 数据表
- 使用 token：surface-canvas, surface-raised, surface-overlay, text-primary, text-muted, border-subtle, space-4, space-5, radius-8, shadow-e1
- 组件：DataTable、StatusPill（见 components.md）
- 状态矩阵（前四个必做）：

| 状态 | 内容 | 截图 |
|---|---|---|
| default | 8 行数据，状态 pill 三色 | refs/device-list__1440__light__default.png |
| empty | 空态文案 + 创建设备按钮 | refs/device-list__1440__light__empty.png |
| loading | 5 行骨架 | refs/device-list__1440__light__loading.png |
| error | 错误条 + 重试 | refs/device-list__1440__light__error.png |

- 交互：新建按钮打开创建流程；行点击进入详情（本期不实现）
- 数据来源：mock.js 内置假数据
- 不做：筛选、排序、分页（本期范围外）
