import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const script = path.join(root, 'design-kit/scripts/tokens-to-css.mjs')
const tokens = path.join(root, 'design-kit/tokens/baseline.json')

function generate(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'design-kit-'))
  const out = path.join(dir, 'tokens.css')
  execFileSync(process.execPath, [script, tokens, out], { stdio: 'pipe' })
  return readFileSync(out, 'utf8')
}

describe('design-kit tokens-to-css', () => {
  const css = generate()

  it('只输出 semantic 颜色：16 个变量 × 明暗两套', () => {
    expect(css.match(/--color-[a-z-]+:/g)?.length).toBe(34)
  })

  it('root 与 dark 使用同一组变量名', () => {
    const names = (block: string) => [...block.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1]).sort()
    const cut = css.indexOf('[data-theme="dark"] {')
    expect(cut).toBeGreaterThan(0)
    const rootBlock = css.slice(0, cut)
    const darkBlock = css.slice(cut)
    expect(names(rootBlock)).toHaveLength(17)
    expect(names(darkBlock)).toEqual(names(rootBlock))
  })

  it('暗色沿别名解析到 primitive 的暗色值', () => {
    expect(css).toContain('--color-surface-canvas: #fdfdfc;')
    expect(css).toContain('--color-surface-canvas: #111110;')
    expect(css).toContain('--color-text-primary: #eeeeec;')
  })

  it('非颜色域直接输出', () => {
    expect(css).toContain('--space-5: 16px;')
    expect(css).toContain('--radius-8: 8px;')
    expect(css).toContain('--shadow-e1: 0px 1px 2px 0px rgb(0 0 0 / 0.06);')
    expect(css).toContain('--duration-fast: 120ms;')
    expect(css).toContain('--easing-standard: cubic-bezier(0.2, 0, 0, 1);')
    expect(css).toContain('--font-sans: "IBM Plex Sans", "IBM Plex Sans SC", system-ui, sans-serif;')
  })

  it('生成结果是确定性的', () => {
    expect(generate()).toBe(css)
  })
})
