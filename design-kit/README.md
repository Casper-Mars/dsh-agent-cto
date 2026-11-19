# design-kit

设计能力的基线资产：token、模板、脚本。**不属于任何产品项目**；产品项目在 P1 阶段才由 agent 用它生成 `design/` 实例。

## 目录

```
design-kit/
  tokens/baseline.json     # DTCG 唯一源（light 为 $value，暗色在 $extensions.dsh.modes.dark）
  scripts/build-baseline.mjs   # 从 Radix Colors CSS 重建 baseline
  scripts/validate-tokens.mjs  # 结构 / 类型 / 别名 / 数量校验
```

规划中（后续任务）：`templates/`（design 骨架与 mock）、`scripts/tokens-to-css.mjs`、`scripts/screenshot.mjs`、`scripts/check.mjs`、`examples/demo-page/`。

## 约定

- `color.*` 是 primitive（Radix 12 步），**只有 `semantic.*` 可以引用它**；组件层禁止直接使用 primitive 或裸 hex。
- 文本只能落在 11/12 步，实心背景 9/10 步，边框 6/7/8 步。
- 中性色 = Sand（暖中性），强调色 = Indigo；状态色 Jade / Amber / Red / Sky。
- 字体：IBM Plex Sans + IBM Plex Sans SC + IBM Plex Mono。

## 刷新 token

```bash
# 需要 Radix Colors 的 CSS：<scale>.css 与 <scale>-dark.css
node design-kit/scripts/build-baseline.mjs /path/to/radix-css > design-kit/tokens/baseline.json
node design-kit/scripts/validate-tokens.mjs
```

## 源与副本

`dsh-agent-cto` 是源，`dsh-agent-one` 是副本（沿用「角色资产 cto 源、one 副本」的惯例）。同步与漂移校验由任务-11 落地。
