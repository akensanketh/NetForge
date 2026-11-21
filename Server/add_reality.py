import sqlite3
import uuid
import json
import secrets

client_uuid = "53db2fbf-642f-41d9-a94f-7c77992d36b2" # Same UUID user has
priv_key = "0B_XLevzOj88BKh7ikez7x93-_86C5vN191Jwba8bV0"
pub_key = "61VKkNjKVWS9KRRA13EwzrsKVFii57rAYOAstcVMdx0"
short_id = secrets.token_hex(4)

settings = {
    "clients": [
        {
            "id": client_uuid,
            "flow": "xtls-rprx-vision",
            "email": "Aken-Reality",
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True,
            "tgId": 0,
            "subId": secrets.token_hex(8),
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
        "dest": "zoom.us:443",
        "serverNames": [
            "zoom.us",
            "www.zoom.us",
            "us04web.zoom.us"
        ],
        "privateKey": priv_key,
        "minClientVer": "",
        "maxClientVer": "",
        "maxTimeDiff": 0,
        "shortIds": [
            short_id
        ]
    }
}

sniffing = {
    "enabled": True,
    "destOverride": ["http", "tls", "quic", "fakedns"]
}

conn = sqlite3.connect('/etc/x-ui/x-ui.db')
c = conn.cursor()

# Check if port 443 inbound exists
c.execute("DELETE FROM inbounds WHERE port = 443")

c.execute('''
INSERT INTO inbounds (
    user_id, up, down, total, remark, enable, expiry_time,
    listen, port, protocol, settings, stream_settings, tag, sniffing
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    1, 0, 0, 0, 'Zoom Reality (Port 443)', 1, 0,
    '', 443, 'vless', json.dumps(settings), json.dumps(stream_settings),
    'inbound-443', json.dumps(sniffing)
))

conn.commit()
conn.close()

reality_link = f"vless://{client_uuid}@132.226.190.34:443?security=reality&encryption=none&pbk={pub_key}&headerType=none&fp=chrome&spx=%2F&type=tcp&flow=xtls-rprx-vision&sni=zoom.us&sid={short_id}#Zoom%20Reality%20443"

print("==================================================")
print("REALITY_443_CREATED_SUCCESSFULLY")
print("LINK:")
print(reality_link)
print("==================================================")

