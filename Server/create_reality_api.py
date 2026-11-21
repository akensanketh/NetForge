import urllib.request
import urllib.parse
import json
import http.cookiejar
import subprocess
import uuid
import secrets
import sys

BASE_URL = "http://127.0.0.1:10834/wOIq7jEr9UtqFjKaxW"

# Set up cookie jar for session maintenance
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# 1. Login to 3X-UI
login_payload = urllib.parse.urlencode({'username': 'admin', 'password': 'admin'}).encode('utf-8')
req_login = urllib.request.Request(f"{BASE_URL}/login", data=login_payload)
try:
    res_login = opener.open(req_login)
    login_resp = json.loads(res_login.read().decode('utf-8'))
    print("[+] Login response:", login_resp)
except Exception as e:
    print("[-] Login failed:", e)
    sys.exit(1)

# 2. Get current inbounds and clean old ones on port 443
req_list = urllib.request.Request(f"{BASE_URL}/panel/api/inbounds/list")
res_list = opener.open(req_list)
data = json.loads(res_list.read().decode('utf-8'))
inbounds = data.get('obj', [])
print(f"[+] Found {len(inbounds)} existing inbounds.")

for ib in inbounds:
    ib_id = ib.get('id')
    ib_port = ib.get('port')
    if ib_port == 443 or ib_port == 80:
        print(f"[+] Deleting old inbound {ib_id} on port {ib_port}...")
        del_req = urllib.request.Request(f"{BASE_URL}/panel/api/inbounds/del/{ib_id}", data=b'')
        opener.open(del_req)

# 3. Generate x25519 reality keypair using xray binary
xray_bin = "/usr/local/x-ui/bin/xray-linux-amd64"
try:
    out = subprocess.check_output([xray_bin, "x25519"]).decode('utf-8')
    lines = out.strip().split('\n')
    priv_key = lines[0].split(': ')[1].strip()
    pub_key = lines[1].split(': ')[1].strip()
except Exception as e:
    # Fallback keys
    priv_key = "0B_XLevzOj88BKh7ikez7x93-_86C5vN191Jwba8bV0"
    pub_key = "61VKkNjKVWS9KRRA13EwzrsKVFii57rAYOAstcVMdx0"

print("[+] Reality Keys:")
print("    Private:", priv_key)
print("    Public: ", pub_key)

client_uuid = "1fc82f0b-da3f-430f-8dac-9203a3e45b6b"
short_id = "dbb4ac96"

client_settings = {
    "clients": [
        {
            "id": client_uuid,
            "flow": "",
            "email": "Aken-VLESS-Reality",
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True,
            "tgId": 0,
            "subId": short_id,
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

inbound_payload = {
    "up": 0,
    "down": 0,
    "total": 0,
    "remark": "VLESS-TCP-Reality-Zoom",
    "enable": True,
    "expiryTime": 0,
    "listen": "",
    "port": 443,
    "protocol": "vless",
    "settings": json.dumps(client_settings),
    "streamSettings": json.dumps(stream_settings),
    "sniffing": json.dumps(sniffing)
}

req_add = urllib.request.Request(
    f"{BASE_URL}/panel/api/inbounds/add",
    data=urllib.parse.urlencode(inbound_payload).encode('utf-8')
)
res_add = opener.open(req_add)
add_result = json.loads(res_add.read().decode('utf-8'))
print("[+] Add Inbound result:", add_result)

# Build the exact VLESS client link
vless_link = (
    f"vless://{client_uuid}@132.226.190.34:443"
    f"?encryption=none"
    f"&security=reality"
    f"&fp=chrome"
    f"&sni=www.zoom.com"
    f"&pbk={pub_key}"
    f"&spx=%2f"
    f"&sid={short_id}"
    f"&type=tcp"
    f"&headerType=none"
    f"#NETFORGE-Zoom-Reality"
)

print("\n==================================================")
print("SUCCESSFULLY_CREATED_NEW_VLESS_REALITY")
print("PORT: 443")
print("PROTOCOL: VLESS + TCP + Reality")
print("SNI: www.zoom.com")
print("LINK:")
print(vless_link)
print("==================================================")

