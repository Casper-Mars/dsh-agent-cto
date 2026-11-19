/**
 * DTCG → CSS 变量（`pnpm design:css`）。
 *
 * 规则：
 * - 颜色只输出 `semantic.*`（primitive 不暴露给组件）；
 * - 暗色不是第二套值，而是同一批变量在 `[data-theme="dark"]` 下重新解析：
 *   先看 semantic 自己的 `$extensions["dsh.modes"].dark`，再沿别名解析到 primitive 的暗色值；
 * - 非颜色域（间距/圆角/阴影/动效/断点/z）直接输出，没有 semantic 层。
 *
 * 用法：
 *   node design-kit/scripts/tokens-to-css.mjs [tokens.json] [out.css]
 * 默认：design-kit/tokens/baseline.json → design-kit/dist/tokens.css
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REF = /^\{([^}]+)\}$/
const MODES = 'dsh.modes'

function getByPath(doc, dotted) {
  let cur = doc
  for (const key of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(key in cur)) return undefined
    cur = cur[key]
  }
  return cur
}

/** 解析别名（可跨多层），mode = 'light' | 'dark'。 */
export function resolveValue(doc, value, mode = 'light') {
  let cur = value
  for (let guard = 0; guard < 16; guard++) {
    if (typeof cur !== 'string') return cur
    const match = cur.match(REF)
    if (!match) return cur
    const target = getByPath(doc, match[1])
    if (!target || !('$value' in target)) throw new Error(`别名无法解析：{${match[1]}}`)
    cur = target.$extensions?.[MODES]?.[mode] ?? target.$value
  }
  throw new Error(`别名层级过深：${String(value)}`)
}

function entries(group) {
  return Object.entries(group ?? {}).filter(([key]) => !key.startsWith('$'))
}

function cssFontFamily(value) {
  const list = Array.isArray(value) ? value : [String(value)]
  return list.map((name) => (/\s/.test(name) ? `"${name}"` : name)).join(', ')
}

function cssShadow(value) {
  const v = value ?? {}
  return [v.offsetX, v.offsetY, v.blur, v.spread, v.color].filter((x) => x !== undefined && x !== null).join(' ')
}

function cssCubicBezier(value) {
  return `cubic-bezier(${(value ?? []).join(', ')})`
}

function cssDimension(value) {
  return String(value)
}

function colorVars(doc, mode) {
  const lines = []
  const semantic = doc.semantic ?? {}
  for (const [group, roles] of entries(semantic)) {
    if (!roles || typeof roles !== 'object' || group.startsWith('$')) continue
    for (const [role, token] of entries(roles)) {
      if (!token || !('$value' in token)) continue
      lines.push(`  --color-${group}-${role}: ${resolveValue(doc, token.$value, mode)};`)
    }
  }
  return lines
}

function baseVars(doc) {
  const lines = []

  lines.push('  /* typography */')
  lines.push(`  --font-sans: ${cssFontFamily(resolveValue(doc, doc.type?.sans?.$value))};`)
  lines.push(`  --font-mono: ${cssFontFamily(resolveValue(doc, doc.type?.mono?.$value))};`)
  for (const [role, token] of entries(doc.type?.scale)) {
    if (!token || !('$value' in token)) continue
    const v = token.$value
    lines.push(`  --text-${role}-size: ${cssDimension(resolveValue(doc, v.fontSize))};`)
    lines.push(`  --text-${role}-weight: ${v.fontWeight};`)
    lines.push(`  --text-${role}-line-height: ${v.lineHeight};`)
    lines.push(`  --text-${role}-letter-spacing: ${v.letterSpacing ?? '0'};`)
  }

  lines.push('')
  lines.push('  /* space */')
  for (const [step, token] of entries(doc.space)) {
    if (!token || !('$value' in token)) continue
    lines.push(`  --space-${step}: ${cssDimension(token.$value)};`)
  }

  lines.push('')
  lines.push('  /* radius */')
  for (const [key, token] of entries(doc.radius)) {
    if (!token || !('$value' in token)) continue
    lines.push(`  --radius-${key}: ${cssDimension(token.$value)};`)
  }

  lines.push('')
  lines.push('  /* shadow */')
  for (const [key, token] of entries(doc.shadow)) {
    if (!token || !('$value' in token)) continue
    lines.push(`  --shadow-${key}: ${cssShadow(token.$value)};`)
  }

  lines.push('')
  lines.push('  /* motion */')
  for (const [key, token] of entries(doc.motion?.duration)) {
    if (!token || !('$value' in token)) continue
    lines.push(`  --duration-${key}: ${token.$value};`)
  }
  for (const [key, token] of entries(doc.motion?.easing)) {
    if (!token || !('$value' in token)) continue
    lines.push(`  --easing-${key}: ${cssCubicBezier(token.$value)};`)
  }

  lines.push('')
  lines.push('  /* breakpoints（不能用于 media query，仅供 JS / 容器查询参考） */')
  for (const [key, token] of entries(doc.breakpoint)) {
    if (!token || !('$value' in token)) continue
    lines.push(`  --breakpoint-${key}: ${cssDimension(token.$value)};`)
  }

  lines.push('')
  lines.push('  /* z-index */')
  for (const [key, token] of entries(doc.z)) {
    if (!token || !('$value' in token)) continue
    lines.push(`  --z-${key}: ${token.$value};`)
  }

  return lines
}

/** 生成完整 CSS 文本。 */
export function renderTokensCss(doc) {
  const header = [
    '/* 由 design-kit/scripts/tokens-to-css.mjs 生成，请勿手改。',
    ' * 源：design-kit/tokens/baseline.json',
    ' * 规则：颜色只暴露 semantic；暗色为同一批变量在 [data-theme="dark"] 下重新解析。',
    ' */',
  ]
  const light = [...colorVars(doc, 'light')]
  const dark = [...colorVars(doc, 'dark')]
  const base = baseVars(doc)

  return [
    ...header,
    '',
    ':root {',
    ...light,
    ...base,
    '}',
    '',
    '[data-theme="dark"] {',
    ...dark,
    '}',
    '',
  ].join('\n')
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const root = path.resolve(here, '..')
  const input = process.argv[2] ?? path.join(root, 'tokens', 'baseline.json')
  const output = process.argv[3] ?? path.join(root, 'dist', 'tokens.css')

  const css = renderTokensCss(JSON.parse(readFileSync(input, 'utf8')))
  mkdirSync(path.dirname(output), { recursive: true })
  writeFileSync(output, css, 'utf8')
  console.log(`[tokens-to-css] ${input} -> ${output} (${css.length} bytes)`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
