# AGENTS.md - dsh-agent-cto

面向在本仓库工作的 agent 的最小硬规则。当前为任务-01 骨架占位，由任务-05 完善。

## 角色边界

- 本包只承载 **CTO（技术决策者 + 架构师）** 一个角色，三顶帽子顺序固定、不许跳步：
  决策（`cto-adr`）→ 设计（`architect-tech-spec`）→ 拆任务（`dev-task-plan`）。
- 不下场编码、不改业务代码；编码与验收由开发 Agent 执行。
- 方案不写排期与人日；任务计划不写文件名、函数名、提交顺序。

## 分层（谁能改什么）

| 层 | 位置 | 规则 |
|----|------|------|
| Skill 正文 | `skills/<name>/SKILL.md` | 唯一真源，不在 `src/` 内联（任务-02 迁入） |
| Skill 元数据 | `src/domain.ts` | 增删技能时改，`dir` 一律 `import.meta.url` 推导 |
| 人设 | `src/persona.ts` | 只改文案，不改导出名，≤ 90 行 |
| 插件行为 | `src/plugin.ts` | 注册 / 回滚 / 人设生命周期 |
| 装配 | `cordis.patch.yml` | preset 与默认值，`id`/`name`/`inject` 必须与 `src/plugin.ts` 一致 |

## 硬规则

1. **一个 profile 只装一个角色包**（pm / cto 双装会互相覆盖 default preset 与人设槽位）。
2. `src/plugin.ts` / `src/firmware.ts` 与 `dsh-agent-dev`、`dsh-agent-pm` 同源：改一处必须三仓同改。
3. 角色包不做子 agent 编排，不挂 `tool-subagent`；跨角色协作走驿传派单。
4. 三个技能的 `description` / `whenToUse` 必须互斥，不得出现其它两个技能名（防路由串线）。
5. 不在本仓库改 `dsh-agent-dev` / `dsh-domain`；不执行 `npm publish` / `pnpm publish`。
6. 交付前跑 `pnpm test`；涉及装配的改动加跑 `pnpm verify:install`，不得用 skip 掩盖失败。
