/**
 * 设计契约校验（`pnpm design:check <dir>`）。
 *
 * 五类检查：
 *   1) 魔法值：样式文件里禁止 hex / px 字面量（tokens.css 与 mock/ 原型除外）
 *   2) 别名：semantic 只能指向 color primitive，不能链式或裸值
 *   3) 对比度：正文类语义色在 surface 上的 APCA Lc ≥ 60
 *   4) 模板残留：{{...}} 与 TODO:
 *   5) 截图覆盖：screens 状态矩阵里的每个状态，三视口都要有 refs
 *
 * 输出 `文件:行: 说明`；有任何错误退出码 1。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const HEX = /#[0-9a-fA-F]{3,8}\b/
const PX = /\b\d+(?:\.\d+)?px\b/
const REF = /^\{([^}]+)\}$/
const VIEWPORTS = ['desktop', 'tablet', 'mobile']
const LC_TEXT = 60

function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, filter, out)
    else if (filter(full)) out.push(full)
  }
  return out
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

function getByPath(doc, dotted) {
  let cur = doc
  for (const key of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(key in cur)) return undefined
    cur = cur[key]
  }
  return cur
}

function channel(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
}

function luminance(hex) {
  const [r, g, b] = channel(hex).map((c) => Math.pow(c, 2.4))
  return 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
}

function softClamp(y) {
  return y < 0.022 ? y + Math.pow(0.022 - y, 1.414) : y
}

/** APCA 0.1.9：返回对比度绝对值（Lc）。 */
export function apca(textHex, bgHex) {
  const Ytxt = softClamp(luminance(textHex))
  const Ybg = softClamp(luminance(bgHex))
  if (Ybg > Ytxt) {
    const sapc = (Math.pow(Ybg, 0.56) - Math.pow(Ytxt, 0.57)) * 1.14
    return Math.abs(sapc < 0.1 ? 0 : (sapc - 0.027) * 100)
  }
  const sapc = (Math.pow(Ybg, 0.65) - Math.pow(Ytxt, 0.62)) * 1.14
  return Math.abs(sapc > -0.1 ? 0 : (sapc + 0.027) * 100)
}

function parseStateMatrix(text) {
  // 只认 | state | 开头的表格行；跳过表头与分隔线
  const states = new Set()
  for (const raw of text.split('\n')) {
    const m = raw.match(/^\|\s*`?([a-z][a-z-]*)`?\s*\|/)
    if (!m) continue
    const name = m[1]
    if (['状态', 'state'].includes(name)) continue
    states.add(name)
  }
  return [...states]
}

