# design/ 实例模板

这是「实例」的骨架，不是项目资产。agent 按 `ui-design` skill 的七步流程，把它复制到目标项目的 `design/` 并填值。

## 文件

| 文件 | 用途 |
|---|---|
| `tokens.json` | DTCG 唯一源；`{{neutral}}` / `{{accent}}` 必须替换 |
| `components.md` | 组件规格（结构 / 变体 / 状态矩阵 / 可访问性） |
| `screens/_template.md` | 每屏复制一份为 `screens/<page>.md` |
| `flows.md` | 页面与状态流转 |

## 必须改

- `tokens.json` 的 `{{neutral}}` / `{{accent}}`（默认 `sand` / `indigo`）
- 字体栈（换字族时）
- 断点（产品有固定栅格时）
- `screens/` 下的页面清单

## 不许改

- 文件布局与命名
- semantic 的命名语法与 17 个角色
- 状态矩阵的必做项：`default` / `empty` / `loading` / `error`（列表页另加 `long-list`）
- 颜色约束：文本 11/12 步、实心 9/10 步、边框 6/7/8 步

## 留空等人

- 品牌色相（agent 只能给候选与理由）
- 字体家族
- 页面信息架构的取舍

## 七步

1. 读 `ui-design` skill，确认平台形态（Web / 移动 / 内部工具）
2. 复制本目录到项目 `design/`
3. 替换占位符，产出 semantic token
4. 写第一个 `screens/<page>.md`
5. 起 mock 并截图（`ui-prototype`）
6. 跑 `check`（任务-05 之后可用）
7. 提交并给出 `design_ref`

## 校验

```bash
node design-kit/scripts/validate-tokens.mjs design/tokens.json
```

模板残留（`{{` / `TODO:`）由 `check.mjs` 拦截（任务-05）。
