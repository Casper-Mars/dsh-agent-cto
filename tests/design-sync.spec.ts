import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// @ts-expect-error .mjs 脚本没有类型声明
import { SKILLS, diffTrees, listFiles, syncTree } from '../design-kit/scripts/sync-to-one.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const oneRoot = path.resolve(root, '..', 'dsh-agent-one')
const hasSibling = existsSync(oneRoot)

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'design-sync-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel)
    mkdirSync(path.dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return dir
}

describe('design-kit 同步工具', () => {
  it('listFiles 跳过 dist / node_modules', () => {
    const dir = fixture({ 'a.txt': 'a', 'dist/b.txt': 'b', 'nested/c.txt': 'c' })
    expect(listFiles(dir)).toEqual(['a.txt', 'nested/c.txt'])
  })

  it('diffTrees 分辨缺失 / 多余 / 改动', () => {
    const a = fixture({ 'keep.txt': '1', 'change.txt': '2', 'missing.txt': '3' })
    const b = fixture({ 'keep.txt': '1', 'change.txt': 'x', 'extra.txt': '4' })
    const diff = diffTrees(a, b)
    expect(diff.changed).toEqual(['change.txt'])
    expect(diff.missing).toEqual(['missing.txt'])
    expect(diff.extra).toEqual(['extra.txt'])
  })

  it('syncTree 是镜像：多余文件被清掉', () => {
    const src = fixture({ 'a.txt': '1', 'sub/b.txt': '2' })
    const dest = fixture({ 'old.txt': 'stale' })
    syncTree(src, dest)
    expect(listFiles(dest)).toEqual(['a.txt', 'sub/b.txt'])
    expect(readFileSync(path.join(dest, 'sub/b.txt'), 'utf8')).toBe('2')
  })
})

describe.skipIf(!hasSibling)('源 / 副本一致性', () => {
  it('design-kit 与三个 UI Skill 逐字节一致', () => {
    const pairs: Array<[string, string, string]> = [
      ['design-kit', path.join(root, 'design-kit'), path.join(oneRoot, 'design-kit')],
      ...SKILLS.map((name: string) => [
        name,
        path.join(root, 'skills', name),
        path.join(oneRoot, 'skills', name),
      ] as [string, string, string]),
    ]
    for (const [label, src, dest] of pairs) {
      const { missing, extra, changed } = diffTrees(src, dest)
      expect({ label, missing, extra, changed }).toEqual({ label, missing: [], extra: [], changed: [] })
    }
  })
})
