const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  spawnPty: (opts) => ipcRenderer.invoke('spawn-pty', opts),
  writePty: (id, data) => ipcRenderer.send('pty-write', { id, data }),
  resizePty: (id, cols, rows) => ipcRenderer.send('pty-resize', { id, cols, rows }),
  killPty: (id) => ipcRenderer.send('pty-kill', { id }),
  onPtyData: (cb) => ipcRenderer.on('pty-data', (_, payload) => cb(payload)),
  onPtyExit: (cb) => ipcRenderer.on('pty-exit', (_, payload) => cb(payload)),
})
