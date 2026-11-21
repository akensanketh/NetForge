import sqlite3
import json
import subprocess
import os

client_uuid_1 = "1fc82f0b-da3f-430f-8dac-9203a3e45b6b"
client_uuid_2 = "53db2fbf-642f-41d9-a94f-7c77992d36b2"
priv_key = "0B_XLevzOj88BKh7ikez7x93-_86C5vN191Jwba8bV0"
pub_key = "61VKkNjKVWS9KRRA13EwzrsKVFii57rAYOAstcVMdx0"
short_id = "dbb4ac96"

settings = {
    "clients": [
        {
            "id": client_uuid_1,
            "flow": "",
            "email": "aken-1",
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True,
            "tgId": 0,
            "subId": "dbb4ac96",
            "reset": 0
        },
        {
            "id": client_uuid_2,
            "flow": "",
            "email": "aken-2",
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True,
            "tgId": 0,
            "subId": "dbb4ac96",
            "reset": 0
        }
    ],
    "decryption": "none",
    "fallbacks": []
}

stream_settings = {
    "network": "tcp",
    "security": "reality",
    "realitySettings": {
        "show": False,
        "xver": 0,
        "dest": "www.zoom.com:443",
        "serverNames": [
            "www.zoom.com",
            "zoom.com",
            "zoom.us",
            "www.zoom.us"
        ],
        "privateKey": priv_key,
        "minClientVer": "",
        "maxClientVer": "",
        "maxTimeDiff": 0,
        "shortIds": [
            short_id,
            ""
        ]
    },
    "tcpSettings": {
        "acceptProxyProtocol": False,
        "header": {
            "type": "none"
        }
    }
}

sniffing = {
    "enabled": True,
    "destOverride": ["http", "tls", "quic", "fakedns"]
}

# Update SQLite database
conn = sqlite3.connect('/etc/x-ui/x-ui.db')
c = conn.cursor()
c.execute("DELETE FROM inbounds WHERE port = 443")
c.execute('''
INSERT INTO inbounds (
    user_id, up, down, total, remark, enable, expiry_time,
    listen, port, protocol, settings, stream_settings, tag, sniffing
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    1, 0, 0, 0, 'VLESS-TCP-Reality-Zoom', 1, 0,
    '', 443, 'vless', json.dumps(settings), json.dumps(stream_settings),
    'inbound-443', json.dumps(sniffing)
))
conn.commit()
conn.close()

# Also sync directly into Xray's active config.json
config_path = '/usr/local/x-ui/bin/config.json'
if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        cfg = json.load(f)

    # Filter out existing port 443 inbound if present
    cfg['inbounds'] = [ib for ib in cfg.get('inbounds', []) if ib.get('port') != 443]

    new_inbound = {
        "listen": "0.0.0.0",
        "port": 443,
        "protocol": "vless",
        "settings": settings,
        "streamSettings": stream_settings,
        "sniffing": sniffing,
        "tag": "inbound-443"
    }

    cfg['inbounds'].append(new_inbound)

    with open(config_path, 'w') as f:
        json.dump(cfg, f, indent=2)

# Restart service
subprocess.run(["systemctl", "restart", "x-ui"], check=True)

# Generate VLESS links for both UUIDs
link1 = f"vless://{client_uuid_1}@132.226.190.34:443/?encryption=none&security=reality&fp=chrome&sni=www.zoom.com&pbk={pub_key}&spx=%2f&sid={short_id}&type=tcp&headerType=none#Zoom-Reality-1"
link2 = f"vless://{client_uuid_2}@132.226.190.34:443/?encryption=none&security=reality&fp=chrome&sni=www.zoom.com&pbk={pub_key}&spx=%2f&sid={short_id}&type=tcp&headerType=none#Zoom-Reality-2"

# Also generate with SNI zoom.us
link3 = f"vless://{client_uuid_1}@132.226.190.34:443/?encryption=none&security=reality&fp=chrome&sni=zoom.us&pbk={pub_key}&spx=%2f&sid={short_id}&type=tcp&headerType=none#Zoom-Reality-US"

print("==================================================")
print("INBOUND_SUCCESSFULLY_DEPLOYED")
print("LINK_1:")
print(link1)
print("LINK_2:")
print(link2)
print("LINK_3 (SNI zoom.us):")
print(link3)
print("==================================================")

