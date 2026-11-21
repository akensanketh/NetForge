import sqlite3
import uuid
import json
import secrets
import subprocess

client_uuid = str(uuid.uuid4())
sub_id = secrets.token_hex(8)

settings = {
    "clients": [
        {
            "id": client_uuid,
            "flow": "",
            "email": "zoom-user",
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True,
            "tgId": "",
            "subId": sub_id,
            "reset": 0
        }
    ],
    "decryption": "none",
    "fallbacks": []
}

stream_settings = {
    "network": "ws",
    "security": "none",
    "wsSettings": {
        "acceptProxyProtocol": False,
        "path": "/zoom",
        "headers": {
            "Host": "zoom.us"
        }
    }
}

sniffing = {
    "enabled": True,
    "destOverride": ["http", "tls", "quic", "fakedns"]
}

conn = sqlite3.connect('/etc/x-ui/x-ui.db')
c = conn.cursor()

# Remove any old zoom inbound on port 80 if exists
c.execute("DELETE FROM inbounds WHERE port = 80 OR remark LIKE '%Zoom%'")

c.execute('''
INSERT INTO inbounds (
    user_id, up, down, total, remark, enable, expiry_time,
    listen, port, protocol, settings, stream_settings, tag, sniffing
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    1, 0, 0, 0, 'Zoom Package', 1, 0,
    '', 80, 'vless', json.dumps(settings), json.dumps(stream_settings),
    'inbound-80', json.dumps(sniffing)
))

conn.commit()
conn.close()

vless_link = f"vless://{client_uuid}@132.226.190.34:80?path=%2Fzoom&security=none&encryption=none&host=zoom.us&type=ws#Zoom%20Package"

print("==================================================")
print("INBOUND_CREATED_SUCCESSFULLY")
print("PORT: 80")
print("PROTOCOL: VLESS (WebSocket)")
print("HOST / SNI: zoom.us")
print("PATH: /zoom")
print("UUID:", client_uuid)
print("VLESS_LINK:")
print(vless_link)
print("==================================================")

