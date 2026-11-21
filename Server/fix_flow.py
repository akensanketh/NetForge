import sqlite3
import json
import subprocess

UUID = "1fc82f0b-da3f-430f-8dac-9203a3e45b6b"
REALITY_PRIVKEY = "0B_XLevzOj88BKh7ikez7x93-_86C5vN191Jwba8bV0"
REALITY_PUBKEY = "61VKkNjKVWS9KRRA13EwzrsKVFii57rAYOAstcVMdx0"
SHORT_ID = "dbb4ac96"

settings_reality = {
    "clients": [{
        "id": UUID,
        "flow": "xtls-rprx-vision",
        "email": "zoom-reality",
        "limitIp": 0,
        "totalGB": 0,
        "expiryTime": 0,
        "enable": True,
        "tgId": 0,
        "subId": SHORT_ID,
        "reset": 0
    }],
    "decryption": "none",
    "fallbacks": []
}

stream_reality = {
    "network": "tcp",
    "security": "reality",
    "realitySettings": {
        "show": False,
        "xver": 0,
        "dest": "www.zoom.com:443",
        "serverNames": ["www.zoom.com", "zoom.com", "zoom.us", "www.zoom.us"],
        "privateKey": REALITY_PRIVKEY,
        "minClientVer": "",
        "maxClientVer": "",
        "maxTimeDiff": 0,
        "shortIds": [SHORT_ID, ""]
    },
    "tcpSettings": {
        "acceptProxyProtocol": False,
        "header": {"type": "none"}
    }
}

sniffing = {"enabled": True, "destOverride": ["http", "tls", "quic", "fakedns"]}

conn = sqlite3.connect("/etc/x-ui/x-ui.db")
c = conn.cursor()
c.execute("DELETE FROM inbounds WHERE port = 443")

c.execute("""
INSERT INTO inbounds (user_id, up, down, total, remark, enable, expiry_time, listen, port, protocol, settings, stream_settings, tag, sniffing)
VALUES (1, 0, 0, 0, 'Zoom-VLESS-Reality-443', 1, 0, '', 443, 'vless', ?, ?, 'inbound-443', ?)
""", (json.dumps(settings_reality), json.dumps(stream_reality), json.dumps(sniffing)))

conn.commit()
conn.close()

# Also sync config.json for Xray
config_path = '/usr/local/x-ui/bin/config.json'
with open(config_path, 'r') as f:
    cfg = json.load(f)

cfg['inbounds'] = [ib for ib in cfg.get('inbounds', []) if ib.get('port') != 443]
cfg['inbounds'].append({
    "listen": "0.0.0.0",
    "port": 443,
    "protocol": "vless",
    "settings": settings_reality,
    "streamSettings": stream_reality,
    "sniffing": sniffing,
    "tag": "inbound-443"
})

with open(config_path, 'w') as f:
    json.dump(cfg, f, indent=2)

subprocess.run("systemctl restart x-ui", shell=True)

# Generate valid Xray Reality URL with flow=xtls-rprx-vision
valid_link = f"vless://{UUID}@132.226.190.34:443?type=tcp&security=reality&pbk={REALITY_PUBKEY}&fp=chrome&sni=www.zoom.com&sid={SHORT_ID}&spx=%2F&flow=xtls-rprx-vision#Zoom-Reality-Fix"

print("\n==================================================")
print("REALITY_FIX_APPLIED")
print(valid_link)
print("==================================================")

