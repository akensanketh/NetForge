const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class XrayManager {
  constructor() {
    this.process = null;
    this.binPath = path.join(__dirname, '..', 'bin', 'xray.exe');
    this.runtimeConfigPath = path.join(__dirname, '..', 'bin', 'runtime_config.json');
    this.socksPort = 10808;
    this.httpPort = 10809;
  }

  // Unified parser supporting both vless:// and vmess:// URIs
  parseLink(link) {
    const trimmed = link.trim();
    if (trimmed.startsWith('vless://')) {
      return this.parseVlessLink(trimmed);
    } else if (trimmed.startsWith('vmess://')) {
      return this.parseVmessLink(trimmed);
    } else {
      throw new Error('Unsupported protocol link. Must start with vless:// or vmess://');
    }
  }

  // Parses a vless:// URI string into structured options
  parseVlessLink(link) {
    try {
      const parsed = new URL(link);
      const uuid = parsed.username;
      const host = parsed.hostname;
      const port = parseInt(parsed.port, 10);
      const params = parsed.searchParams;

      return {
        protocol: 'vless',
        id: uuid,
        server: host,
        port: port,
        flow: params.get('flow') || 'xtls-rprx-vision',
        security: params.get('security') || 'reality',
        sni: params.get('sni') || '',
        publicKey: params.get('pbk') || '',
        shortId: params.get('sid') || '',
        fingerprint: params.get('fp') || 'chrome',
        network: params.get('type') || 'tcp',
        name: decodeURIComponent(parsed.hash.replace('#', '') || `${host}:${port}`)
      };
    } catch (e) {
      throw new Error(`Invalid VLESS link format: ${e.message}`);
    }
  }

  // Parses a vmess:// standard base64 JSON URI into structured options
  parseVmessLink(link) {
    try {
      const b64 = link.replace(/^vmess:\/\//i, '').trim();
      const rawJson = Buffer.from(b64, 'base64').toString('utf8');
      const data = JSON.parse(rawJson);

      return {
        protocol: 'vmess',
        id: data.id,
        server: data.add,
        port: parseInt(data.port, 10),
        alterId: parseInt(data.aid || 0, 10),
        network: data.net || 'tcp',
        security: data.tls || 'none',
        sni: data.sni || data.host || '',
        path: data.path || '',
        name: data.ps || `${data.add}:${data.port}`
      };
    } catch (e) {
      throw new Error(`Invalid VMess link format: ${e.message}`);
    }
  }

  // Generates client-side Xray config JSON
  generateConfig(node) {
    const isVmess = (node.protocol === 'vmess');

    const outboundSettings = isVmess ? {
      vnext: [
        {
          address: node.server,
          port: parseInt(node.port, 10),
          users: [
            {
              id: node.id,
              alterId: parseInt(node.alterId || 0, 10),
              security: "auto"
            }
          ]
        }
      ]
    } : {
      vnext: [
        {
          address: node.server,
          port: parseInt(node.port, 10),
          users: [
            {
              id: node.id,
              flow: node.flow || "xtls-rprx-vision",
              encryption: "none"
            }
          ]
        }
      ]
    };

    let streamSettings = {
      network: node.network || "tcp"
    };

    if (node.security === "reality") {
      streamSettings.security = "reality";
      streamSettings.realitySettings = {
        serverName: node.sni,
        fingerprint: node.fingerprint || "chrome",
        show: false,
        publicKey: node.publicKey,
        shortId: node.shortId || "",
        spiderX: "/"
      };
    } else if (node.security === "tls") {
      streamSettings.security = "tls";
      streamSettings.tlsSettings = {
        serverName: node.sni || node.server,
        allowInsecure: false
      };
    }

    if (node.network === "ws" && node.path) {
      streamSettings.wsSettings = {
        path: node.path,
        headers: {
          Host: node.sni || node.server
        }
      };
    }

    return {
      log: {
        loglevel: "warning"
      },
      inbounds: [
        {
          tag: "socks-in",
          port: this.socksPort,
          listen: "127.0.0.1",
          protocol: "socks",
          settings: {
            udp: true,
            auth: "noauth"
          },
          sniffing: {
            enabled: true,
            destOverride: ["http", "tls"]
          }
        },
        {
          tag: "http-in",
          port: this.httpPort,
          listen: "127.0.0.1",
          protocol: "http",
          settings: {
            allowTransparent: false
          }
        }
      ],
      outbounds: [
        {
          tag: "proxy",
          protocol: isVmess ? "vmess" : "vless",
          settings: outboundSettings,
          streamSettings: streamSettings
        },
        {
          tag: "direct",
          protocol: "freedom"
        },
        {
          tag: "block",
          protocol: "blackhole"
        }
      ]
    };
  }

  start(node, onLog) {
    return new Promise((resolve, reject) => {
      if (this.process) {
        this.stop();
      }

      if (!fs.existsSync(this.binPath)) {
        return reject(new Error(`Core engine not found at ${this.binPath}`));
      }

      const config = this.generateConfig(node);
      fs.writeFileSync(this.runtimeConfigPath, JSON.stringify(config, null, 2));

      onLog && onLog(`[NETFORGE] Generated client config for ${node.name} (${node.server}:${node.port})`);
      onLog && onLog(`[NETFORGE] Starting core engine: ${this.binPath}`);

      this.process = spawn(this.binPath, ['run', '-config', this.runtimeConfigPath]);

      this.process.stdout.on('data', (data) => {
        const text = data.toString().trim();
        onLog && onLog(`[CORE] ${text}`);
      });

      this.process.stderr.on('data', (data) => {
        const text = data.toString().trim();
        onLog && onLog(`[CORE ERR] ${text}`);
      });

      this.process.on('error', (err) => {
        onLog && onLog(`[NETFORGE ERR] Process error: ${err.message}`);
        reject(err);
      });

      this.process.on('exit', (code) => {
        onLog && onLog(`[CORE] Engine stopped with exit code: ${code}`);
        this.process = null;
      });

      // Allow 600ms for startup
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          resolve(true);
        } else {
          reject(new Error("Core process exited prematurely during launch."));
        }
      }, 600);
    });
  }

  stop() {
    if (this.process) {
      try {
        this.process.kill();
      } catch (e) {}
      this.process = null;
    }
  }

  isRunning() {
    return this.process !== null && !this.process.killed;
  }
}

module.exports = new XrayManager();

