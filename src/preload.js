const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  scanSkills:  ()           => ipcRenderer.invoke('scan-skills'),
  spawnPty:    (opts)       => ipcRenderer.invoke('spawn-pty', opts),
  writePty:    (id, data)   => ipcRenderer.send('pty-write', { id, data }),
  resizePty:   (id, c, r)   => ipcRenderer.send('pty-resize', { id, cols: c, rows: r }),
  killPty:     (id)         => ipcRenderer.send('pty-kill', { id }),
  onPtyData:   (cb)         => ipcRenderer.on('pty-data', (_, p) => cb(p)),
  onPtyExit:   (cb)         => ipcRenderer.on('pty-exit', (_, p) => cb(p)),
})
