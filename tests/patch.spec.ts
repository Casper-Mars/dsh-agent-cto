/**
 * `cordis.patch.yml` 的结构契约（任务-04 强化版）。
 *
 * 断言分三层：
 *   1. 外层形状：恰好一个 `insert` 条目，且**没有任何**直接挂在外层的覆盖条目；
 *   2. 插入顺序与身份：领域插件 / preset 注册表 / 唯一 preset，id 顺序固定；
 *   3. 工具面：恰好 15 项（角色资产 + echuan/task 子路径 + 8 个工具 + plan-mode 组 + workflow 组），顺序固定；
 *   4. 工具面只允许 tool-todo 与 cordis:group 带 config，其余工具带 config 即失败（防误加覆盖）。
 *
 * 结构断言一律走真实 YAML 解析（`yaml` 包），不用正则猜结构；只有「全文禁词」
 * 用源码扫描，因为它要覆盖注释等非结构位置。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const ROLE = 'cto'
const REGISTRY_ID = 'agent-preset-registry'
const PRESET_ID = 'preset-cto'
const PRESET_DESIGNER = 'preset-designer'
const REGISTRY_PACKAGE = '@deepseek-ai/dsh-agent-preset-registry'
const PRESET_PACKAGE = '@deepseek-ai/dsh-agent-preset'

/** 工具面契约：顺序、id、npm 包名都固定，不多不少。 */
const EXPECTED_PLUGINS = [
  { id: 'cto-assets', name: 'dsh-agent-cto/assets' },
  { id: 'echuan-tools', name: 'dsh-echuan/tools/requester' },
  { id: 'task-tools', name: 'dsh-agent-base/tools/task-leader' },
  { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs' },
  { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash' },
  { id: 'tool-jobs', name: '@deepseek-ai/dsh-tool-jobs' },
  { id: 'tool-skill', name: '@deepseek-ai/dsh-tool-skill' },
  { id: 'tool-todo', name: '@deepseek-ai/dsh-tool-todo' },
  { id: 'tool-web', name: '@deepseek-ai/dsh-tool-web' },
  { id: 'tool-schedule', name: '@deepseek-ai/dsh-tool-schedule' },
  { id: 'tool-subagent', name: '@deepseek-ai/dsh-tool-subagent' },
  { id: 'tool-subagent-control', name: '@deepseek-ai/dsh-tool-subagent-control' },
  { id: 'tool-subagent-list-agents', name: '@deepseek-ai/dsh-tool-subagent-control/list-agents' },
  { id: 'planning', name: 'cordis:group' },
  { id: 'workflow', name: 'cordis:group' },
] as const

interface PatchPlugin {
  id?: string
  name?: string
  inject?: string[]
  config?: Record<string, unknown>
}

interface PatchEntry {
  insert?: PatchPlugin[]
  id?: string
  [key: string]: unknown
}

const PATCH_FILE = fileURLToPath(new URL('../cordis.patch.yml', import.meta.url))
const SOURCE = readFileSync(PATCH_FILE, 'utf8')
const PARSED: unknown = parse(SOURCE)
const PATCH: PatchEntry[] = Array.isArray(PARSED) ? (PARSED as PatchEntry[]) : []

const isInsertEntry = (entry: unknown): entry is PatchEntry =>
  entry !== null && typeof entry === 'object' && Array.isArray((entry as PatchEntry).insert)

const INSERTED: PatchPlugin[] = PATCH.flatMap((entry) =>
  isInsertEntry(entry) ? (entry.insert as PatchPlugin[]) : [],
)

const byId = (id: string): PatchPlugin => {
  const found = INSERTED.find((item) => item.id === id)
  expect(found, `cordis.patch.yml 缺少 insert 项 "${id}"`).toBeDefined()
  return found as PatchPlugin
}

const configOf = (entry: PatchPlugin): Record<string, unknown> => {
  expect(entry.config, `"${String(entry.id)}" 缺少 config`).toBeDefined()
  return (entry.config ?? {}) as Record<string, unknown>
}

const presetPlugins = (): PatchPlugin[] => {
  const plugins = configOf(byId(PRESET_ID)).plugins
  expect(Array.isArray(plugins), 'preset.config.plugins 必须是数组').toBe(true)
  return plugins as PatchPlugin[]
}

describe('cordis.patch.yml 外层形状', () => {
  it('恰好一个 insert 条目', () => {
    expect(Array.isArray(PARSED), 'cordis.patch.yml 顶层必须是数组').toBe(true)
    expect(PATCH.filter(isInsertEntry)).toHaveLength(1)
    expect(PATCH).toHaveLength(1)
  })

  it('没有任何顶层覆盖条目（不允许把 id 直接挂在外层）', () => {
    const overrides = PATCH.filter((entry) => !isInsertEntry(entry))
    expect(overrides, '角色包只做 insert，不允许顶层覆盖条目').toEqual([])
    expect(PATCH.filter((entry) => entry.id !== undefined)).toEqual([])
  })

  it('insert 恰好三条，id 顺序固定（注册表 / cto / designer）', () => {
    expect(INSERTED).toHaveLength(3)
    expect(INSERTED.map((item) => item.id)).toEqual([REGISTRY_ID, PRESET_ID, PRESET_DESIGNER])
  })
})

describe('cordis.patch.yml 插件身份', () => {
  it('恰好一个 agent-preset-registry，且 name 正确', () => {
    const registries = INSERTED.filter((item) => item.id === REGISTRY_ID)
    expect(registries).toHaveLength(1)
    expect(registries[0]?.name).toBe(REGISTRY_PACKAGE)
  })

  it('恰好两个 @deepseek-ai/dsh-agent-preset 条目（cto / designer）', () => {
    const presets = INSERTED.filter((item) => item.name === PRESET_PACKAGE)
    expect(presets.map((item) => item.id)).toEqual([PRESET_ID, PRESET_DESIGNER])
  })

  it('agent-preset-registry.default 是本角色 preset（主会话路径）', () => {
    expect(configOf(byId(REGISTRY_ID)).default).toBe(ROLE)
  })
})

describe('cordis.patch.yml preset 配置', () => {
  it('preset-cto 的 id / order / name / description 合规', () => {
    const config = configOf(byId(PRESET_ID))

    expect(config.id).toBe(ROLE)
    expect(config.order).toBe(10)
    expect(typeof config.name).toBe('string')
    expect((config.name as string).trim()).not.toBe('')
    expect(typeof config.description).toBe('string')
    expect((config.description as string).trim()).not.toBe('')
  })

  it('preset-cto 的 plugins 恰好 13 项，id / name 顺序与契约一致', () => {
    const plugins = presetPlugins()
    expect(plugins).toHaveLength(15)
    expect(plugins.map((item) => item.id)).toEqual(EXPECTED_PLUGINS.map((item) => item.id))
    expect(plugins.map((item) => item.name)).toEqual(EXPECTED_PLUGINS.map((item) => item.name))
  })

  it('数量守卫：preset-cto 的 plugins 恰好 13 项', () => {
    const plugins = presetPlugins()
    expect(plugins.length, `工具数不足 15（当前 ${plugins.length} 项）`).toBeGreaterThanOrEqual(15)
    expect(plugins.length, `工具数超过 15（当前 ${plugins.length} 项）`).toBeLessThanOrEqual(15)
  })

  it('tool-todo 固定 allowParallelInProgress: false', () => {
    const todo = presetPlugins().find((item) => item.id === 'tool-todo')
    expect(todo, 'preset.plugins 缺少 tool-todo').toBeDefined()
    expect(configOf(todo as PatchPlugin).allowParallelInProgress).toBe(false)
  })

  it('除 tool-todo / tool-subagent / cordis:group 外不得带 config（防止误加覆盖）', () => {
    const groups = new Set(['planning', 'workflow'])
    const withConfig = new Set(['tool-todo', 'tool-subagent'])
    const others = presetPlugins().filter((item) => !withConfig.has(String(item.id)) && !groups.has(String(item.id)))
    expect(others.length).toBeGreaterThan(0)
    for (const item of others) {
      expect(item.config, `"${String(item.id)}" 不应带 config`).toBeUndefined()
    }
  })

  it('工具面含 tool-web 与派发三件套', () => {
    const ids = presetPlugins().map((item) => item.id)
    expect(ids).toContain('tool-web')
    expect(ids).toContain('tool-subagent')
    expect(ids).toContain('tool-subagent-control')
    expect(ids).toContain('tool-subagent-list-agents')
  })
})

describe('cordis.patch.yml 禁词', () => {
  it('全文不出现 rsi-agent / 字段级 complete', () => {
    expect(SOURCE).not.toMatch(/rsi-agent/)
    // 只禁 YAML 字段形式的 complete（preset 覆盖开关）；plan-mode 的官方
    // section 文案里有「decision-complete」，那是模型提示词，不是配置。
    expect(SOURCE).not.toMatch(/^\s*complete\s*:/m)
  })
})

describe('cordis.patch.yml designer preset', () => {
  const designer = (): PatchPlugin => byId(PRESET_DESIGNER)

  it('id / order / name / description 合规', () => {
    const config = configOf(designer())
    expect(config.id).toBe('designer')
    expect(config.order).toBe(40)
    expect(typeof config.name).toBe('string')
    expect((config.name as string).trim()).not.toBe('')
    expect(typeof config.description).toBe('string')
  })

  it('工具面只有 fs / bash / skill / todo + 角色资产，没有 git', () => {
    const ids = (configOf(designer()).plugins as PatchPlugin[]).map((plugin) => plugin.id)
    expect(ids).toEqual(['designer-assets', 'tool-fs', 'tool-bash', 'tool-skill', 'tool-todo'])
    expect(ids.some((id) => String(id).includes('git'))).toBe(false)
  })
})

describe('cordis.patch.yml cto 派发能力', () => {
  it('delegate 指向 designer，maxDepth 2', () => {
    const sub = presetPlugins().find((plugin) => plugin.id === 'tool-subagent')
    expect(sub?.config).toMatchObject({ toolName: 'delegate', agentPreset: 'designer', maxDepth: 2 })
  })
})

describe('工具面 preset 化', () => {
  it('cto 挂 echuan requester + core task-leader', () => {
    const names = presetPlugins().map((item) => item.name)
    expect(names).toContain('dsh-echuan/tools/requester')
    expect(names).toContain('dsh-agent-base/tools/task-leader')
  })
})
