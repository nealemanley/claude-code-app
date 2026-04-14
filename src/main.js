const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const os = require('os')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0d1a',
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

ipcMain.handle('launch-project', async (event, projectPath) => {
  const pty = require('node-pty')
  const shell = process.env.SHELL || '/bin/zsh'
  return { shell, projectPath }
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
