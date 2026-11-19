import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// @ts-expect-error .mjs 脚本没有类型声明
import { apca, runChecks } from '../design-kit/scripts/check.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const clean = path.join(root, 'tests/fixtures/design-clean')

function clone(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'design-check-'))
  cpSync(clean, dir, { recursive: true })
  return dir
}

function editTokens(dir: string, fn: (doc: any) => void) {
  const file = path.join(dir, 'tokens.json')
  const doc = JSON.parse(readFileSync(file, 'utf8'))
  fn(doc)
  writeFileSync(file, JSON.stringify(doc, null, 2))
}

describe('design-kit check', () => {
  it('fixture 与基线保持同步', () => {
    const a = JSON.parse(readFileSync(path.join(clean, 'tokens.json'), 'utf8'))
    const b = JSON.parse(readFileSync(path.join(root, 'design-kit/tokens/baseline.json'), 'utf8'))
    expect(a).toEqual(b)
  })

  it('干净实例零错误', () => {
    const { errors } = runChecks(clean)
    expect(errors).toEqual([])
  })

  it('APCA 极性正确', () => {
    expect(apca('#000000', '#ffffff')).toBeGreaterThan(105)
    expect(apca('#ffffff', '#000000')).toBeGreaterThan(105)
  })

  it('抓到 hex 与 px 字面量', () => {
    const dir = clone()
    writeFileSync(path.join(dir, 'styles.css'), 'a{color:#fff}b{width:12px}')
    const { errors } = runChecks(dir)
    expect(errors.some((e: string) => e.includes('hex'))).toBe(true)
    expect(errors.some((e: string) => e.includes('px'))).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })

  it('抓到 semantic 非别名 / 链式引用', () => {
    const dir = clone()
    editTokens(dir, (doc) => {
      doc.semantic.text.primary.$value = '#21201c'
      doc.semantic.text.muted.$value = '{semantic.text.primary}'
    })
    const { errors } = runChecks(dir)
    expect(errors.some((e: string) => e.includes('semantic.text.primary'))).toBe(true)
    expect(errors.some((e: string) => e.includes('semantic.text.muted'))).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })

  it('抓到低对比度', () => {
    const dir = clone()
    editTokens(dir, (doc) => {
      doc.semantic.text.primary.$value = '{color.sand.8}'
    })
    const { errors } = runChecks(dir)
    expect(errors.some((e: string) => e.includes('APCA'))).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })

  it('抓到模板残留', () => {
    const dir = clone()
    writeFileSync(path.join(dir, 'components.md'), '# {{COMPONENT_NAME}}\n')
    const { errors } = runChecks(dir)
    expect(errors.some((e: string) => e.includes('占位符'))).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })

  it('抓到缺失截图', () => {
    const dir = clone()
    rmSync(path.join(dir, 'refs/device-list__mobile__light__error.png'))
    const { errors } = runChecks(dir)
    expect(errors.some((e: string) => e.includes('缺少截图'))).toBe(true)
    rmSync(dir, { recursive: true, force: true })
  })
})
