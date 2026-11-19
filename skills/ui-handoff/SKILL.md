---
name: ui-handoff
description: 设计交接契约：design_ref、屏与状态清单、验收口径，以及 dev 实现与 tester 核对的一致性规则。提交 design 卡、拆 dev 卡或验收实现时使用。
whenToUse: 设计完成准备提交 design 卡、拆 dev 卡、或验收 dev 实现时。
---

# 交接：设计怎么到 dev 手里


卡片字段模板见 `references/card-fields.md`。
交接单模板见 `assets/handoff-note.md`。
## 交付物（缺一不可）

| 项 | 内容 |
|---|---|
| `tokens.json` | 已填值、校验通过 |
| `components.md` | 组件结构 / 变体 / 状态矩阵 / 可访问性 |
| `screens/*.md` | 每屏：结构、token、状态、断点、交互 |
| `flows.md` | 入口 / 步骤 / 分支 / 退出 |
| `refs/*.png` | 三视口 × 状态矩阵，命名合规 |
| `design_ref` | 上述内容的 commit sha |

## 提交 design 卡时

- 报告里写 `design_ref: <commit sha>`，附规格与截图（material）
- 列出本卡覆盖的屏与状态；没覆盖的明确写「不在本期」
- 校验必须 0 错误：`node design-kit/scripts/check.mjs <design-dir>`

## 拆 dev 卡时

每张 dev 卡必须带：

- `design_ref`
- 本卡涉及的屏与「必须覆盖的状态」清单
- 验收方式：对照 `refs/<screen>__<viewport>__light__<state>.png`

没有 `design_ref` 的 dev 卡不允许开工。

## 验收口径

1. **实现 vs refs**：结构、层级、间距、字号、颜色、状态齐全
2. **token 使用**：实现里不出现 hex / px 字面量（`check.mjs` 可扫）
3. **状态覆盖**：清单里每个状态都存在，包括空态、加载、错误
4. **偏差处理**：视觉偏差回 design 卡修，不在 dev 卡里「顺手改成我觉得更好看的样子」

## 反合理化

| 借口 | 现实 |
|---|---|
| 差一点没关系 | token 与状态矩阵就是判断标准，不是主观感受 |
| 这个状态实现不了 | 在设计阶段就该发现；回 design 卡改，不要静默省略 |
| dev 自己优化了间距 | 优化要体现在 design_ref 里，否则下一屏又不一致 |
| 先合并，回头补设计 | 没有 design_ref 的实现无法验收，等于没做 |
