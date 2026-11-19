---
name: ui-prototype
description: 用 design-kit 的 mock 模板与截图脚本产出确定性效果图：三视口 × 状态矩阵，命名与可复现规则写死。需要出截图供人工验收或做视觉回归时使用。
whenToUse: 已有设计实例与 tokens，需要出截图供人工验收或做视觉回归时。
---

# 出图：mock → 三视口 × 状态


视口与状态约定见 `references/viewports.md`。
截图计划模板见 `assets/shot-plan.md`。
## 前提

- `design/` 实例已存在，`tokens.json` 已填完占位符
- 已生成 `tokens.css`：
  ```bash
  node design-kit/scripts/tokens-to-css.mjs design-kit/tokens/baseline.json design-kit/dist/tokens.css
  ```

## 结构

```
mock/
  index.html      # 引用同目录 tokens.css 与 styles.css
  styles.css      # 只用 var(--color-*)、var(--space-*) 等 token
  mock.js         # 读 URL 参数，切换状态与主题
```

能力包自带骨架：`design-kit/templates/mock/`。复制到项目 `design/mock/`，把 `tokens.css` 放同目录。

## 状态与主题由 URL 驱动

```
index.html?state=default|empty|loading|error|long-list&theme=light|dark
```

mock 必须把最终状态写到 `document.documentElement.dataset.state`，脚本会核对；没应用就算缺失。

## 截图命令

```bash
export DSH_BROWSER_CDP_URL='ws://127.0.0.1:3000/?token=***'
node design-kit/scripts/screenshot.mjs \
  --mock <project>/design/mock \
  --out <project>/design/refs \
  --screen <screen-name>
```

- 视口：`desktop 1440×900` / `tablet 1024×768` / `mobile 390×844`
- 必做状态：`default` / `empty` / `loading` / `error`（列表页加 `long-list`）
- 命名：`<screen>__<viewport>__<theme>__<state>.png`
- 缺状态时脚本非 0 退出并打印缺失项

## 可复现

- 脚本设置 `prefers-reduced-motion: reduce`，mock 的动画必须因此关闭；两次截图应逐字节一致。
- 字体：宿主机没装 IBM Plex 会回退 `system-ui`；正式项目要在 mock 里自托管字体，否则截图与实现不一致。
- **禁止**用 AI 生图代替截图：文字与布局不可控、不可复现。

## 交付前自检

- 每个状态都有三视口截图
- 空态 / 加载 / 错误不是「白屏 + 转圈」，要有文案与下一步动作
- 移动端不是简单缩放：断点处隐藏/重排要写在 screen 规格里
