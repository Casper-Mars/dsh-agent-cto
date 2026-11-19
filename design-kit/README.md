# design-kit

设计能力的基线资产：token、模板、脚本。**不属于任何产品项目**；产品项目在 P1 阶段才由 agent 用它生成 `design/` 实例。

## 目录

```
design-kit/
  tokens/baseline.json     # DTCG 唯一源（light 为 $value，暗色在 $extensions.dsh.modes.dark）
  scripts/build-baseline.mjs   # 从 Radix Colors CSS 重建 baseline
  scripts/validate-tokens.mjs  # 结构 / 类型 / 别名 / 数量校验
  scripts/tokens-to-css.mjs    # 生成 CSS 变量（dist/ 已 gitignore）
  templates/design/            # 项目实例骨架（tokens / components / screens / flows / README）
  templates/mock/              # 静态 mock 骨架（状态由 URL 参数切换）
  scripts/screenshot.mjs       # CDP 截图（三视口 × 状态，零第三方依赖）
  scripts/check.mjs            # 契约校验（魔法值 / 别名 / 对比度 / 残留 / 截图覆盖）
  examples/demo-page/          # 完整实例示例（design/ 四件套 + 12 张 refs）
```

规划中（后续任务）：`templates/`（design 骨架与 mock）、`scripts/tokens-to-css.mjs`、`scripts/screenshot.mjs`、`scripts/check.mjs`、`examples/demo-page/`。

## 约定

- `color.*` 是 primitive（Radix 12 步），**只有 `semantic.*` 可以引用它**；组件层禁止直接使用 primitive 或裸 hex。
- 文本只能落在 11/12 步，实心背景 9/10 步，边框 6/7/8 步。
- 中性色 = Sand（暖中性），强调色 = Indigo；状态色 Jade / Amber / Red / Sky。
- 字体：IBM Plex Sans + IBM Plex Sans SC + IBM Plex Mono。

## 生成 CSS

```bash
pnpm design:css
# design-kit/tokens/baseline.json -> design-kit/dist/tokens.css
```

- 颜色只输出 `semantic.*`（17 个变量：16 个语义角色 + on-action），primitive 不暴露给组件
- 暗色是同一批变量在 `[data-theme="dark"]` 下重新解析：先看 semantic 的暗色别名，再沿别名取 primitive 的暗色值
- 非颜色域直接输出：`--space-*` / `--radius-*` / `--shadow-*` / `--duration-*` / `--easing-*` / `--breakpoint-*` / `--z-*`
- `--breakpoint-*` 不能用于 media query，仅供 JS 或容器查询参考

## 应用到项目

见 `docs/apply-to-project.md`：七步流程、项目 CI 接入、版本与源/副本关系。

## 实例模板

`templates/design/` 是项目 `design/` 的骨架：复制 → 替换 `{{neutral}}` / `{{accent}}` → 写页面规格。三类清单（必须改 / 不许改 / 留空等人）与七步流程写在 `templates/design/README.md`，不要把模板内容当项目资产提交。

```bash
cp -R design-kit/templates/design/. <project>/design/
sed -i '' 's/{{neutral}}/sand/g; s/{{accent}}/indigo/g' <project>/design/tokens.json
node design-kit/scripts/validate-tokens.mjs <project>/design/tokens.json
```

## 校验

```bash
pnpm design:check <design-dir>
```

五类检查（有错误退出码 1，输出 `文件:行`）：

1. 样式文件禁止 hex / px 字面量（`tokens.css` 与 `mock/` 原型除外）
2. semantic 只能指向 color primitive，禁止链式
3. 正文类语义色在 surface 上的 APCA Lc ≥ 60
4. 模板残留：`{{...}}` 与 `TODO:`
5. `screens/*.md` 状态矩阵里的每个状态，三视口都要有 refs

## 截图

```bash
export DSH_BROWSER_CDP_URL='ws://127.0.0.1:3000/?token=xxx'
node design-kit/scripts/screenshot.mjs --mock <mock-dir> --out <refs-dir> --screen <name>
```

- 三视口：desktop 1440×900 / tablet 1024×768 / mobile 390×844
- 默认四状态：default / empty / loading / error（列表页加 `--states ...,long-list`）
- 命名：`<screen>__<viewport>__<theme>__<state>.png`
- 缺状态时脚本非 0 退出；`prefers-reduced-motion: reduce` 保证可复现

## 刷新 token

```bash
# 需要 Radix Colors 的 CSS：<scale>.css 与 <scale>-dark.css
node design-kit/scripts/build-baseline.mjs /path/to/radix-css > design-kit/tokens/baseline.json
node design-kit/scripts/validate-tokens.mjs
```

## 源与副本

`dsh-agent-cto` 是源，`dsh-agent-one` 是副本（沿用「角色资产 cto 源、one 副本」的惯例）。

```bash
pnpm design:sync    # 镜像同步 design-kit + 三个 UI Skill 到 one
pnpm design:drift   # 逐字节比对，任何差异退出 1
```

副本不允许手改：所有改动落在 cto，再 sync。
