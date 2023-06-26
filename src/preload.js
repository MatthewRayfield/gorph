const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    get: (selector, domain, port, file) => ipcRenderer.invoke('get', selector, domain, port, file)
});
