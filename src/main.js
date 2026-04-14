const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')

let mainWindow

// ── skill scanner ──────────────────────────────────────────────────────────
// Reads the description line from a SKILL.md frontmatter block
function readSkillDescription(skillMdPath) {
  try {
    const content = fs.readFileSync(skillMdPath, 'utf8')
    const match = content.match(/^description:\s*["']?(.+?)["']?\s*$/m)
    if (match) {
      // Trim to a sensible length for the UI
      return match[1].replace(/^["']|["']$/g, '').slice(0, 80)
    }
    // Fall back to first non-frontmatter line of content
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('---') && !l.startsWith('#'))
    return lines[0]?.slice(0, 80) || ''
  } catch {
    return ''
  }
}

function scanSkills() {
  const home = os.homedir()
  const result = {}

  // 1. Global skills — ~/.claude/skills/
  const globalSkillsDir = path.join(home, '.claude', 'skills')
  if (fs.existsSync(globalSkillsDir)) {
    const globalSkills = []
    try {
      const entries = fs.readdirSync(globalSkillsDir, { withFileTypes: true })
      entries.forEach(entry => {
        if (!entry.isDirectory()) return
        const skillMd = path.join(globalSkillsDir, entry.name, 'SKILL.md')
        if (fs.existsSync(skillMd)) {
          globalSkills.push({
            cmd: '/' + entry.name,
            desc: readSkillDescription(skillMd)
          })
        }
      })
    } catch {}
    if (globalSkills.length) result['Global skills (~/.claude/skills)'] = globalSkills
  }

  // 2. Project skills — scan known project paths for .claude/skills/
  const projectPaths = [
    { name: 'StemForge',          path: path.join(home, 'Downloads', 'stemforge') },
    { name: 'StemForge (alt)',     path: path.join(home, 'Downloads', 'Stemforge') },
    { name: 'Groove Fusion',       path: path.join(home, 'Downloads', 'Groove Fusion website') },
    { name: 'Not Just A Wedding',  path: path.join(home, 'Downloads', 'not-just-a-wedding') },
    { name: 'Not Just A Wedding',  path: path.join(home, 'Projects', 'not-just-a-wedding') },
    { name: 'Not Just A Wedding',  path: path.join(home, 'Desktop', 'not-just-a-wedding app', 'app') },
  ]

  const seen = new Set()
  projectPaths.forEach(({ name, path: projPath }) => {
    const skillsDir = path.join(projPath, '.claude', 'skills')
    if (!fs.existsSync(skillsDir)) return
    if (seen.has(skillsDir)) return
    seen.add(skillsDir)

    const projSkills = []
    try {
      const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
      entries.forEach(entry => {
        if (!entry.isDirectory()) return
        const skillMd = path.join(skillsDir, entry.name, 'SKILL.md')
        if (fs.existsSync(skillMd)) {
          projSkills.push({
            cmd: '/' + entry.name,
            desc: readSkillDescription(skillMd)
          })
        }
      })
    } catch {}
    if (projSkills.length) result[name] = projSkills
  })

  // 3. Fallback hardcoded skills if nothing found on disk
  if (Object.keys(result).length === 0) {
    result['StemForge'] = [
      { cmd: '/start-server', desc: 'check venv, verify FFmpeg codecs, launch the app' },
      { cmd: '/debug-visra',  desc: 'debug visualiser — live preview or video export' },
      { cmd: '/add-module',   desc: 'scaffold a new audio processing module' },
    ]
    result['Groove Fusion'] = [
      { cmd: '/deploy-netlify', desc: 'pre-flight checks before dragging to Netlify' },
      { cmd: '/new-release',    desc: 'add a track, EP or album to the catalogue' },
      { cmd: '/seo-check',      desc: 'full SEO audit of any page' },
    ]
    result['Not Just A Wedding'] = [
      { cmd: '/deploy-netlify', desc: 'pre-flight checks + full Netlify deploy' },
      { cmd: '/new-page',       desc: 'scaffold a new planner page' },
      { cmd: '/stripe-test',    desc: 'run Stripe CLI webhook listener locally' },
      { cmd: '/supabase-check', desc: 'verify DB connection, schema and RLS policies' },
    ]
    result['Global skills'] = [
      { cmd: '/brainstorming',       desc: 'validate ideas before building' },
      { cmd: '/commit',              desc: 'conventional commit with proper format' },
      { cmd: '/git-pushing',         desc: 'stage, commit and push in one go' },
      { cmd: '/deep-research',       desc: 'autonomous research with synthesised report' },
      { cmd: '/seo',                 desc: 'full SEO umbrella audit' },
      { cmd: '/stripe-integration',  desc: 'Stripe best practices — webhooks, PCI' },
      { cmd: '/react-best-practices',desc: 'React performance and patterns' },
      { cmd: '/python-pro',          desc: 'modern Python best practices' },
      { cmd: '/readme',              desc: 'generate thorough project README' },
      { cmd: '/compact',             desc: 'compress context — do at ~50% usage' },
    ]
  }

  return result
}

// ── window ─────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5f0e8',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
  })

  mainWindow.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── IPC ────────────────────────────────────────────────────────────────────
ipcMain.handle('scan-skills', async () => {
  return scanSkills()
})

ipcMain.handle('spawn-pty', async (event, { cols, rows, projectPath }) => {
  const pty = require('node-pty')
  const shell = process.env.SHELL || '/bin/zsh'

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: projectPath || os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color' }
  })

  const id = Date.now().toString()

  ptyProcess.onData((data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty-data', { id, data })
    }
  })

  ptyProcess.onExit(() => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pty-exit', { id })
    }
  })

  global.ptyProcesses = global.ptyProcesses || {}
  global.ptyProcesses[id] = ptyProcess

  return id
})

ipcMain.on('pty-write', (event, { id, data }) => {
  const proc = global.ptyProcesses?.[id]
  if (proc) proc.write(data)
})

ipcMain.on('pty-resize', (event, { id, cols, rows }) => {
  const proc = global.ptyProcesses?.[id]
  if (proc) proc.resize(cols, rows)
})

ipcMain.on('pty-kill', (event, { id }) => {
  const proc = global.ptyProcesses?.[id]
  if (proc) { proc.kill(); delete global.ptyProcesses[id] }
})
