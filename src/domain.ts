/**
 * `cto` 领域数据：Skill 元数据与 CTO 人设，不依赖任何外部领域包。
 *
 * 单包声明 10 个只读 Skill，覆盖 CTO 的完整职责：决策、设计、评审、治理、拆任务。
 * {@link CTOSkill} 只存元数据（name / description / dir），SKILL.md 正文由加载器
 * 从 `dir/SKILL.md` 读取，正文不内联进 `src/`。
 *
 * `dir` 一律由 `import.meta.url` 推导为**绝对路径**：源码态 `src/domain.ts`
 * 与编译态 `dist-server/domain.js` 都解析到包根的 `skills/<name>`。
 */
import { fileURLToPath } from 'node:url'
import { CTO_PERSONA } from './persona.js'

/** 领域内单个 Skill 的元数据（正文不入库，由加载器从 `dir/SKILL.md` 读取）。 */
export interface CTOSkill {
  /** Skill 名，必须与目录名及 frontmatter.name 一致。 */
  readonly name: string
  /** 模型侧可见的一句话描述（与 frontmatter.description 一致）。 */
  readonly description: string
  /** Skill 目录的绝对路径。 */
  readonly dir: string
}

/** `cto` 领域数据。 */
export interface CTODomain {
  /** 领域标识。 */
  readonly id: 'cto'
  /** 领域版本（与 package.json 版本解耦，随领域契约变更递增）。 */
  readonly version: string
  /** 展示名。 */
  readonly displayName: string
  /** CTO 人设正文（主会话常驻）。 */
  readonly personaMarkdown: string
  /** 领域提供的全部 Skill（单一列表，顺序稳定便于 review diff）。 */
  readonly skills: readonly CTOSkill[]
}

/** Skill 目录绝对路径：`<包根>/skills/<name>`（源码态 / 编译态同一语义）。 */
function skillDir(name: string): string {
  return fileURLToPath(new URL(`../skills/${name}`, import.meta.url))
}

/** 声明一个 Skill：name / description / dir 一次写全，dir 不允许调用方手拼。 */
function skill(name: string, description: string): CTOSkill {
  return { name, description, dir: skillDir(name) }
}

/** `cto` 领域：10 个只读 Skill + CTO 人设。 */
export const CTO_DOMAIN: CTODomain = {
  id: 'cto',
  version: '0.2.0',
  displayName: 'CTO Domain',
  personaMarkdown: CTO_PERSONA,
  skills: [
    skill(
      'cto-adr',
      '做一个技术决策并记录为 ADR：该不该做、选哪个、边界在哪、代价与风险是什么、什么证据会推翻、如何退出。只要用户提到技术选型、架构边界、build vs buy、技术路线、技术债偿还、不可逆技术决策，或问「该不该上 X」「A 和 B 选哪个」「未来 18 个月技术怎么走」「怎么向管理层解释这个取舍」，就使用本技能。不用于实施级技术方案（数据模型、接口、流程）、PRD 编写或开发任务拆解。',
    ),
    skill(
      'architect-tech-spec',
      '把已评审的 PRD 与 ADR 变成可实施的技术方案，覆盖模块、数据、接口、流程、部署与观测。只要用户提到技术方案、可行性或影响面评估、数据模型、接口契约、时序/流程设计、部署方案、观测方案，就使用本技能，无论输入是规范 PRD、工单、会议纪要还是口头描述。不用于业务价值判断、需求取舍、不可逆架构选型或开发任务拆解。',
    ),
    skill(
      'cto-arch-review',
      '评审技术方案或架构设计：判断是否可实施、边界是否清楚、风险是否可控，并给出通过、修改或驳回结论。只要用户提到评审技术方案、架构评审、设计评审、方案把关，就使用本技能。不用于编写方案、技术选型决策或开发任务拆解。',
    ),
    skill(
      'cto-code-review',
      '从架构与风险角度评审 Pull Request 或代码变更：边界、契约、数据、安全、可观测性与测试覆盖，不逐行挑格式。只要用户提到代码评审、PR 评审、合并前检查，就使用本技能。不用于替代自动化 lint、编写实现代码或需求验收。',
    ),
    skill(
      'cto-tech-debt',
      '登记、排序与偿还技术债：把债务转成可评估的风险与计划，判断现在还是以后还。只要用户提到技术债、架构腐化、重构计划、遗留系统，就使用本技能。不用于具体重构实现或故障复盘。',
    ),
    skill(
      'cto-security-review',
      '做安全与合规评审：威胁建模、权限边界、数据分级、密钥与依赖风险，输出可执行的整改项。只要用户提到安全评审、威胁建模、权限设计、数据合规、依赖漏洞，就使用本技能。不用于渗透测试执行与代码修复。',
    ),
    skill(
      'cto-incident-review',
      '做技术故障复盘：时间线、影响、根因、机制失效与改进项，输出可跟踪的整改计划。只要用户提到故障复盘、事故复盘、postmortem、根因分析，就使用本技能。不用于责任认定或对外公关稿。',
    ),
    skill(
      'cto-standards',
      '编写与发布工程技术规范或 RFC：把团队共识变成可执行、可检查的规则，并定义例外与复审机制。只要用户提到技术规范、编码规范、RFC、工程标准、团队约定，就使用本技能。不用于单次技术决策或具体方案设计。',
    ),
    skill(
      'cto-harness-audit',
      '审查 Agent Harness 层是否覆盖开发、构建、测试、部署所需的工具能力，输出缺口与通过/不通过结论。只要用户提到 harness 审查、工具链覆盖、Agent 开发环境能力评估，就使用本技能。不用于具体技术选型或实施方案设计。',
    ),
    skill(
      'dev-task-plan',
      '把已评审的 PRD 与技术方案拆成可分配给开发人员的开发任务计划：负责人、依赖 DAG、里程碑、任务级验收、集成点与风险。只要用户提到拆开发任务、给开发人员分工、排开发计划、协调并行开发、排依赖或里程碑，就使用本技能，即使用户只说「拆任务」「排一下开发计划」。不用于编码操作拆解（文件、函数、提交顺序）、任务派发，或技术方案设计本身。',
    ),
  ],
}
