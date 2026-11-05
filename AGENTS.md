# AGENTS.md - dsh-agent-cto

面向在本仓库工作的 agent 的硬规则。人类安装与使用说明见 [README.md](./README.md)。

## 1. 这个仓库是什么

`dsh-agent-cto` 是 dsh 的 CTO（技术决策者 + 架构师）领域**原生单包**，产物是「人设 + 只读
Skill + agent preset」，不是业务应用。

- **原生单包**：不依赖任何外部 agent core 包；`dsh plugin add` 装本包即可。
- **零工具**：本包不声明任何 tools 实现（无 `tools()`，也无 `toolNames` 字段）；能力由
  `cordis.patch.yml` 的 preset 组合 dsh 内置插件提供。
- **零状态**：不写盘、不建资产目录、没有 bootstrap；3 个 Skill 只从包内 `skills/` 读取并注册。
- **只读 Skill**：Skill 正文不会被运行时改写。
- **人设唯一来源**：`src/persona.ts` 的 `CTO_PERSONA`，由插件注入 **depth 0 根会话**；
  `preset-cto` 不挂 persona。
- **环境基线**：dsh `0.2.1-rc.2`、Node ≥ `22.19.0`、pnpm ≥ `11.7.0`。

## 2. 角色边界

- 本包只承载 **CTO（技术决策者 + 架构师）** 一个角色，三顶帽子顺序固定、不许跳步：
  决策（`cto-adr`）→ 设计（`architect-tech-spec`）→ 拆任务（`dev-task-plan`）。
- 不下场编码、不改业务代码；编码与验收由开发 Agent 执行。
- 方案不写排期与人日；任务计划不写文件名、函数名、提交顺序。

## 3. 分层（谁能改什么）

| 层 | 位置 | 规则 |
|----|------|------|
| Skill 正文 | `skills/<name>/SKILL.md` | 唯一真源，不在 `src/` 内联；正文必须点名本 Skill 的每个随包文件 |
| 随包文件 | `skills/<name>/assets/`、`skills/<name>/references/` | 只放被该 `SKILL.md` 引用的模板与参考文档；新增 / 删除必须同步自检清单 |
| Skill 元数据 | `src/domain.ts` | 增删技能时改，`dir` 一律 `import.meta.url` 推导 |
| 人设 | `src/persona.ts` | 只改文案，不改导出名，≤ 90 行 |
| 插件行为 | `src/plugin.ts` | 注册 / 回滚 / 人设生命周期 |
| Skill 加载 | `src/firmware.ts` | 只解析 `name` / `description` / `whenToUse`，无副作用 |
| 装配 | `cordis.patch.yml` | preset 与默认值，`id`/`name`/`inject` 必须与 `src/plugin.ts` 一致 |

## 4. 硬规则

1. **一个 profile 只装一个角色包**（pm / cto 双装会互相覆盖 default preset 与人设槽位）。
2. `src/plugin.ts` / `src/firmware.ts` 与 `dsh-agent-dev`、`dsh-agent-pm` 同源：改一处必须三仓同改并各自跑测试。
3. 角色包不做子 agent 编排，不挂 `tool-subagent`；跨角色协作走驿传派单。
4. 三个技能的 `description` / `whenToUse` 必须互斥，不得出现其它两个技能名（防路由串线，
   §10 L4′，`tests/domain.spec.ts` 机械校验）。
5. **Skill 资产双向可追溯**：`references/` 与 `assets/` 下每个文件都必须在对应 `SKILL.md` 正文被点名；
   正文点名的路径也必须真实存在（`tests/domain.spec.ts` 断言）。
6. **自检清单与计数同步**：`scripts/verify-install.mjs` 的 `EXPECTED_SKILLS` / `EXPECTED_ASSETS` /
   `EXPECTED_REFERENCES` 是唯一真源，当前 15 项（3 SKILL + 4 assets + 8 references）；增删文件必须同步
   `tests/verify-install.spec.ts` 的计数断言与 README。
7. frontmatter 只有 `name` / `description` / `whenToUse` 三个字段，单行扁平标量，`name` 必须等于目录名。
8. 不在本仓库改 `dsh-agent-dev` / `dsh-domain` / `dsh-agent-pm`；不执行 `npm publish` / `pnpm publish`。
9. 交付前跑 `pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm verify:install`；
   不得用 skip / todo 掩盖失败。

## 5. 常用命令

| 命令 | 作用 | 成功判据 |
|------|------|----------|
| `pnpm typecheck` | `tsc --noEmit` | 退出码 0 |
| `pnpm test` | `vitest run`（5 个 spec） | 85 passed、0 failed、0 skipped |
| `pnpm build` | 清理 → 类型检查 → 编译 → 复制 patch | `dist-server/index.js` 与 `dist-server/cordis.patch.yml` 存在 |
| `pnpm verify:install` | 包内 15 项资产自检 | 15 行 PASS、退出码 0 |
| `make check` | build → test → verify → pack | 全绿 |

`verify:install` 默认检查包内 `skills/`，未安装也能全 PASS；`--assets <dir>` 只用于手工核查其它目录。

## 6. 提交与文档

- Conventional Commits：`<type>(<scope>): <描述>`，`type` ∈ `feat|fix|docs|test|chore`；
- 一次逻辑改动一个 commit；提交前 `git status --short` 与 `git diff --stat` 只应有预期文件；
- 不提交 `node_modules/`、`dist/`、`dist-server/`、日志与临时文件；
- 技能数量 / 自检条数 / 命令 / 装配变化，必须在同一 commit 同步 `README.md` 与本文件。
