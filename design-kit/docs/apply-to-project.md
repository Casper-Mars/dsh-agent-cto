# 把设计能力应用到一个项目

> 本文件只描述「将来怎么做」，P0 不执行；执行前需要单独决策（P1）。

## 前提

- 目标项目是 git 仓库（`design/` 与代码同源、可 diff）
- CI 环境 Node 20+
- 出图机器能访问 browserless（`DSH_BROWSER_CDP_URL` 或 `--env-file`）
- 设计阶段由 cto 持有 design 卡，designer 是它的子智能体（`maxDepth: 2`）

## 七步

### 1. 生成实例

```bash
cd <project>
mkdir -p design/screens design/refs design/mock
cp -R <design-kit>/templates/design/. design/
sed -i '' 's/{{neutral}}/sand/g; s/{{accent}}/indigo/g' design/tokens.json
```

> `<design-kit>` 是能力包内的 `design-kit/` 目录（cto 包为源，one 为副本）。

### 2. 填 token

- 品牌色系：`{{neutral}}` / `{{accent}}` 必须替换（默认 sand / indigo）
- 字体栈与断点：按项目实际情况调整
- 只写 semantic 引用，不写裸 hex

### 3. 写屏规格

每屏从 `templates/design/screens/_template.md` 复制为 `design/screens/<page>.md`，补全：

- 断点与结构
- 使用的 token
- 状态矩阵（default / empty / loading / error，列表页加 long-list）
- 交互与数据来源

### 4. 生成 CSS 与 mock

```bash
node <design-kit>/scripts/tokens-to-css.mjs design/tokens.json design/out/tokens.css
cp -R <design-kit>/templates/mock/. design/mock/
cp design/out/tokens.css design/mock/tokens.css
```

### 5. 出图

```bash
node <design-kit>/scripts/screenshot.mjs \
  --mock design/mock --out design/refs --screen <page> \
  --env-file <path-to>/.env
```

- 三视口 × 四状态 = 12 张
- 命名 `<screen>__<viewport>__<theme>__<state>.png`
- refs 要提交进仓库：验收与视觉回归都依赖它

### 6. 校验

```bash
node <design-kit>/scripts/check.mjs design
```

必须 0 错误。常见失败：占位符未填、魔法值、对比度不足、缺状态截图。

### 7. 记录 design_ref

提交 `design/`，把 commit sha 写进 design 卡报告。后续 dev 卡引用同一个 `design_ref`。

## 项目 CI 接入

```yaml
jobs:
  design-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: node <design-kit>/scripts/check.mjs design
```

> 设计能力包自身已有 CI：`tokens 基线 + 示例实例 + 单测` 三件套，见 `.github/workflows/design-kit.yml`。

## 版本与源 / 副本

| design-kit | dsh-agent-cto | dsh-agent-one | 说明 |
|---|---|---|---|
| 0.1.0 | 0.7.1 | 0.2.6 | 初始能力：token / 模板 / 脚本 / 三个 UI skill / designer preset |

- **源**：`dsh-agent-cto`（设计阶段归 cto）
- **副本**：`dsh-agent-one`，由任务-11 的同步脚本复制；sha256 测试守住漂移
- 版本策略：`design-kit/` 随包发布，包版本即能力版本；项目实例生成后独立演进，不反向依赖

## 常见问题

| 问题 | 处理 |
|---|---|
| 截图字体不对 | 宿主机未装 IBM Plex，回退 `system-ui`；正式项目自托管字体 |
| 截图不可复现 | 检查 mock 动画是否被 `prefers-reduced-motion: reduce` 关闭 |
| CI 没有浏览器 | CI 只跑 check（refs 已提交）；出图在本地或专门 runner 执行 |
| 想换品牌色 | 在 `tokens.json` 里改 semantic 指向，不要改组件 |
