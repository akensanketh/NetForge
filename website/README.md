# NETFORGE VPN — Website v1

Official public landing page for **NETFORGE VPN**, featuring a futuristic cybersecurity aesthetic with a dark navy background, electric-blue accents, and a clean, responsive interface inspired by modern high-end VPN platforms.

---

## 📁 Project Structure (5 Files)

| File | Type | Description |
| :--- | :--- | :--- |
| **`index.html`** | HTML5 | Complete landing page containing all 8 required sections. |
| **`styles.css`** | CSS3 | Dark navy (`#060919`) & electric-blue (`#00d2ff`) responsive design system. |
| **`script.js`** | JavaScript | Mobile navigation, FAQ accordion, smooth scrolling, and early-access queue handler. |
| **`globe.svg`** | SVG Graphic | Custom futuristic wireframe globe and cyber-horizon with glowing network nodes. |
| **`README.md`** | Markdown | Documentation, preview instructions, and publishing checklist. |

---

## 🎯 Included Sections in Website v1

1. **Home / Hero Section**:
   - Dribbble-inspired cyber-horizon globe graphic with electric-blue glow.
   - Clean headline: *"Browse Privately With a Secure VPN"*.
   - Subtitle: *"Engineered for pure privacy. Protect your connection with a lightweight, secure VPN designed for simplicity, minimal resource overhead, and verified cryptographic speed."*
   - Direct CTA: *"Request Early Access"* with subtext *"Currently in private testing • No credit card required"*.
   - Verified open standards strip: WireGuard® Protocol, ChaCha20-Poly1305, Curve25519 ECDH, Linux Kernel Native.

2. **VPN Features**:
   - WireGuard® Native Tunneling
   - Minimalist Resource Footprint
   - DNS Leak Isolation
   - Instant Network Roaming
   - Auditable Cryptography
   - Zero Proprietary Lock-In

3. **How NETFORGE Works**:
   - 3-Step cryptographic pipeline:
     - **Step 01: Local Keypair Generation** (Curve25519)
     - **Step 02: Encrypted Tunnel Handshake** (ChaCha20-Poly1305)
     - **Step 03: Direct Gateway Routing** (Dedicated egress endpoints)

4. **Security & Privacy Focus**:
   - Honest, verified technical architecture.
   - Strictly avoids unverified marketing claims (no unverified server counts or speed metrics).
   - Highlighting minimal attack surface (<4,000 lines of code) and zero telemetry tracking.

5. **Supported Platforms — Windows & Android**:
   - **Windows Card**: Windows 10 & 11 (64-bit), native kernel-level driver, one-click `.conf` import, on-demand kill switch.
   - **Android Card**: Android 8.0+, instant QR code camera setup, negligible battery drain (~2%/hr), Always-On VPN support.

6. **Frequently Asked Questions (FAQ)**:
   - Interactive accordion addressing project stage, protocol selection, client compatibility, and early access logistics.

7. **Early-Access Waitlist Section**:
   - Functional signup form with platform selector (Windows, Android, Both).
   - Generates and displays a unique early tester priority queue number (e.g., `#NF-4821`).
   - Persists state in `localStorage` so returning visitors see their reserved queue status.

8. **Footer & Legal Placeholders**:
   - Business contact email: `info.netforge@gmail.com`
   - Privacy Policy, Terms of Service, and Vulnerability Disclosure legal placeholders.
   - WireGuard® trademark attribution.

---

## 🚀 How to Preview Locally

1. Open File Explorer to:
   `c:\Users\AkenSanketh\Desktop\My Workplace\NETFORGE (VPN Service)\website`
2. Double-click **`index.html`** to open it in **Google Chrome**, **Microsoft Edge**, or **Firefox**.
3. Alternatively, if using a local server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```

---

## ☁️ Zero-Cost Static Hosting Deployment

Because this website uses pure HTML, CSS, JavaScript, and SVG with zero runtime dependencies, it can be deployed for **$0/month** on any modern static host:

- **Cloudflare Pages**: Connect Git repository or drag-and-drop the `website/` folder. Free SSL and global Anycast edge caching.
- **GitHub Pages**: Push to a repository, go to **Settings &rarr; Pages**, and select `main` / `root`.
- **Netlify**: Drag-and-drop the `website/` folder directly onto Netlify Drop.
- **Vercel**: Deploy with `vercel deploy`.

---

## 📋 Before Publishing Checklist

- [x] **Contact Email**: Updated with official business address `info.netforge@gmail.com`.
- [ ] **Early-Access Backend (Optional)**: If you wish to store early-access emails in a database instead of browser `localStorage`, connect the `earlyAccessForm` submit event to Formspree, Basin, or an API webhook.
- [ ] **Domain Name**: Point your custom domain (e.g. `netforgevpn.com`) to your static hosting provider with an automated Let's Encrypt SSL certificate.
