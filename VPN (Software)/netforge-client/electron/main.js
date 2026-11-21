const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const xrayManager = require('./xray-manager');
const proxyHelper = require('./proxy-helper');

let mainWindow = null;
const profilesFile = path.join(app.getPath('userData'), 'netforge_profiles.json');

// Default profiles matching verified live VPS nodes
const defaultProfiles = [
  {
    id: "1fc82f0b-da3f-430f-8dac-9203a3e45b6b",
    name: "Zoom Reality (Port 443)",
    server: "132.226.190.34",
    port: 443,
    protocol: "vless",
    flow: "xtls-rprx-vision",
    security: "reality",
    sni: "www.zoom.com",
    publicKey: "61VKkNjKVWS9KRRA13EwzrsKVFii57rAYOAstcVMdx0",
    shortId: "dbb4ac96",
    fingerprint: "chrome"
  },
  {
    id: "984e9513-41ca-4e1f-8d75-eda06d99a86d",
    name: "YouTube Reality (Port 2083)",
    server: "132.226.190.34",
    port: 2083,
    protocol: "vless",
    flow: "xtls-rprx-vision",
    security: "reality",
    sni: "www.youtube.com",
    publicKey: "RBhgkiBqTaS0MlQOYkA9GP-lb_Fhlt3JvyxDOU-Jf08",
    shortId: "1d2c1482",
    fingerprint: "chrome"
  }
];

function loadProfiles() {
  try {
    if (fs.existsSync(profilesFile)) {
      const data = JSON.parse(fs.readFileSync(profilesFile, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}
  saveProfiles(defaultProfiles);
  return defaultProfiles;
}

function saveProfiles(profiles) {
  try {
    fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 2), 'utf8');
  } catch (e) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 840,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, '..', 'public', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Clean up proxy and core when closing
app.on('will-quit', async () => {
  try {
    await proxyHelper.clearSystemProxy();
    xrayManager.stop();
  } catch (e) {}
});

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());

// Profiles API
ipcMain.handle('profiles:get', () => loadProfiles());

ipcMain.handle('profiles:save', (_, profiles) => {
  saveProfiles(profiles);
  return true;
});

ipcMain.handle('profiles:importLink', (_, linkStr) => {
  try {
    const node = xrayManager.parseLink(linkStr);
    const existing = loadProfiles();
    existing.push(node);
    saveProfiles(existing);
    return { success: true, node };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Connection lifecycle
ipcMain.handle('connection:start', async (_, { node, enableSystemProxy }) => {
  try {
    await xrayManager.start(node, (msg) => {
      mainWindow?.webContents.send('connection:log', msg);
    });

    if (enableSystemProxy) {
      await proxyHelper.setSystemProxy('127.0.0.1', xrayManager.httpPort);
      mainWindow?.webContents.send('connection:log', `[NETFORGE] Windows System Proxy routed to 127.0.0.1:${xrayManager.httpPort}`);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('connection:stop', async () => {
  try {
    await proxyHelper.clearSystemProxy();
    xrayManager.stop();
    mainWindow?.webContents.send('connection:log', `[NETFORGE] System Proxy disabled and Core disconnected.`);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('connection:status', () => {
  return {
    connected: xrayManager.isRunning(),
    systemProxy: proxyHelper.sysProxyEnabled,
    socksPort: xrayManager.socksPort,
    httpPort: xrayManager.httpPort
  };
});

// Ping test through proxy
ipcMain.handle('connection:testPing', async () => {
  if (!xrayManager.isRunning()) {
    return { success: false, latency: -1, error: "Core is not running" };
  }

  const start = Date.now();
  return new Promise((resolve) => {
    const options = {
      host: '127.0.0.1',
      port: xrayManager.httpPort,
      path: 'http://cp.cloudflare.com/generate_204',
      method: 'GET',
      timeout: 4000
    };

    const req = http.request(options, (res) => {
      const latency = Date.now() - start;
      resolve({ success: true, latency });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, latency: -1, error: "Timed out" });
    });

    req.on('error', (err) => {
      resolve({ success: false, latency: -1, error: err.message });
    });

    req.end();
  });
});

