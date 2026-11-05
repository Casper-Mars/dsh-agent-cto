# dsh-agent-cto

dsh 领域包：CTO（技术决策者 + 架构师）—— 技术选型、架构设计、开发任务拆解。

原生 Cordis 单包形态：`cto-domain` 插件把本包 Skill 注册进 `ctx.skills`，并给根会话
（`delegationDepth === 0`）注入 CTO 人设；装配入口是随包分发的 `cordis.patch.yml`。
三顶帽子顺序固定：决策（`cto-adr`）→ 设计（`architect-tech-spec`）→ 拆任务（`dev-task-plan`）。

> 当前状态：**任务-01 骨架**（来源 `dsh-agent-dev@bc78f02`）。`src/domain.ts` /
> `src/persona.ts` / `skills/` 三个 Skill 与 preset 细节断言分别由任务-02 / 03 / 04 产出，
> 本文件由任务-05 完善。此状态下 `pnpm typecheck` / `pnpm build` / `pnpm verify:install`
> 未通过属预期。

## 目录

```plaintext
src/plugin.ts       Cordis 插件：Skill 注册 + LIFO 反注册 + 根会话人设注入（任务-03 角色化）
src/firmware.ts     SKILL.md 读取 / frontmatter 解析 / SkillRegistration 构造（三仓同源）
scripts/            copy-assets.mjs（dist 资源搬运）、verify-install.mjs（包内资产自检）
tests/              firmware / patch 已可跑；domain / plugin 待任务-02 / 03 补齐
cordis.patch.yml    bundle patch：cto-domain + agent-preset-registry + preset-cto
```

## 常用命令

```bash
pnpm install        # 安装（Node >= 22.19.0、pnpm 11.7.0）
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm build          # 产出 dist-server/（含 cordis.patch.yml）
pnpm verify:install # 包内 skills/ 资产自检
make check          # build → test → verify → pack
```

## 硬约束

- **一个 profile 只装一个角色包**：`dsh-agent-cto` 与 `dsh-agent-pm` 都占用
  `agent-preset-registry.default` 与同一个 `deployment:persona-prefix` 槽位，双装必然互相覆盖。
- `src/plugin.ts` / `src/firmware.ts` 与 `dsh-agent-dev` 同源，改注入器或加载器必须三仓同改并各自跑测试。
- 不下场编码、不改业务代码；编码与验收由开发 Agent 执行。
- 本轮不发布 npm，只用本地 `link:` 装配验收。
