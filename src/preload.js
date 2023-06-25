const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    get: (selector, domain, port) => ipcRenderer.invoke('get', selector, domain, port)
});
