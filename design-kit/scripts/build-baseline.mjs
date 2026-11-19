#!/usr/bin/env node
// 从 Radix Colors 的 CSS 生成 DTCG 基线 token。
// 用法：node build-baseline.mjs <radix-css-dir> > ../tokens/baseline.json
// radix-css-dir 里需要 sand.css / indigo.css / jade.css / amber.css / red.css / sky.css
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('用法: node build-baseline.mjs <radix-css-dir>')
  process.exit(1)
}

const SCALES = ['sand', 'indigo', 'jade', 'amber', 'red', 'sky']

function parseBlock(css) {
  const out = {}
  const m = css.match(/\{([\s\S]*?)\}/)
  if (!m) return out
  for (const line of m[1].split('\n')) {
    const mm = line.match(/--([a-z]+)-(\d+):\s*(#[0-9a-fA-F]{3,8})\s*;/)
    if (mm) out[mm[2]] = mm[3]
  }
  return out
}

const color = {}
for (const scale of SCALES) {
  const light = parseBlock(readFileSync(join(dir, `${scale}.css`), 'utf8'))
  const dark = parseBlock(readFileSync(join(dir, `${scale}-dark.css`), 'utf8'))
  const steps = {}
  for (let i = 1; i <= 12; i++) {
    if (!light[i] || !dark[i]) {
      console.error(`[build-baseline] ${scale}-${i} 缺失（light=${light[i]} dark=${dark[i]}）`)
      process.exit(1)
    }
    steps[String(i)] = {
      $value: light[i],
      $extensions: { 'dsh.modes': { dark: dark[i] } },
    }
  }
  color[scale] = steps
}

color.white = { $value: '#ffffff', $extensions: { 'dsh.modes': { dark: '#ffffff' } } }
color.black = { $value: '#000000', $extensions: { 'dsh.modes': { dark: '#000000' } } }

const semantic = {
  surface: {
    canvas: '{color.sand.1}',
    raised: '{color.sand.2}',
    overlay: '{color.sand.3}',
  },
  border: {
    subtle: '{color.sand.6}',
    default: '{color.sand.7}',
    strong: '{color.sand.8}',
  },
  text: {
    primary: '{color.sand.12}',
    muted: '{color.sand.11}',
    'on-action': '{color.white}',
  },
  action: {
    primary: '{color.indigo.9}',
    'primary-hover': '{color.indigo.10}',
    'primary-text': '{color.indigo.11}',
  },
  focus: {
    ring: '{color.indigo.8}',
  },
  feedback: {
    success: '{color.jade.9}',
    warning: '{color.amber.9}',
    danger: '{color.red.9}',
    info: '{color.sky.9}',
  },
}

const semanticTokens = { $type: 'color' }
for (const [group, roles] of Object.entries(semantic)) {
  semanticTokens[group] = {}
  for (const [role, value] of Object.entries(roles)) {
    semanticTokens[group][role] = { $value: value }
  }
}

const doc = {
  $description:
    '设计能力基线 token（DTCG）。neutral=Sand（暖中性），accent=Indigo；暗色值在 $extensions["dsh.modes"].dark。',
  $extensions: { 'dsh.kit': { name: 'design-kit', version: '0.1.0', source: 'radix-colors@3.0.0' } },
  color: {
    $type: 'color',
    $description: 'primitive：只允许 semantic 引用，组件禁止直接使用',
    ...color,
  },
  semantic: semanticTokens,
  type: {
    $description: '字体与字阶（产品密度，base 14px）',
    sans: { $type: 'fontFamily', $value: ['IBM Plex Sans', 'IBM Plex Sans SC', 'system-ui', 'sans-serif'] },
    mono: { $type: 'fontFamily', $value: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'] },
    scale: {
      display: { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '40px', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' } },
      h1: { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '28px', fontWeight: 600, lineHeight: 1.29, letterSpacing: '-0.01em' } },
      h2: { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '22px', fontWeight: 600, lineHeight: 1.36, letterSpacing: '0' } },
      h3: { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '18px', fontWeight: 600, lineHeight: 1.44, letterSpacing: '0' } },
      body: { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '14px', fontWeight: 400, lineHeight: 1.57, letterSpacing: '0' } },
      'body-strong': { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '14px', fontWeight: 500, lineHeight: 1.57, letterSpacing: '0' } },
      small: { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '13px', fontWeight: 400, lineHeight: 1.54, letterSpacing: '0' } },
      caption: { $type: 'typography', $value: { fontFamily: '{type.sans}', fontSize: '12px', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.01em' } },
      mono: { $type: 'typography', $value: { fontFamily: '{type.mono}', fontSize: '13px', fontWeight: 400, lineHeight: 1.54, letterSpacing: '0' } },
    },
  },
  space: {
    $type: 'dimension',
    $description: '4px 基准；组件内部 1–6 档，布局 6–12 档',
    ...Object.fromEntries([2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96].map((v, i) => [String(i + 1), { $value: `${v}px` }])),
  },
  radius: {
    $type: 'dimension',
    ...Object.fromEntries([0, 2, 4, 6, 8, 12, 16].map((v) => [String(v), { $value: `${v}px` }])),
    pill: { $value: '999px' },
  },
  shadow: {
    $type: 'shadow',
    e1: { $value: { color: 'rgb(0 0 0 / 0.06)', offsetX: '0px', offsetY: '1px', blur: '2px', spread: '0px' } },
    e2: { $value: { color: 'rgb(0 0 0 / 0.08)', offsetX: '0px', offsetY: '4px', blur: '12px', spread: '0px' } },
    e3: { $value: { color: 'rgb(0 0 0 / 0.10)', offsetX: '0px', offsetY: '12px', blur: '32px', spread: '0px' } },
  },
  motion: {
    duration: {
      $type: 'duration',
      fast: { $value: '120ms' },
      base: { $value: '180ms' },
      slow: { $value: '240ms' },
      slower: { $value: '320ms' },
    },
    easing: {
      $type: 'cubicBezier',
      standard: { $value: [0.2, 0, 0, 1] },
      emphasized: { $value: [0.2, 0, 0.2, 1.2] },
    },
  },
  breakpoint: {
    $type: 'dimension',
    sm: { $value: '640px' },
    md: { $value: '1024px' },
    lg: { $value: '1280px' },
    xl: { $value: '1600px' },
  },
  z: {
    $type: 'number',
    raised: { $value: 10 },
    sticky: { $value: 100 },
    overlay: { $value: 200 },
    dialog: { $value: 300 },
    toast: { $value: 400 },
  },
}

process.stdout.write(JSON.stringify(doc, null, 2) + '\n')
