#!/usr/bin/env node
// 由基线生成「实例模板」：brand 决策变成 {{neutral}} / {{accent}} 占位符。
// 用法：node build-template-tokens.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const src = path.join(root, 'tokens', 'baseline.json')
const out = path.join(root, 'templates', 'design', 'tokens.json')

const doc = JSON.parse(readFileSync(src, 'utf8'))
for (const [group, roles] of Object.entries(doc.semantic ?? {})) {
  if (group.startsWith('$')) continue
  for (const token of Object.values(roles)) {
    if (typeof token?.$value !== 'string') continue
    token.$value = token.$value
      .replace('{color.sand.', '{color.{{neutral}}.')
      .replace('{color.indigo.', '{color.{{accent}}.')
  }
}
doc.$description = '项目实例模板：把 {{neutral}} / {{accent}} 替换为基线里的色系名（默认 sand / indigo），其余按项目需要调整。'
doc.$extensions = { 'dsh.kit': { name: 'design-kit', version: '0.1.0', template: true, baseline: 'baseline.json' } }

writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf8')
console.log(`[build-template-tokens] -> ${out}`)
