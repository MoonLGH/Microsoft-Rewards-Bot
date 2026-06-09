const childProcess = require('child_process')
const http = require('http')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const PORT = Number.parseInt(process.env.MSRB_UI_PORT || '0', 10)

const state = {
    status: 'Starting',
    detail: 'Preparing Microsoft Rewards Bot',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    logs: [],
    metrics: {
        accounts: null,
        points: null,
        core: 'Checking',
        coupons: null
    }
}

let botProcess = null

function pushLog(level, message) {
    const clean = String(message || '').replace(/\x1b\[[0-9;]*m/g, '').trim()
    if (!clean) return

    updateStateFromLine(clean)
    state.logs.push({ at: new Date().toISOString(), level, message: clean })
    if (state.logs.length > 120) state.logs.splice(0, state.logs.length - 120)
}

function updateStateFromLine(line) {
    if (/Registered official plugin|Premium license active|Core features unlocked/i.test(line)) {
        state.metrics.core = 'Active'
        state.detail = 'Core is active'
    } else if (/Core inactive|requires Core|Background agent requires Core/i.test(line)) {
        state.metrics.core = 'Not active'
    }

    const accountMatch = line.match(/Accounts processed:\s*(\d+)/i)
    if (accountMatch) state.metrics.accounts = Number(accountMatch[1])

    const pointsMatch = line.match(/Total points collected:\s*\+?(-?\d+)/i) || line.match(/Points collected:\s*\+?(-?\d+)/i)
    if (pointsMatch) state.metrics.points = Number(pointsMatch[1])

    const couponMatch = line.match(/(\d+)\/(\d+)\s+coupon/i)
    if (couponMatch) state.metrics.coupons = `${couponMatch[1]}/${couponMatch[2]}`

    if (/Starting session|Starting account/i.test(line)) {
        state.status = 'Running'
        state.detail = 'Processing accounts'
    } else if (/Run complete|Completed all accounts/i.test(line)) {
        state.status = 'Complete'
        state.detail = 'Run finished'
    } else if (/error|failed/i.test(line)) {
        state.status = state.status === 'Complete' ? state.status : 'Needs attention'
        state.detail = 'A recoverable issue was detected'
    }
}

function startBot() {
    botProcess = childProcess.spawn(process.execPath, ['./dist/index.js', '--ui-child'], {
        cwd: ROOT,
        env: {
            ...process.env,
            MSRB_UI_CHILD: '1',
            MSRB_TERMINAL_MODE: '0'
        },
        stdio: ['pipe', 'pipe', 'pipe']
    })

    botProcess.stdout.on('data', chunk => {
        for (const line of String(chunk).split(/\r?\n/)) pushLog('info', line)
    })
    botProcess.stderr.on('data', chunk => {
        for (const line of String(chunk).split(/\r?\n/)) pushLog('warn', line)
    })
    botProcess.on('exit', code => {
        state.exitCode = code
        state.finishedAt = new Date().toISOString()
        state.status = code === 0 ? 'Complete' : 'Needs attention'
        state.detail = code === 0 ? 'Run finished' : 'The bot stopped before completing'
    })
}

function sendInput(value) {
    if (!botProcess?.stdin?.writable) return false
    botProcess.stdin.write(`${value || ''}\n`)
    return true
}

function html() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Microsoft Rewards Bot</title>
  <style>
    :root {
      color-scheme: light;
      --ink:#172033; --muted:#667085; --line:#d9e0ec; --panel:#ffffff; --wash:#f3f6fb;
      --accent:#0f6cbd; --good:#13795b; --warn:#b54708;
    }
    *{box-sizing:border-box} body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:var(--wash);color:var(--ink)}
    main{max-width:1120px;margin:0 auto;padding:32px}
    header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:28px}
    h1{font-size:28px;line-height:1.1;margin:0 0 8px} p{margin:0;color:var(--muted)}
    .status{padding:10px 14px;border:1px solid var(--line);border-radius:999px;background:var(--panel);font-weight:700}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
    .metric,.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px}
    .metric span{display:block;color:var(--muted);font-size:13px;margin-bottom:8px}.metric strong{font-size:24px}
    .panel{margin-top:16px}.panel h2{font-size:16px;margin:0 0 12px}
    .timeline{display:grid;gap:8px;max-height:360px;overflow:auto}.log{padding:10px 12px;border-radius:6px;background:#f8fafd;color:#344054;font-size:13px}
    form{display:flex;gap:8px;margin-top:12px} input{flex:1;border:1px solid var(--line);border-radius:6px;padding:11px 12px;font:inherit}
    button{border:0;border-radius:6px;background:var(--accent);color:white;padding:11px 14px;font-weight:700;cursor:pointer}
    @media (max-width:760px){main{padding:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}header{display:block}.status{display:inline-block;margin-top:14px}}
  </style>
</head>
<body>
  <main>
    <header>
      <div><h1>Microsoft Rewards Bot</h1><p>A simple live view for normal use. Use terminal mode for developer diagnostics.</p></div>
      <div class="status" id="status">Starting</div>
    </header>
    <section class="grid">
      <div class="metric"><span>Core</span><strong id="core">Checking</strong></div>
      <div class="metric"><span>Accounts</span><strong id="accounts">-</strong></div>
      <div class="metric"><span>Points</span><strong id="points">-</strong></div>
      <div class="metric"><span>Coupons</span><strong id="coupons">-</strong></div>
    </section>
    <section class="panel"><h2>Current Step</h2><p id="detail">Preparing Microsoft Rewards Bot</p></section>
    <section class="panel">
      <h2>License or Prompt Input</h2>
      <p>If Core asks for a license key, paste it here. Leave it empty and press Continue to skip.</p>
      <form id="input-form"><input id="input" autocomplete="off" placeholder="License key or empty response"><button>Continue</button></form>
    </section>
    <section class="panel"><h2>Recent Activity</h2><div class="timeline" id="logs"></div></section>
  </main>
  <script>
    async function refresh(){
      const data = await fetch('/api/state').then(r=>r.json());
      status.textContent = data.status;
      detail.textContent = data.detail;
      core.textContent = data.metrics.core || '-';
      accounts.textContent = data.metrics.accounts ?? '-';
      points.textContent = data.metrics.points ?? '-';
      coupons.textContent = data.metrics.coupons ?? '-';
      logs.innerHTML = data.logs.slice(-30).reverse().map(l=>'<div class="log">'+escapeHtml(l.message)+'</div>').join('');
    }
    function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
    document.getElementById('input-form').addEventListener('submit', async event => {
      event.preventDefault();
      await fetch('/api/input',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({value:input.value})});
      input.value='';
    });
    setInterval(refresh, 1000); refresh();
  </script>
</body>
</html>`
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(html())
        return
    }
    if (req.method === 'GET' && req.url === '/api/state') {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify(state))
        return
    }
    if (req.method === 'POST' && req.url === '/api/input') {
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', () => {
            const parsed = JSON.parse(body || '{}')
            sendInput(parsed.value || '')
            res.writeHead(204)
            res.end()
        })
        return
    }
    res.writeHead(404)
    res.end('Not found')
})

server.listen(PORT, '127.0.0.1', () => {
    const address = server.address()
    const url = `http://127.0.0.1:${address.port}`
    console.log(`[UI] Microsoft Rewards Bot interface: ${url}`)
    openBrowser(url)
    startBot()
})

function openBrowser(url) {
    const command =
        process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open'
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
    childProcess.spawn(command, args, { detached: true, stdio: 'ignore' }).unref()
}

process.on('SIGINT', () => {
    botProcess?.kill('SIGTERM')
    server.close(() => process.exit(0))
})
