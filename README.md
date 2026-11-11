# dsh-agent-cto

> 在本仓库工作的 agent 请先读 [AGENTS.md](./AGENTS.md)。

`dsh-agent-cto` 是 dsh 的 **CTO（技术决策者 + 架构师）领域原生单包**：装这一个包，就能得到

- **CTO persona**：注入主会话（depth 0 根 agent）的常驻 system prompt；
- **10 个只读领域 Skill**：决策、设计、评审、治理、拆任务五类职责，随包发布在
  `skills/`，运行时由插件注册进 `ctx.skills`；
- **1 个 agent preset**：`cto`，由 `cordis.patch.yml` 装配。

五类职责顺序固定、不许跳步：决策 → 设计 → 评审 → 治理 → 拆任务。不下场编码、不改业务代码；
方案不写排期与人日，任务计划不写文件名、函数名、提交顺序。零外部核心依赖：`peerDependencies` 里的 `@deepseek-ai/*` 只提供类型与运行时
服务契约，由 dsh 侧提供，用户无需单独安装。Skill 为**原生只读**：正文只来自包内 `skills/`，
不写盘、不被改写。

## 安装

前置：dsh `0.2.1-rc.2`、Node ≥ `22.19.0`、pnpm ≥ `11.7.0`。

```bash
# 在仓库根目录：安装依赖并编译（产出 dist-server/）
pnpm install
pnpm build

# 装进指定 profile（首次使用会自动初始化 profile）
dsh plugin --profile <p> add link:$PWD
```

`link:` 安装的是当前目录，改动后需要 `pnpm build` 重新生成 `dist-server/`；`main` 指向
`dist-server/index.js`，不编译则加载失败。

### 装完核对组合树

```bash
dsh --profile <p> --dump-config | grep -E "cto-domain|preset-cto"
```

应能看到 `cto-domain`（`inject: ['skills', 'agents']`）、`agent-preset-registry.default: cto`，
以及唯一的 preset `cto`。

## 技能

| 技能 | 触发场景 | 产物 |
|------|----------|------|
| `cto-adr` | 技术选型、架构边界、build vs buy、技术路线、技术债偿还、不可逆技术决策 | ADR：决策、选项（含「不做」）、取舍理由、代价与风险、退出条件 |
| `architect-tech-spec` | 技术方案、可行性与影响面评估、数据模型、接口契约、时序 / 流程设计、部署与观测 | 技术方案：模块、数据、接口、流程、部署、观测、回滚 |
| `cto-arch-review` | 方案评审、架构评审、设计评审、上线前架构复核 | 评审报告：通过/有条件通过/驳回 + 分级问题 |
| `cto-code-review` | PR 评审、合并前检查、核心模块变更 | PR 评审：九维检查 + blocker/major/minor |
| `cto-tech-debt` | 技术债登记、排序、偿还计划、遗留系统 | 债务登记表 + 偿还计划 |
| `cto-security-review` | 安全评审、威胁建模、权限与数据合规、依赖漏洞 | 威胁模型 + 整改项 |
| `cto-incident-review` | 故障复盘、事故复盘、根因分析 | Postmortem + 改进项 |
| `cto-standards` | 技术规范、编码规范、RFC、团队工程约定 | RFC / 规范：规则、检查、例外、复审 |
| `cto-harness-audit` | Harness 审查、工具链覆盖、Agent 开发环境能力评估 | Harness 报告：能力矩阵 + 缺口 |
| `dev-task-plan` | 拆开发任务、给开发人员分工、排依赖与里程碑、协调并行开发 | 开发任务计划：任务清单、负责人、依赖 DAG、里程碑、任务级验收、集成点与风险 |

十个技能的 `description` 与 `whenToUse` **路由互斥**：任一技能的描述里不得出现其它技能名
（`tests/domain.spec.ts` 机械校验，§10 L4′）。随包 `references/` 与 `assets/` 的每个文件都必须在
对应 `SKILL.md` 正文被点名，且正文点名的路径必须真实存在（双向校验）。

## 自检

全部在仓库根目录执行：

```bash
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest run：5 个 spec、141 个用例
pnpm build            # 产出 dist-server/（含 cordis.patch.yml 副本）
pnpm verify:install   # 37/37 PASS：10 个 SKILL.md + 11 个 assets + 16 个 references
make check            # build → test → verify → pack
```

