import os
import ftplib

ftp_host = "ftpupload.net"
ftp_user = "if0_43407230"
ftp_pass = "netforge2008"
website_dir = os.path.join(os.path.dirname(__file__), "website")

print(f"Connecting to {ftp_host}...")
try:
    ftp = ftplib.FTP(ftp_host, ftp_user, ftp_pass, timeout=30)
    print("Logged in successfully!")
    print(ftp.getwelcome())

    print("Navigating to htdocs/...")
    ftp.cwd("htdocs")
    print("Current directory:", ftp.pwd())

    files_to_upload = [
        "purchase.html",
        "create-checkout.php",
        "pay.js",
        "script.js",
        "styles.css",
        "pricing.html",
        "index.html",
        "dashboard.html"
    ]

    for filename in files_to_upload:
        filepath = os.path.join(website_dir, filename)
        if os.path.exists(filepath):
            print(f"Uploading {filename}...")
            with open(filepath, "rb") as f:
                ftp.storbinary(f"STOR {filename}", f)
            print(f"Uploaded {filename} successfully.")
        else:
            print(f"Skipping {filename} (not found locally)")

    print("\n--- Listing remote htdocs directory ---")
    ftp.retrlines("LIST")

    ftp.quit()
    print("\nALL FILES DEPLOYED TO INFINITYFREE SUCCESSFULLY!")
except Exception as e:
    print(f"Error during deployment: {e}")
