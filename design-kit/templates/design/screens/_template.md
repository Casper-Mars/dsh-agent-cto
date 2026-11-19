# 屏：{{SCREEN_NAME}}

- 目标：{{用户在这屏要完成什么}}
- 断点：≥1280 {{三栏}} / 768–1279 {{两栏}} / <768 {{单栏}}
- 结构：{{页头 / 主区 / 侧栏 / 底部操作}}
- 使用 token：{{surface.raised, text.primary, space.5, radius.8, shadow.e1}}
- 组件：{{ComponentName（components.md#anchor）}}
- 状态矩阵（前四个必做；列表页加 long-list）：

| 状态 | 内容 | 截图 |
|---|---|---|
| default | | refs/{{screen}}__1440__light__default.png |
| empty | | refs/{{screen}}__1440__light__empty.png |
| loading | | refs/{{screen}}__1440__light__loading.png |
| error | | refs/{{screen}}__1440__light__error.png |
| long-list | | refs/{{screen}}__1440__light__long-list.png |

- 交互：{{点击 / 键盘 / 焦点去向}}
- 数据来源：{{接口或假数据说明}}
- 不做：{{明确排除的范围}}
