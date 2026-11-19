#!/usr/bin/env node
/**
 * 把设计能力从 cto（源）同步到 one（副本）。
 *
 * 同步范围：`design-kit/`（除 dist/node_modules）+ 三个 UI Skill。
 * 语义是「镜像」：dest 先清空再复制，保证不残留旧文件；因此 one 侧的
 * design-kit 与 ui-* 不允许手改，改动必须落在 cto。
 *
 * 用法：node design-kit/scripts/sync-to-one.mjs [--dest <path>]
 * 默认 dest：<repo>/../dsh-agent-one
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SKIP_DIRS = new Set(['dist', 'node_modules', '.git'])
export const SKILLS = ['ui-design', 'ui-prototype', 'ui-handoff', 'maintainer']

/** 递归列出相对路径（排除 skip 目录），按字典序。 */
export function listFiles(root, skip = SKIP_DIRS) {
  const out = []
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name)
      const rel = prefix ? `${prefix}/${name}` : name
      const info = statSync(full)
      if (info.isDirectory()) {
        if (skip.has(name)) continue
        walk(full, rel)
      } else {
        out.push(rel)
      }
    }
  }
  if (existsSync(root)) walk(root, '')
  return out
}

/** 目录内容哈希：相对路径 + 文件 sha256。 */
export function hashTree(root) {
  const map = new Map()
  for (const rel of listFiles(root)) {
    const hash = createHash('sha256').update(readFileSync(path.join(root, rel))).digest('hex')
    map.set(rel, hash)
  }
  return map
}

/** 比较两个目录：返回缺失 / 多余 / 内容不同。 */
export function diffTrees(src, dest) {
  const a = hashTree(src)
  const b = hashTree(dest)
  const missing = [...a.keys()].filter((key) => !b.has(key))
  const extra = [...b.keys()].filter((key) => !a.has(key))
  const changed = [...a.keys()].filter((key) => b.has(key) && b.get(key) !== a.get(key))
  return { missing, extra, changed }
}

/** 镜像复制：先删 dest，再复制（跳过 dist 等）。 */
export function syncTree(src, dest) {
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, {
    recursive: true,
    filter: (source) => {
      const name = path.basename(source)
      return !SKIP_DIRS.has(name)
    },
  })
}

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
    console.error(`[sync] 目标仓库不存在：${oneRoot}`)
    process.exit(2)
  }

  syncTree(kitRoot, path.join(oneRoot, 'design-kit'))
  for (const name of SKILLS) {
    const src = path.join(repoRoot, 'skills', name)
    if (!existsSync(src)) {
      console.error(`[sync] 缺少源 Skill：${src}`)
      process.exit(2)
    }
    syncTree(src, path.join(oneRoot, 'skills', name))
  }

  const drift = diffTrees(kitRoot, path.join(oneRoot, 'design-kit'))
  const problems = drift.missing.length + drift.extra.length + drift.changed.length
  if (problems > 0) {
    console.error('[sync] 复制后仍有漂移：', drift)
    process.exit(1)
  }
  console.log(`[sync] 完成：design-kit + ${SKILLS.join(' / ')} -> ${oneRoot}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
