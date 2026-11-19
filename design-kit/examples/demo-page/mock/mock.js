const params = new URLSearchParams(location.search)
const state = params.get('state') ?? 'default'
const theme = params.get('theme') ?? 'light'

document.documentElement.dataset.state = state
if (theme === 'dark') document.documentElement.dataset.theme = 'dark'

const rows = document.getElementById('rows')
const empty = document.getElementById('empty')
const banner = document.getElementById('error-banner')

const items = Array.from({ length: state === 'long-list' ? 30 : 8 }, (_, i) => ({
  name: `设备 ${String(i + 1).padStart(2, '0')}`,
  status: ['正常', '告警', '离线'][i % 3],
  owner: ['张三', '李四', '王五'][i % 3],
  time: `2026-11-${String((i % 28) + 1).padStart(2, '0')} 10:${String((i * 7) % 60).padStart(2, '0')}`,
}))

function pill(status) {
  const cls = status === '正常' ? 'pill-ok' : status === '告警' ? 'pill-warn' : 'pill-bad'
  return `<span class="pill ${cls}">${status}</span>`
}

function renderSkeleton() {
  rows.innerHTML = Array.from({ length: 5 }, () => `
    <tr>
      <td><div class="skeleton" style="width:60%"></div></td>
      <td><div class="skeleton" style="width:40%"></div></td>
      <td><div class="skeleton" style="width:50%"></div></td>
      <td><div class="skeleton" style="width:70%"></div></td>
    </tr>`).join('')
}

if (state === 'empty') {
  rows.innerHTML = ''
  empty.hidden = false
} else if (state === 'loading') {
  renderSkeleton()
} else if (state === 'error') {
  rows.innerHTML = ''
  banner.hidden = false
} else {
  rows.innerHTML = items.map((it) => `
    <tr>
      <td>${it.name}</td>
      <td>${pill(it.status)}</td>
      <td>${it.owner}</td>
      <td>${it.time}</td>
    </tr>`).join('')
}
