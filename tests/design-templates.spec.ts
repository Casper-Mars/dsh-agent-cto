import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tpl = path.join(root, 'design-kit/templates/design')
const validator = path.join(root, 'design-kit/scripts/validate-tokens.mjs')

const files = ['tokens.json', 'components.md', 'screens/_template.md', 'flows.md', 'README.md']

describe('design-kit 实例模板', () => {
  it('五个模板文件齐全且非空', () => {
    for (const file of files) {
      const full = path.join(tpl, file)
      expect(existsSync(full), file).toBe(true)
      expect(statSync(full).size, file).toBeGreaterThan(0)
    }
  })

  it('tokens 模板保留品牌占位符，禁止未填就交付', () => {
    const tokens = readFileSync(path.join(tpl, 'tokens.json'), 'utf8')
    expect(tokens).toContain('{{neutral}}')
    expect(tokens).toContain('{{accent}}')
  })

  it('填完占位符后就是一个合法实例', () => {
    const raw = readFileSync(path.join(tpl, 'tokens.json'), 'utf8')
    const filled = raw.replaceAll('{{neutral}}', 'sand').replaceAll('{{accent}}', 'indigo')
    const dir = mkdtempSync(path.join(tmpdir(), 'design-instance-'))
    const out = path.join(dir, 'tokens.json')
    writeFileSync(out, filled, 'utf8')
    const result = execFileSync(process.execPath, [validator, out], { encoding: 'utf8' })
    expect(result).toContain('通过')
    expect(filled).not.toContain('{{')
  })

  it('screen 模板包含状态矩阵与断点', () => {
    const screen = readFileSync(path.join(tpl, 'screens/_template.md'), 'utf8')
    for (const key of ['断点', '状态矩阵', 'default', 'empty', 'loading', 'error', '使用 token']) {
      expect(screen, key).toContain(key)
    }
  })

  it('README 写清三类清单与七步流程', () => {
    const readme = readFileSync(path.join(tpl, 'README.md'), 'utf8')
    for (const key of ['必须改', '不许改', '留空等人', '七步']) {
      expect(readme, key).toContain(key)
    }
  })
})
