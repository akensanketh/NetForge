const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ProxyHelper {
  constructor() {
    this.sysProxyEnabled = false;
  }

  // Set Windows System Proxy via reg.exe (WinINet internet settings)
  setSystemProxy(host = '127.0.0.1', port = 10809) {
    return new Promise((resolve, reject) => {
      const server = `${host}:${port}`;
      const commands = [
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f`,
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "${server}" /f`,
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride /t REG_SZ /d "<local>;localhost;127.*" /f`
      ];

      this._runBatch(commands, (err) => {
        if (err) return reject(err);
        this.sysProxyEnabled = true;
        this.notifySettingsChange();
        resolve(true);
      });
    });
  }

  // Clear Windows System Proxy
  clearSystemProxy() {
    return new Promise((resolve, reject) => {
      const commands = [
        `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f`
      ];

      this._runBatch(commands, (err) => {
        if (err) return reject(err);
        this.sysProxyEnabled = false;
        this.notifySettingsChange();
        resolve(true);
      });
    });
  }

  // Tell Windows (WinINet) to refresh its proxy cache immediately
  notifySettingsChange() {
    try {
      // Use powershell one-liner to call InternetSetOption
      const ps = `powershell -NoProfile -Command "[System.Runtime.InteropServices.Marshal]::GetLastWin32Error(); Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class WinINet { [DllImport(\\\"wininet.dll\\\")] public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength); }'; [WinINet]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0); [WinINet]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0);"`;
      execFile('powershell', ['-NoProfile', '-Command', ps], () => {});
    } catch (e) {}
  }

  _runBatch(cmds, callback) {
    if (cmds.length === 0) return callback(null);
    const cmd = cmds.shift();
    execFile('cmd.exe', ['/c', cmd], (err) => {
      if (err) return callback(err);
      this._runBatch(cmds, callback);
    });
  }
}

module.exports = new ProxyHelper();

