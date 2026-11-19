#!/usr/bin/env node
// 最小 DTCG 校验：结构、类型继承、别名解析、semantic 禁止裸值。
// 用法：node validate-tokens.mjs [path/to/tokens.json]
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const file = process.argv[2] ?? resolve(here, '../tokens/baseline.json')

const errors = []
const warnings = []
let doc
try {
  doc = JSON.parse(readFileSync(file, 'utf8'))
} catch (err) {
  console.error(`[validate] 无法读取/解析 ${file}: ${err.message}`)
  process.exit(1)
}

const TOKEN = new Set()
const TYPES = new Map() // path -> inherited $type

function walk(node, path, inheritedType) {
  if (node === null || typeof node !== 'object') return
  const type = typeof node.$type === 'string' ? node.$type : inheritedType
  if ('$value' in node) {
    TOKEN.add(path)
    TYPES.set(path, type)
    return
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    walk(child, path ? `${path}.${key}` : key, type)
  }
}
walk(doc, '', undefined)

// 1) 每个 token 必须有类型（自己或继承）
for (const path of TOKEN) {
  if (!TYPES.get(path)) errors.push(`缺少 $type：${path}`)
}

const refRe = /^\{([^}]+)\}$/

// 2) 别名必须能解析
function collectRefs(value, out) {
  if (typeof value === 'string') {
    const m = value.match(refRe)
    if (m) out.push({ path: m[1], raw: value })
    return
  }
  if (Array.isArray(value)) return value.forEach((v) => collectRefs(v, out))
  if (value && typeof value === 'object') return Object.values(value).forEach((v) => collectRefs(v, out))
}
for (const path of TOKEN) {
  const refs = []
  collectRefs(doc, refs) // 占位，实际下面按 token 取
}

function getByPath(obj, path) {
  let cur = obj
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(key in cur)) return undefined
    cur = cur[key]
  }
  return cur
}

for (const path of TOKEN) {
  const refs = []
  collectRefs(getByPath(doc, path)?.$value, refs)
  for (const ref of refs) {
    const target = getByPath(doc, ref.path)
    if (!target || !('$value' in target)) errors.push(`别名无法解析：${path} -> {${ref.path}}`)
  }
}

// 3) semantic 层只允许别名，不允许裸值
const semantic = doc.semantic ?? {}
for (const [group, roles] of Object.entries(semantic)) {
  if (!roles || typeof roles !== 'object') continue
  for (const [role, token] of Object.entries(roles)) {
    if (!token || !('$value' in token)) continue
    const v = token.$value
    if (typeof v !== 'string' || !refRe.test(v)) {
      errors.push(`semantic 必须是别名：semantic.${group}.${role} = ${JSON.stringify(v)}`)
    }
  }
}

// 4) 颜色 primitive 必须有暗色值
for (const [scale, steps] of Object.entries(doc.color ?? {})) {
  if (scale.startsWith('$')) continue
  if (steps && '$value' in steps) {
    if (!steps.$extensions?.['dsh.modes']?.dark) warnings.push(`color.${scale} 缺少暗色值`)
    continue
  }
  for (const [step, token] of Object.entries(steps)) {
    if (step.startsWith('$')) continue
    if (!token?.$extensions?.['dsh.modes']?.dark) {
      warnings.push(`color.${scale}.${step} 缺少暗色值`)
    }
  }
}

// 5) 期望数量（防止误删）
const expect = [
  [/^color\.[a-z]+\.\d+$/, 72, 'color.<scale>.<1-12>'],
  [/^color\.(white|black)$/, 2, 'color.white / color.black'],
  [/^semantic\.[a-z-]+\.[a-z-]+$/, 17, 'semantic.<group>.<role>'],
  [/^type\.scale\.[a-z0-9-]+$/, 9, 'type.scale.*'],
  [/^space\.\d+$/, 12, 'space.*'],
  [/^radius\.[a-z0-9]+$/, 8, 'radius.*'],
  [/^shadow\.e\d$/, 3, 'shadow.*'],
  [/^motion\.duration\.[a-z]+$/, 4, 'motion.duration.*'],
  [/^motion\.easing\.[a-z]+$/, 2, 'motion.easing.*'],
  [/^breakpoint\.[a-z]+$/, 4, 'breakpoint.*'],
  [/^z\.[a-z]+$/, 5, 'z.*'],
]
for (const [re, count, label] of expect) {
  const hit = [...TOKEN].filter((p) => re.test(p))
  if (hit.length !== count) errors.push(`数量不符：${label} 期望 ${count}，实际 ${hit.length}`)
}

const count = TOKEN.size
if (warnings.length) console.warn(warnings.map((w) => `[warn] ${w}`).join('\n'))
if (errors.length) {
  console.error(errors.map((e) => `[error] ${e}`).join('\n'))
  console.error(`\n[validate] 失败：${errors.length} 个错误，${count} 个 token`)
  process.exit(1)
}
console.log(`[validate] 通过：${count} 个 token，${warnings.length} 个警告`)
