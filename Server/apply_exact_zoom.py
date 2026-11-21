import sqlite3
import json

client_uuid = "1fc82f0b-da3f-430f-8dac-9203a3e45b6b"
priv_key = "0B_XLevzOj88BKh7ikez7x93-_86C5vN191Jwba8bV0"
pub_key = "61VKkNjKVWS9KRRA13EwzrsKVFii57rAYOAstcVMdx0"
short_id = "dbb4ac96"

settings = {
    "clients": [
        {
            "id": client_uuid,
            "flow": "",
            "email": "Aken-Zoom",
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
            "www.zoom.com"
        ],
        "privateKey": priv_key,
        "minClientVer": "",
        "maxClientVer": "",
        "maxTimeDiff": 0,
        "shortIds": [
            short_id
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

conn = sqlite3.connect('/etc/x-ui/x-ui.db')
c = conn.cursor()

c.execute("DELETE FROM inbounds WHERE port = 443")

c.execute('''
INSERT INTO inbounds (
    user_id, up, down, total, remark, enable, expiry_time,
    listen, port, protocol, settings, stream_settings, tag, sniffing
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    1, 0, 0, 0, 'Zoom Reality www.zoom.com', 1, 0,
    '', 443, 'vless', json.dumps(settings), json.dumps(stream_settings),
    'inbound-443', json.dumps(sniffing)
))

conn.commit()
conn.close()

exact_link = f"vless://{client_uuid}@132.226.190.34:443/?encryption=none&security=reality&fp=chrome&sni=www.zoom.com&pbk={pub_key}&spx=%2f&sid={short_id}&type=tcp&headerType=none#Private-v2ray-aken"

print("==================================================")
print("EXACT_SETTINGS_APPLIED_SUCCESSFULLY")
print(exact_link)
print("==================================================")

