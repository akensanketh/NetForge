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

  // Parses a vless:// URI string into structured options
  parseVlessLink(link) {
    try {
      const parsed = new URL(link);
      const uuid = parsed.username;
      const host = parsed.hostname;
      const port = parseInt(parsed.port, 10);
      const params = parsed.searchParams;

      return {
        id: uuid,
        server: host,
        port: port,
        flow: params.get('flow') || 'xtls-rprx-vision',
        security: params.get('security') || 'reality',
        sni: params.get('sni') || '',
        publicKey: params.get('pbk') || '',
        shortId: params.get('sid') || '',
        fingerprint: params.get('fp') || 'chrome',
        name: decodeURIComponent(parsed.hash.replace('#', '') || `${host}:${port}`)
      };
    } catch (e) {
      throw new Error(`Invalid VLESS link format: ${e.message}`);
    }
  }

  // Generates client-side Xray config JSON
  generateConfig(node) {
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
          protocol: "vless",
          settings: {
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
          },
          streamSettings: {
            network: "tcp",
            security: node.security || "reality",
            realitySettings: {
              serverName: node.sni,
              fingerprint: node.fingerprint || "chrome",
              show: false,
              publicKey: node.publicKey,
              shortId: node.shortId || "",
              spiderX: "/"
            }
          }
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

