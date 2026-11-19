# demo-page（完整实例示例）

用虚构的「设备列表」验证整条设计链路：模板 → 实例 → 截图 → 校验。**不涉及任何产品仓库。**

```
design/
  tokens.json          # 由模板填充（sand / indigo）
  components.md        # DataTable、StatusPill
  screens/device-list.md
  flows.md
  mock/                # mock + tokens.css（生成物）
  refs/                # 12 张截图：3 视口 × 4 状态
```

## 从零复现

```bash
cd design-kit/examples/demo-page

# 1) 模板 → 实例
mkdir -p design/screens design/refs design/mock
cp ../../templates/design/tokens.json design/
cp ../../templates/design/components.md design/
sed -i '' 's/{{neutral}}/sand/g; s/{{accent}}/indigo/g' design/tokens.json

# 2) 写屏规格（参照 templates/design/screens/_template.md）
#    design/screens/device-list.md 需含 default/empty/loading/error 四状态

# 3) 生成 tokens.css 并准备 mock
pnpm design:css
cp ../../templates/mock/{index.html,styles.css,mock.js} design/mock/
cp ../../dist/tokens.css design/mock/tokens.css

# 4) 截图（3 视口 × 4 状态）
node ../../scripts/screenshot.mjs \
  --mock design/mock --out design/refs --screen device-list \
  --env-file ~/project/opc/sanding/deployment/.env

# 5) 校验
node ../../scripts/check.mjs design
```

## 验收

- `check.mjs` 0 错误（占位符、魔法值、对比度、状态覆盖）
- 12 张截图，命名 `<screen>__<viewport>__<theme>__<state>.png`
- 两次截图逐字节一致（`prefers-reduced-motion: reduce`）

## 注意

- 宿主机未装 IBM Plex 时字体回退 `system-ui`；正式项目要自托管字体。
- 这是能力仓示例，不属于任何产品项目。
