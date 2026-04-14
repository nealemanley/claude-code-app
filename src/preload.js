const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  scanSkills:     ()              => ipcRenderer.invoke('scan-skills'),
  launchIterm:    (path)          => ipcRenderer.send('launch-iterm', { path }),
  launchItermCmd: (cmd)           => ipcRenderer.send('launch-iterm', { cmd }),
})
