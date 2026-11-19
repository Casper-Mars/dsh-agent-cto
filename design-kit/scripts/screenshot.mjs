/**
 * 确定性截图流水线（零第三方依赖）。
 *
 * 起一个临时静态服务器托管 mock 目录，用 browserless 的原始 CDP WebSocket
 * （Node 内置 WebSocket）按「视口 × 状态」截图，输出：
 *   <out>/<screen>__<viewport>__<theme>__<state>.png
 *
 * 用法：
 *   node design-kit/scripts/screenshot.mjs --mock <dir> --out <dir> --screen <name>
 * 环境：
 *   DSH_BROWSER_CDP_URL / BROWSERLESS_URL  ws://host:3000/?token=xxx
 *   DSH_BROWSER_HOST                      浏览器容器看到的宿主名（默认 host.docker.internal）
 */
import { createServer } from 'node:http'
import { existsSync as fileExists, readFileSync } from 'node:fs'
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

export const VIEWPORTS = {
  desktop: { width: 1440, height: 900, mobile: false },
  tablet: { width: 1024, height: 768, mobile: true },
  mobile: { width: 390, height: 844, mobile: true },
}
export const REQUIRED_STATES = ['default', 'empty', 'loading', 'error']

export function shotName(screen, viewport, theme, state) {
  return `${screen}__${viewport}__${theme}__${state}.png`
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
    out[key.slice(2)] = value
  }
  return out
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function startStaticServer(dir) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    const file = path.join(dir, rel)
    if (!file.startsWith(path.resolve(dir)) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('not found')
      return
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => {
    server.listen(0, '0.0.0.0', () => resolve({ server, port: server.address().port }))
  })
}

class Cdp {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.sessionId = undefined
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (!msg.id || !this.pending.has(msg.id)) return
      const { resolve, reject } = this.pending.get(msg.id)
      this.pending.delete(msg.id)
      msg.error ? reject(new Error(`${msg.error.message} (${msg.error.code})`)) : resolve(msg.result)
    })
  }

  send(method, params = {}, { session = true } = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id
      this.pending.set(id, { resolve, reject })
      const payload = session && this.sessionId ? { id, method, params, sessionId: this.sessionId } : { id, method, params }
      this.ws.send(JSON.stringify(payload))
    })
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => resolve(ws))
    ws.addEventListener('error', () => reject(new Error(`无法连接 CDP：${url.replace(/token=[^&]+/, 'token=***')}`)))
  })
}

async function waitReady(cdp, timeoutMs = 8000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const res = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true })
    if (res.result?.value === 'complete') return
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error('页面加载超时')
}

async function settle(cdp) {
  await cdp.send('Runtime.evaluate', {
    expression: 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))',
    awaitPromise: true,
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const mockDir = path.resolve(args.mock ?? 'design-kit/templates/mock')
  const outDir = path.resolve(args.out ?? 'design-kit/examples/demo-page/refs')
  const screen = args.screen ?? 'screen'
  const theme = args.theme ?? 'light'
  const viewports = (args.viewports ?? 'desktop,tablet,mobile').split(',').filter((v) => VIEWPORTS[v])
  const states = (args.states ?? REQUIRED_STATES.join(',')).split(',').filter(Boolean)

  let cdpUrl = args.url ?? process.env.DSH_BROWSER_CDP_URL ?? process.env.BROWSERLESS_URL
  if (!cdpUrl && args['env-file'] && fileExists(args['env-file'])) {
    const env = Object.fromEntries(
      readFileSync(args['env-file'], 'utf8')
        .split('\n')
        .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
        .map((line) => {
          const index = line.indexOf('=')
          return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')]
        }),
    )
    if (env.BROWSERLESS_TOKEN) {
      const port = env.BROWSERLESS_PORT ?? '3000'
      cdpUrl = `ws://127.0.0.1:${port}/?token=${env.BROWSERLESS_TOKEN}`
    }
  }
  if (!cdpUrl) {
    console.error('缺少 CDP 地址：设置 DSH_BROWSER_CDP_URL / BROWSERLESS_URL，或传 --url')
    process.exit(2)
  }
  const browserHost = args['browser-host'] ?? process.env.DSH_BROWSER_HOST ?? 'host.docker.internal'

  mkdirSync(outDir, { recursive: true })
  const { server, port } = await startStaticServer(mockDir)
  const base = `http://${browserHost}:${port}`
  const ws = await connect(cdpUrl)
  const cdp = new Cdp(ws)
  const missing = []
  let count = 0

  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, { session: false })
    const attach = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, { session: false })
    cdp.sessionId = attach.sessionId

    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    })

    for (const viewport of viewports) {
      const size = VIEWPORTS[viewport]
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: size.width,
        height: size.height,
        deviceScaleFactor: 1,
        mobile: size.mobile,
      })

      for (const state of states) {
        const url = `${base}/index.html?state=${encodeURIComponent(state)}&theme=${encodeURIComponent(theme)}`
        await cdp.send('Page.navigate', { url })
        await waitReady(cdp)
        const applied = await cdp.send('Runtime.evaluate', {
          expression: 'document.documentElement.dataset.state',
          returnByValue: true,
        })
        if (applied.result?.value !== state) {
          missing.push(`${viewport}/${state}`)
          continue
        }
        await settle(cdp)
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
        const file = path.join(outDir, shotName(screen, viewport, theme, state))
        writeFileSync(file, Buffer.from(shot.data, 'base64'))
        count += 1
        console.log(`captured ${path.relative(process.cwd(), file)}`)
      }
    }

    await cdp.send('Target.closeTarget', { targetId }, { session: false })
  } finally {
    ws.close()
    server.close()
  }

  if (missing.length) {
    console.error(`\n缺少状态：${missing.join(', ')}（mock 未应用该状态）`)
    process.exit(1)
  }
  console.log(`\n完成：${count} 张截图 -> ${path.relative(process.cwd(), outDir)}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`[screenshot] 失败：${err.message}`)
    process.exit(1)
  })
}