export function runChecks(root) {
  const errors = []
  const warnings = []
  const tokenFile = path.join(root, 'tokens.json')
  let doc = undefined

  if (existsSync(tokenFile)) {
    doc = JSON.parse(readFileSync(tokenFile, 'utf8'))
  } else {
    errors.push(`${path.relative(process.cwd(), tokenFile)}:1: 缺少 tokens.json`)
  }

  // 1) 魔法值
  const styleFiles = walk(root, (f) => /\.(css|html)$/.test(f))
  for (const file of styleFiles) {
    const rel = path.relative(root, file)
    if (rel === 'tokens.css' || rel.startsWith('mock' + path.sep) || rel.includes('/mock/')) continue
    const text = readFileSync(file, 'utf8')
    const noComments = text.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    for (const [label, re] of [
      ['hex 字面量', HEX],
      ['px 字面量', PX],
    ]) {
      const m = noComments.match(re)
      if (m) errors.push(`${rel}:${lineOf(noComments, m.index ?? 0)}: 禁止${label}（用 token）`)
    }
  }

  // 2) semantic 别名
  const semantic = doc?.semantic ?? {}
  for (const [group, roles] of Object.entries(semantic)) {
    if (group.startsWith('$')) continue
    for (const [role, token] of Object.entries(roles)) {
      if (!token || typeof token.$value !== 'string') continue
      const m = token.$value.match(REF)
      const at = `tokens.json:semantic.${group}.${role}`
      if (!m) {
        errors.push(`${at}: semantic 必须是别名，当前为 ${JSON.stringify(token.$value)}`)
        continue
      }
      if (!/^color\./.test(m[1])) errors.push(`${at}: 只能指向 color primitive，当前 ${token.$value}`)
      const target = getByPath(doc, m[1])
      if (!target || !('$value' in target)) errors.push(`${at}: 别名无法解析 ${token.$value}`)
      if (getByPath(doc, `semantic.${m[1].replace(/^semantic\./, '')}`)) {
        errors.push(`${at}: 禁止 semantic → semantic 链式引用`)
      }
    }
  }

  // 3) 对比度
  if (doc) {
    const pairs = [
      ['text.primary', 'surface.canvas'],
      ['text.primary', 'surface.raised'],
      ['text.muted', 'surface.canvas'],
      ['text.muted', 'surface.raised'],
      ['action.primary-text', 'surface.raised'],
    ]
    for (const [textRef, bgRef] of pairs) {
      const t = getByPath(doc, `semantic.${textRef}`)?.$value
      const b = getByPath(doc, `semantic.${bgRef}`)?.$value
      if (typeof t !== 'string' || typeof b !== 'string') continue
      const tm = t.match(REF)
      const bm = b.match(REF)
      if (!tm || !bm) continue
      const tv = getByPath(doc, tm[1])?.$value
      const bv = getByPath(doc, bm[1])?.$value
      if (typeof tv !== 'string' || typeof bv !== 'string') continue
      const lc = apca(tv, bv)
      if (lc < LC_TEXT) errors.push(`tokens.json:semantic.${textRef}: APCA Lc ${lc.toFixed(1)} < ${LC_TEXT}（on surface.${bgRef}）`)
    }
  }

  // 4) 模板残留
  const scanFiles = walk(root, (f) => /\.(md|json|css|html|js)$/.test(f))
  for (const file of scanFiles) {
    const text = readFileSync(file, 'utf8')
    const rel = path.relative(root, file)
    for (const [label, re] of [
      ['占位符 {{', /\{\{[^}]+\}\}/],
      ['TODO', /TODO:/],
    ]) {
      const m = text.match(re)
      if (m) errors.push(`${rel}:${lineOf(text, m.index ?? 0)}: 存在${label}，未填完`)
    }
  }

  // 5) refs 覆盖
  const screensDir = path.join(root, 'screens')
  const refsDir = path.join(root, 'refs')
  const refFiles = existsSync(refsDir) ? readdirSync(refsDir).filter((f) => f.endsWith('.png')) : []
  const screens = walk(screensDir, (f) => f.endsWith('.md'))
  for (const file of screens) {
    const rel = path.relative(root, file)
    const text = readFileSync(file, 'utf8')
    const screen = path.basename(file, '.md')
    const states = parseStateMatrix(text)
    if (states.length === 0) warnings.push(`${rel}: 未解析到状态矩阵`)
    for (const state of states) {
      for (const viewport of VIEWPORTS) {
        const name = `${screen}__${viewport}__light__${state}.png`
        if (!refFiles.includes(name)) errors.push(`refs/${name}: 缺少截图（${screen} / ${state}）`)
      }
    }
  }

  return { errors, warnings }
}

function main() {
  const root = path.resolve(process.argv[2] ?? 'design-kit/examples/demo-page/design')
  if (!existsSync(root)) {
    console.error(`[check] 目录不存在：${root}`)
    process.exit(2)
  }
  const { errors, warnings } = runChecks(root)
  for (const w of warnings) console.warn(`[warn] ${w}`)
  for (const e of errors) console.error(`[error] ${e}`)
  if (errors.length) {
    console.error(`\n[check] 失败：${errors.length} 个错误`)
    process.exit(1)
  }
  console.log(`[check] 通过（${warnings.length} 个警告）`)
}

import { pathToFileURL } from 'node:url'
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
