/**
 * `designer` 领域数据：三个 UI Skill 与设计师人设，不依赖外部领域包。
 *
 * 设计阶段归 CTO，设计师作为其子智能体执行；Skill 正文在 `skills/ui-*`。
 */
import { fileURLToPath } from 'node:url'
import { DESIGNER_PERSONA } from './persona-designer.js'

export interface DesignerSkill {
  readonly name: string
  readonly description: string
  readonly dir: string
}

export interface DesignerDomain {
  readonly id: 'designer'
  readonly version: string
  readonly displayName: string
  readonly personaMarkdown: string
  readonly skills: readonly DesignerSkill[]
}

function skillDir(name: string): string {
  return fileURLToPath(new URL(`../skills/${name}`, import.meta.url))
}

function skill(name: string, description: string): DesignerSkill {
  return { name, description, dir: skillDir(name) }
}

/** `designer` 领域：3 个只读 Skill + 设计师人设。 */
export const DESIGNER_DOMAIN: DesignerDomain = {
  id: 'designer',
  version: '0.1.0',
  displayName: 'Designer Domain',
  personaMarkdown: DESIGNER_PERSONA,
  skills: [
    skill(
      'ui-design',
      '设计阶段主技能：判断是否该走设计流程，按七步把模板生成项目 design/ 实例（tokens / components / screens / flows），并守住必须改与不许改的边界。只要新增或重做界面、改动结构 / 视觉 / 交互，就先读本技能。',
    ),
    skill(
      'ui-prototype',
      '用 design-kit 的 mock 模板与截图脚本产出确定性效果图：三视口 × 状态矩阵，命名与可复现规则写死。需要出截图供人工验收或做视觉回归时使用。',
    ),
    skill(
      'ui-handoff',
      '设计交接契约：design_ref、屏与状态清单、验收口径，以及 dev 实现与 tester 核对的一致性规则。提交 design 卡、拆 dev 卡或验收实现时使用。',
    ),
  ],
}
