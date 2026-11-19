# 设计交付自检清单

- [ ] `tokens.json` 已替换 `{{neutral}}` / `{{accent}}`，无占位符
- [ ] semantic 只指向 color primitive，未出现裸 hex
- [ ] 文本对比度 APCA Lc ≥ 60
- [ ] `screens/*.md` 每屏都有状态矩阵（default / empty / loading / error，列表加 long-list）
- [ ] 每个状态在三视口都有 refs 截图
- [ ] `components.md` 写清结构 / 变体 / 状态 / 可访问性
- [ ] `flows.md` 覆盖空态、错误、权限与返回路径
- [ ] 未出现 px / hex 魔法值（tokens.css 与 mock 除外）
- [ ] `design_ref` 已记录（commit sha）
- [ ] 品牌色相、字体家族等审美决策仍是人拍板，未被 agent 自行决定
