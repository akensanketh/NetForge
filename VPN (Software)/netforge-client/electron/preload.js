const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Profile operations
  getProfiles: () => ipcRenderer.invoke('profiles:get'),
  saveProfiles: (profiles) => ipcRenderer.invoke('profiles:save', profiles),
  importLink: (link) => ipcRenderer.invoke('profiles:importLink', link),

  // Connection management
  startConnection: (opts) => ipcRenderer.invoke('connection:start', opts),
  stopConnection: () => ipcRenderer.invoke('connection:stop'),
  getStatus: () => ipcRenderer.invoke('connection:status'),
  testPing: () => ipcRenderer.invoke('connection:testPing'),

  // Event streams
  onLog: (callback) => {
    const handler = (_, msg) => callback(msg);
    ipcRenderer.on('connection:log', handler);
    return () => ipcRenderer.removeListener('connection:log', handler);
  }
});

