# demo-page（截图流水线示例）

用虚构的「设备列表」验证：mock → 三视口 × 四状态 → 命名规范 → 可复现。

```
mock/   index.html / styles.css / mock.js / tokens.css（来自 dist）
refs/   12 张 PNG：device-list__<viewport>__light__<state>.png
```

## 重跑

```bash
cp design-kit/dist/tokens.css design-kit/examples/demo-page/mock/tokens.css

export DSH_BROWSER_CDP_URL='ws://127.0.0.1:3000/?token=<browserless-token>'
node design-kit/scripts/screenshot.mjs \
  --mock design-kit/examples/demo-page/mock \
  --out design-kit/examples/demo-page/refs \
  --screen device-list
```

状态由 URL 参数驱动：`?state=default|empty|loading|error|long-list&theme=light|dark`。

## 注意

- 截图对字体敏感：宿主机未安装 IBM Plex 时会回退 `system-ui`；正式项目应自托管字体并用 `@font-face` 保证一致。
- 截图前脚本会设置 `prefers-reduced-motion: reduce`，mock 的骨架屏动画因此关闭，保证两次结果逐字节一致。
- 这是能力仓的示例，不属于任何产品项目。
