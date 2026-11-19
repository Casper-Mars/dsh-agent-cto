#!/usr/bin/env node
/**
 * 漂移检查：cto（源）与 one（副本）的 design-kit 与三个 UI Skill 必须逐字节一致。
 * 用法：node design-kit/scripts/check-drift.mjs [--dest <one-root>]
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SKILLS, diffTrees } from './sync-to-one.mjs'

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const kitRoot = path.resolve(here, '..')
  const repoRoot = path.resolve(kitRoot, '..')
  const args = process.argv.slice(2)
  const destIndex = args.indexOf('--dest')
  const oneRoot = destIndex >= 0 && args[destIndex + 1]
    ? path.resolve(args[destIndex + 1])
    : path.resolve(repoRoot, '..', 'dsh-agent-one')

  if (!existsSync(oneRoot)) {
    console.error(`[drift] 目标仓库不存在：${oneRoot}`)
    process.exit(2)
  }

  const pairs = [
    ['design-kit', kitRoot, path.join(oneRoot, 'design-kit')],
    ...SKILLS.map((name) => [
      `skills/${name}`,
      path.join(repoRoot, 'skills', name),
      path.join(oneRoot, 'skills', name),
    ]),
  ]

  let failed = 0
  for (const [label, src, dest] of pairs) {
    const { missing, extra, changed } = diffTrees(src, dest)
    const total = missing.length + extra.length + changed.length
    if (total === 0) {
      console.log(`[drift] OK ${label}`)
      continue
    }
    failed += 1
    console.error(`[drift] FAIL ${label}: missing=${missing.length} extra=${extra.length} changed=${changed.length}`)
    for (const file of missing) console.error(`  - 缺失 ${file}`)
    for (const file of extra) console.error(`  - 多余 ${file}`)
    for (const file of changed) console.error(`  - 不一致 ${file}`)
  }

  if (failed > 0) {
    console.error(`\n[drift] ${failed} 组不一致：源是 dsh-agent-cto，请运行 pnpm design:sync`)
    process.exit(1)
  }
  console.log('[drift] 全部一致')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
