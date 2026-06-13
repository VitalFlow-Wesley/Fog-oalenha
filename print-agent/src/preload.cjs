const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('printAgent', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  testCashier: () => ipcRenderer.invoke('agent:test-cashier'),
  testKitchen: () => ipcRenderer.invoke('agent:test-kitchen'),
  pollNow: () => ipcRenderer.invoke('agent:poll-now'),
  onStatus: callback => ipcRenderer.on('agent:status', (_event, payload) => callback(payload)),
  onJobsProcessed: callback => ipcRenderer.on('agent:jobs-processed', (_event, count) => callback(count)),
})