| 命令 | 成功判据 |
|------|----------|
| `pnpm typecheck` | 退出码 0，无类型错误 |
| `pnpm test` | **141 passed**、0 failed、0 skipped，退出码 0 |
| `pnpm build` | 退出码 0，产出 `dist-server/index.js` 与 `dist-server/cordis.patch.yml` |
| `pnpm verify:install` | 37 行 `PASS`、退出码 0；任一 `FAIL` 退出码 1；目录 / 参数错误退出码 2 |
| `make check` | 上述 build / test / verify 全通过，且 `npm pack --dry-run` 清单正常 |

`verify:install` 默认检查**包内** `skills/`，不需要安装到 profile；`--assets <dir>` 仅用于手工
核查任意目录下的 `skills/` 布局，不是默认路径：

```bash
node scripts/verify-install.mjs --assets /path/to/skills
```

## 目录

```text
.
├─ .gitignore                    # 忽略 node_modules/ 与构建产物
├─ .npmrc                        # pnpm 安装策略
├─ LICENSE                       # Apache-2.0
├─ Makefile                      # make check / stage-dry / publish
├─ cordis.patch.yml              # bundle patch：cto-domain + 注册表默认值 + preset-cto
├─ package.json                  # dsh.bundle.patch 指向 cordis.patch.yml；files 含 skills/
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ tsconfig.json                 # 类型检查
├─ tsconfig.server.json          # 编译到 dist-server/
├─ vitest.config.ts
├─ src/
│  ├─ index.ts                   # 包入口：re-export 插件三要素与领域数据
│  ├─ plugin.ts                  # Cordis 插件：注入 ['skills','agents']；注册 10 个 Skill；depth 0 注入 persona
│  ├─ domain.ts                  # CTO_DOMAIN：id / version / displayName / persona / 10 个 Skill 元数据
│  ├─ persona.ts                 # CTO_PERSONA：CTO 的全部行为规则（人设唯一来源，≤ 90 行）
│  └─ firmware.ts                # SKILL.md 读取 / frontmatter 解析 / SkillRegistration 构造
├─ dist-server/                  # 构建产物：pnpm build 生成，git 忽略，不手工编辑
├─ skills/                       # 唯一的 Skill 源（10 个只读 Skill，随包发布）
│  ├─ cto-adr/
│  │  ├─ SKILL.md
│  │  ├─ assets/                 # adr-template.md / roadmap-template.md
│  │  └─ references/             # checklists / decision-catalog / option-matrix / risk-register
│  ├─ architect-tech-spec/
│  │  ├─ SKILL.md
│  │  ├─ assets/doc-template.md
│  │  └─ references/             # checklists / data-and-api / example
│  └─ dev-task-plan/
│     ├─ SKILL.md
│     ├─ assets/task-plan-template.md
│     └─ references/checklists.md
├─ scripts/
│  ├─ copy-assets.mjs            # 把 cordis.patch.yml 复制进 dist-server/
│  └─ verify-install.mjs         # 37 项包内自检（CLI + 导出纯函数）
├─ tests/                        # 5 个 spec：domain / plugin / patch / firmware-registration / verify-install
├─ AGENTS.md
└─ README.md
```

### 运行时装配

1. `cordis.patch.yml` 插入 `cto-domain` 插件、`agent-preset-registry`（default=`cto`）与 preset `cto`；
2. 插件 `apply()` 从 `ctx.skills` 注册 10 个 Skill（正文读 `skills/<name>/SKILL.md`），注册中途失败
   原子回滚，卸载按 LIFO 反注册；
3. 插件监听 `agent/created`，只给 **depth 0** 根 agent 注入 `CTO_PERSONA`；子 agent 使用各自
   preset 的 persona。

## 硬约束

- **一个 profile 只装一个角色包**：`dsh-agent-cto` 与 `dsh-agent-pm` 都占用
  `agent-preset-registry.default` 与同一个 `deployment:persona-prefix` 槽位，双装必然互相覆盖。
- `src/plugin.ts` / `src/firmware.ts` 与 `dsh-agent-dev`、`dsh-agent-pm` 同源：改注入器或加载器
  必须三仓同改并各自跑测试。
- 角色包不做子 agent 编排，不挂 `tool-subagent`；跨角色协作走驿传派单。
- 十个技能的 `description` / `whenToUse` 必须互斥，不得出现其它技能名（防路由串线）。
- 本轮不发布 npm，只用本地 `link:` 装配验收。

## 验收记录

> 验收记录占位：L3 / L3' / L4 / L4' 的实测证据（命令、输出、结论、残余风险）由验收阶段填写。
> 本仓库不预填验收结果；未实测的内容不得写入本节。
