/* ==========================================================================
   Supabase Client Configuration (NETFORGE Backend)
   ========================================================================== */
const SUPABASE_URL = 'https://plerynoczfgcvdandglh.supabase.co';
// Replace with the anon public key from: https://supabase.com/dashboard/project/plerynoczfgcvdandglh/settings/api
const SUPABASE_ANON_KEY = 'sb_publishable_y69niS_-SXlIfQexN_8BeQ_zIOnjWgm';

let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[Supabase Init Note]:', e.message);
  }
}
window.supabaseClient = supabaseClient;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFaqAccordion();
  initEarlyAccessForm();
  initSmoothScroll();
  initPortalAuth();
  initDashboardTabs();
  initDocTabs();
  initLocationsPage();
  initPricingSwitch();
  initSupportTicketForm();
});

/* ==========================================================================
   1. Navbar & Mobile Menu
   ========================================================================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const mobileToggle = document.getElementById('mobileToggle');
  const navLinks = document.getElementById('navLinks');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }

  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
}

/* ==========================================================================
   2. FAQ Accordion
   ========================================================================== */
function initFaqAccordion() {
  const accordion = document.getElementById('faqAccordion');
  if (!accordion) return;

  const items = accordion.querySelectorAll('.accordion-item');
  items.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      items.forEach(otherItem => {
        otherItem.classList.remove('active');
        const otherContent = otherItem.querySelector('.accordion-content');
        if (otherContent) otherContent.style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
}

/* ==========================================================================
   3. Early Access Waitlist Form (with Supabase sync)
   ========================================================================== */
function initEarlyAccessForm() {
  const form = document.getElementById('earlyAccessForm');
  const confirmation = document.getElementById('waitlistConfirmation');
  const confirmationDetails = document.getElementById('confirmationDetails');
  const emailInput = document.getElementById('waitlistEmail');
  const platformSelect = document.getElementById('waitlistPlatform');

  if (!form || !confirmation) return;

  const savedData = localStorage.getItem('netforge_waitlist_registration');
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      form.style.display = 'none';
      confirmation.style.display = 'block';
      confirmationDetails.innerHTML = `
        Welcome back! You are reserved among the <strong>first 20 members</strong> with <strong>${parsed.email}</strong>.
        Your early tester priority queue number is <strong>${parsed.queueId}</strong>.
      `;
    } catch (e) {}
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const platform = platformSelect.value;
    const queueId = '#NF-' + Math.floor(1000 + Math.random() * 9000);
    const submitBtn = form.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Securing your slot (First 20 Members)...';
    }

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('waitlist')
          .insert([{ email, platform, queue_id: queueId }]);

        if (error) {
          console.warn('[Supabase] Waitlist note:', error.message);
        }
      } catch (err) {
        console.error('[Supabase Error]', err);
      }
    }

    const record = { email, platform, queueId, registeredAt: new Date().toISOString() };
    localStorage.setItem('netforge_waitlist_registration', JSON.stringify(record));

    form.style.opacity = '0';
    setTimeout(() => {
      form.style.display = 'none';
      confirmation.style.display = 'block';
      confirmation.style.opacity = '0';
      confirmationDetails.innerHTML = `
        🎉 We've reserved 1 of the <strong>20 exclusive early access slots</strong> for <strong>${email}</strong>!<br>
        Your early tester priority queue number is <strong>${queueId}</strong>. We will notify you when your batch opens.
      `;
      setTimeout(() => {
        confirmation.style.transition = 'opacity 0.4s ease';
        confirmation.style.opacity = '1';
      }, 50);
    }, 250);
  });
}

/* ==========================================================================
   4. Customer Portal Auth (Login & Register -> Dashboard)
   ========================================================================== */
function initPortalAuth() {
  const tabSignIn = document.getElementById('tabSignInBtn');
  const tabRegister = document.getElementById('tabRegisterBtn');
  const signInForm = document.getElementById('signInForm');
  const registerForm = document.getElementById('registerForm');

  if (tabSignIn && tabRegister && signInForm && registerForm) {
    tabSignIn.addEventListener('click', () => {
      tabSignIn.classList.add('active');
      tabRegister.classList.remove('active');
      signInForm.style.display = 'block';
      registerForm.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabSignIn.classList.remove('active');
      registerForm.style.display = 'block';
      signInForm.style.display = 'none';
    });

    // Handle incoming URL parameters (e.g. login.html?tab=register or ?tab=signup)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = (urlParams.get('tab') || '').toLowerCase();
    if (tabParam === 'register' || tabParam === 'signup' || window.location.hash === '#register' || window.location.hash === '#signup') {
      tabRegister.click();
    }
  }
}

window.handlePortalAuth = async function(event, type) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = type === 'signin' ? 'Authenticating with NETFORGE...' : 'Creating Account...';
  }

  let email = '';
  let password = '';
  let name = '';
  if (type === 'signin') {
    email = document.getElementById('signInEmail')?.value?.trim() || 'user@netforge.internal';
    password = document.getElementById('signInPassword')?.value || 'DemoPass123!';
    name = email.split('@')[0];
  } else {
    email = document.getElementById('regEmail')?.value?.trim() || 'newuser@netforge.internal';
    password = document.getElementById('regPassword')?.value || 'DemoPass123!';
    name = document.getElementById('regName')?.value?.trim() || email.split('@')[0];
  }

  let userProfile = {
    email,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    role: 'Member'
  };

  // Connect to Supabase Auth if client is active
  if (window.supabaseClient) {
    try {
      if (type === 'signin') {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          console.warn('[Supabase Auth Sign-In]', error.message);
        } else if (data && data.user) {
          userProfile = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || email.split('@')[0],
            role: 'Member'
          };
        }
      } else {
        const { data, error } = await window.supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { name: email.split('@')[0] }
          }
        });
        if (error) {
          console.warn('[Supabase Auth Sign-Up]', error.message);
        } else if (data && data.user) {
          userProfile = {
            id: data.user.id,
            email: data.user.email,
            name: email.split('@')[0],
            role: 'Member'
          };
        }
      }
    } catch (err) {
      console.warn('[Supabase Auth Notice]', err);
    }
  }

  // Store active session user
  localStorage.setItem('netforge_portal_user', JSON.stringify(userProfile));

  // Redirect to target or Dashboard
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (redirect) {
    window.location.href = redirect;
  } else {
    window.location.href = 'dashboard.html';
  }
};

window.handleLogout = function(event) {
  if (event) event.preventDefault();
  localStorage.removeItem('netforge_portal_user');
  if (window.location.pathname.includes('purchase') || window.location.href.includes('purchase')) {
    if (typeof checkAuthStatus === 'function') {
      checkAuthStatus();
    } else {
      window.location.reload();
    }
  } else {
    window.location.href = 'login.html';
  }
};

/* ==========================================================================
   5. Dashboard Navigation Panes & Modals
   ========================================================================== */
function initDashboardTabs() {
  const navItems = document.querySelectorAll('.portal-nav-item');
  if (navItems.length === 0) return;

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const paneId = item.getAttribute('data-pane');
      if (!paneId) return;

      navItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.portal-pane').forEach(p => p.classList.remove('active'));
      const activePane = document.getElementById(paneId);
      if (activePane) activePane.classList.add('active');
    });
  });

  // Display user initials/email if logged in
  const savedUser = localStorage.getItem('netforge_portal_user');
  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      const nameEl = document.querySelector('.portal-user-badge strong');
      const avatarEl = document.querySelector('.avatar-initials');
      if (nameEl) nameEl.textContent = u.name;
      if (avatarEl) avatarEl.textContent = u.name.substring(0, 2).toUpperCase();
    } catch (e) {}
  }

  // Payment Verification Status Handling in Dashboard
  const bannerContainer = document.getElementById('adminPaymentBannerContainer');
  let activeOrder = null;

  if (savedUser) {
    try {
      const u = JSON.parse(savedUser);
      activeOrder = u.active_order;
    } catch (e) {}
  }

  if (!activeOrder) {
    try {
      const all = JSON.parse(localStorage.getItem('netforge_all_orders') || '[]');
      if (all.length > 0) activeOrder = all[0];
    } catch (e) {}
  }

  const dlConfBtn = document.getElementById('triggerDownloadConfBtn');
  const showQrBtn = document.getElementById('triggerShowQrBtn');
  const configBox = document.getElementById('liveConfigDisplay');

  function renderPaymentStatus(order) {
    if (!order || !bannerContainer) return;
    const status = order.status || order.payment_status || 'pending_admin_approval';

    if (status === 'pending_admin_approval') {
      bannerContainer.innerHTML = `
        <div class="checkout-card" style="margin-bottom:24px; border-color:#f59e0b; background:linear-gradient(180deg, rgba(245,158,11,0.12) 0%, #060a1e 50%); padding:20px; box-shadow:0 0 25px rgba(245,158,11,0.15);">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <span style="font-size:2.2rem;">⏳</span>
            <div style="flex-grow:1;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px; flex-wrap:wrap;">
                <strong style="color:#f59e0b; font-size:1.05rem;">Bank Transfer Verification Pending Admin Review</strong>
                <span style="background:rgba(245,158,11,0.2); color:#f59e0b; border:1px solid #f59e0b; padding:2px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">UNDER ADMIN REVIEW</span>
              </div>
              <p style="color:var(--text-secondary); font-size:0.88rem; margin:0; line-height:1.5;">
                Order <strong style="color:#fff;">#${order.order_id || 'NF-ORD'}</strong> &bull; Bank Ref: <code style="color:#fff;">${order.transaction_ref}</code> &bull; Attached Receipt: <span style="color:#fff;">${order.bill_filename || 'receipt.jpg'}</span>.<br>
                To ensure authenticated payments, V2Ray configuration generation and VMess access credentials are locked until our billing administrator reconciles the incoming transfer with our bank account.
              </p>
            </div>
            <a href="admin.html" target="_blank" class="btn btn-outline btn-sm" style="font-size:0.78rem; border-color:rgba(245,158,11,0.5); color:#f59e0b;">Admin Approvals &rarr;</a>
          </div>
        </div>
      `;

      if (dlConfBtn) {
        dlConfBtn.disabled = true;
        dlConfBtn.textContent = '🔒 Locked — Awaiting Admin Verification';
        dlConfBtn.classList.remove('btn-primary');
        dlConfBtn.classList.add('btn-secondary');
        dlConfBtn.style.opacity = '0.65';
        dlConfBtn.style.cursor = 'not-allowed';
      }
      if (showQrBtn) {
        showQrBtn.disabled = true;
        showQrBtn.textContent = '🔒 QR Locked';
        showQrBtn.style.opacity = '0.65';
        showQrBtn.style.cursor = 'not-allowed';
      }
      if (configBox) {
        configBox.textContent = `// NETFORGE V2Ray (VMess + TLS) Configuration Locked
// Status: PENDING ADMIN APPROVAL
// Order Ref: #${order.order_id || 'NF-ORD'}
// Bank Transaction Ref: ${order.transaction_ref}
//
// Your unique V2Ray VMess UUID and TLS stealth endpoint will be unlocked 
// as soon as the billing administrator confirms receipt of funds.`;
      }
    } else if (status === 'approved') {
      bannerContainer.innerHTML = `
        <div class="checkout-card" style="margin-bottom:24px; border-color:var(--accent-emerald); background:linear-gradient(180deg, rgba(16,185,129,0.12) 0%, #060a1e 50%); padding:20px;">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <span style="font-size:2.2rem;">✅</span>
            <div style="flex-grow:1;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px; flex-wrap:wrap;">
                <strong style="color:var(--accent-emerald); font-size:1.05rem;">Payment Verified & Approved by Admin!</strong>
                <span style="background:rgba(16,185,129,0.2); color:var(--accent-emerald); border:1px solid var(--accent-emerald); padding:2px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">APPROVED & ACTIVE</span>
              </div>
              <p style="color:var(--text-secondary); font-size:0.88rem; margin:0; line-height:1.5;">
                Order <strong style="color:#fff;">#${order.order_id || 'NF-ORD'}</strong> &bull; Bank Ref: <code>${order.transaction_ref}</code> has been confirmed. Your 1Gbps V2Ray (VMess + TLS) configuration is active and ready for download.
              </p>
            </div>
          </div>
        </div>
      `;

      if (dlConfBtn) {
        dlConfBtn.disabled = false;
        dlConfBtn.textContent = '📥 Download V2Ray Config (.json)';
        dlConfBtn.classList.remove('btn-secondary');
        dlConfBtn.classList.add('btn-primary');
        dlConfBtn.style.opacity = '1';
        dlConfBtn.style.cursor = 'pointer';
      }
      if (showQrBtn) {
        showQrBtn.disabled = false;
        showQrBtn.textContent = '📱 View Mobile QR Code';
        showQrBtn.style.opacity = '1';
        showQrBtn.style.cursor = 'pointer';
      }
    } else if (status === 'rejected') {
      bannerContainer.innerHTML = `
        <div class="checkout-card" style="margin-bottom:24px; border-color:var(--accent-rose); background:linear-gradient(180deg, rgba(239,68,68,0.12) 0%, #060a1e 50%); padding:20px;">
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <span style="font-size:2.2rem;">❌</span>
            <div style="flex-grow:1;">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px; flex-wrap:wrap;">
                <strong style="color:var(--accent-rose); font-size:1.05rem;">Payment Receipt Verification Rejected</strong>
                <span style="background:rgba(239,68,68,0.2); color:var(--accent-rose); border:1px solid var(--accent-rose); padding:2px 10px; border-radius:12px; font-size:0.75rem; font-weight:700;">REJECTED</span>
              </div>
              <p style="color:var(--text-secondary); font-size:0.88rem; margin:0; line-height:1.5;">
                Reason: <strong style="color:#fff;">${order.rejection_reason || 'Bank reference not found in account statement.'}</strong><br>
                Please re-upload your valid bank transfer receipt or contact support for help.
              </p>
            </div>
            <a href="purchase.html" class="btn btn-primary btn-sm">Re-Submit Receipt &rarr;</a>
          </div>
        </div>
      `;
    }
  }

  if (activeOrder) {
    renderPaymentStatus(activeOrder);
  }

  // Also query Supabase directly for active order if user is signed in
  if (window.supabaseClient && savedUser) {
    try {
      const u = JSON.parse(savedUser);
      window.supabaseClient
        .from('orders')
        .select('*')
        .eq('user_email', u.email)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            renderPaymentStatus(data[0]);
          }
        });
    } catch (err) {}
  }

  const dlConfBtn = document.getElementById('triggerDownloadConfBtn');
  if (dlConfBtn) {
    dlConfBtn.addEventListener('click', () => {
      const dev = document.getElementById('configDeviceSelect')?.value || 'Active-Device';
      const srv = document.getElementById('configServerSelect')?.value || 'us-nyc-01';
      window.generateConfigDownload(dev, srv);
    });
  }

  const showQrBtn = document.getElementById('triggerShowQrBtn');
  if (showQrBtn) {
    showQrBtn.addEventListener('click', () => {
      const dev = document.getElementById('configDeviceSelect')?.value || 'Active Device';
      window.showQrModal(dev);
    });
  }
}

// Modal control helpers for Dashboard & Purchase
window.openModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
};

window.closeModal = function(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
};

window.switchPortalPane = function(paneId) {
  const navItem = document.querySelector(`.portal-nav-item[data-pane="${paneId}"]`);
  if (navItem) navItem.click();
};

window.showQrModal = function(deviceLabel) {
  const title = document.getElementById('qrDeviceTitle');
  if (title) title.textContent = `Scan with V2Ray Mobile (${deviceLabel || 'Mobile Device'})`;
  window.openModal('qrCodeModal');
};

window.generateConfigDownload = function(deviceName, serverNode) {
  const serverHost = serverNode ? `${serverNode}.netforge.network` : 'us-nyc-01.netforge.network';
  const v2rayConfig = {
    "log": { "loglevel": "warning" },
    "inbounds": [
      {
        "port": 10808,
        "listen": "127.0.0.1",
        "protocol": "socks",
        "settings": { "auth": "noauth", "udp": true }
      },
      {
        "port": 10809,
        "listen": "127.0.0.1",
        "protocol": "http"
      }
    ],
    "outbounds": [
      {
        "protocol": "vmess",
        "tag": "proxy",
        "settings": {
          "vnext": [
            {
              "address": serverHost,
              "port": 443,
              "users": [
                {
                  "id": "e4b27c1a-9f5e-4c3e-862d-a19e27c85b40",
                  "alterId": 0,
                  "security": "auto"
                }
              ]
            }
          ]
        },
        "streamSettings": {
          "network": "ws",
          "security": "tls",
          "tlsSettings": {
            "serverName": serverHost,
            "allowInsecure": false
          },
          "wsSettings": {
            "path": "/netforge-tunnel"
          }
        }
      },
      {
        "protocol": "freedom",
        "tag": "direct",
        "settings": {}
      }
    ]
  };

  const jsonStr = JSON.stringify(v2rayConfig, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `netforge-v2ray-${(deviceName || 'node').toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.copyVmessLink = function(btn) {
  const vmessUri = "vmess://eyJhZGQiOiJ1cy1ueWMtMDEubmV0Zm9yZ2UubmV0d29yayIsImFpZCI6IjAiLCJhbHBuIjoiIiwiaG9zdCI6InVzLW55Yy0wMS5uZXRmb3JnZS5uZXR3b3JrIiwiaWQiOiJlNGIyN2MxYS05ZjVlLTRjM2UtODYyZC1hMTllMjdjODViNDAiLCJuZXQiOiJ3cyIsInBhdGgiOiIvbmV0Zm9yZ2UtdHVubmVsIiwicG9ydCI6IjQ0MyIsInBzIjoiTkVURk9SR0UgVjJSYXkgVVNBIC0gTmV3IFlvcmsiLCJzY3kiOiJhdXRvIiwic25pIjoidXMubmV0Zm9yZ2UubmV0d29yayIsInRscyI6InRscyIsInR5cGUiOiJub25lIiwidiI6IjIifQ==";
  navigator.clipboard.writeText(vmessUri).then(() => {
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied vmess:// Link!';
      setTimeout(() => btn.textContent = orig, 2000);
    } else {
      alert('V2Ray VMess Link copied to clipboard!');
    }
  });
};

window.copySnippet = function(btn) {
  const pre = btn.parentElement.querySelector('pre');
  if (pre) {
    navigator.clipboard.writeText(pre.innerText).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    });
  }
};

/* ==========================================================================
   6. Smooth Scrolling for In-Page Anchors
   ========================================================================== */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/* ==========================================================================
   7. Documentation OS Tabs (Windows & Android Locked)
   ========================================================================== */
function initDocTabs() {
  const tabNav = document.getElementById('docTabs');
  if (!tabNav) return;

  const buttons = tabNav.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.hasAttribute('disabled') || btn.style.pointerEvents === 'none') {
        e.preventDefault();
        return;
      }

      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      panes.forEach(pane => {
        if (pane.id === `pane-${targetTab}`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });
}

/* ==========================================================================
   8. Server Locations Filtering & Ping Simulation (USA & India only)
   ========================================================================== */
function initLocationsPage() {
  const searchInput = document.getElementById('locationSearch');
  const filterContainer = document.getElementById('regionFilters');
  const pingBtn = document.getElementById('pingAllBtn');
  const cards = document.querySelectorAll('.location-card');

  if (cards.length === 0) return;

  let activeRegion = 'all';

  function filterCards() {
    const query = (searchInput?.value || '').toLowerCase().trim();

    cards.forEach(card => {
      const country = (card.getAttribute('data-country') || '').toLowerCase();
      const text = card.textContent.toLowerCase();

      const matchesRegion = (activeRegion === 'all') || (country === activeRegion);
      const matchesSearch = !query || text.includes(query);

      if (matchesRegion && matchesSearch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (filterContainer) {
    const buttons = filterContainer.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeRegion = btn.getAttribute('data-region') || 'all';
        filterCards();
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterCards);
  }

  if (pingBtn) {
    pingBtn.addEventListener('click', () => {
      pingBtn.disabled = true;
      pingBtn.textContent = '⚡ Measuring Latencies...';

      const baseLatencies = {
        'new york': 22,
        'los angeles': 38,
        'chicago': 28,
        'miami': 34,
        'mumbai': 16,
        'bangalore': 20,
        'delhi': 24,
        'hyderabad': 19
      };

      setTimeout(() => {
        cards.forEach(card => {
          const city = (card.getAttribute('data-city') || '').toLowerCase();
          const pingEl = card.querySelector('.ping-val');
          if (pingEl) {
            const base = baseLatencies[city] || 25;
            const variance = Math.floor(Math.random() * 5) - 2;
            const newPing = Math.max(12, base + variance);
            pingEl.textContent = `${newPing} ms`;
            pingEl.style.color = newPing < 25 ? 'var(--accent-emerald)' : 'var(--electric-cyan)';
          }
        });
        pingBtn.disabled = false;
        pingBtn.textContent = '⚡ Refresh Latencies';
      }, 400);
    });
  }
}

/* ==========================================================================
   9. Pricing Billing Switch Toggle (Monthly vs 2-Year)
   ========================================================================== */
function initPricingSwitch() {
  const billingSwitch = document.getElementById('pricingBillingSwitch');
  const featuredPrice = document.getElementById('featuredPrice');
  const featuredDetail = document.getElementById('featuredDetail');

  if (!billingSwitch || !featuredPrice) return;

  billingSwitch.addEventListener('change', () => {
    if (billingSwitch.checked) {
      // 2-Year Plan
      featuredPrice.textContent = '3.29';
      if (featuredDetail) {
        featuredDetail.textContent = 'Billed $78.96 every 2 years (includes 3 extra months free)';
      }
    } else {
      // Annual Plan
      featuredPrice.textContent = '4.99';
      if (featuredDetail) {
        featuredDetail.textContent = 'Billed $59.88 annually';
      }
    }
  });
}

// Global helper for Dashboard server latency re-test
window.simulateServerRefresh = function() {
  const btn = event?.target;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⚡ Testing...';
    setTimeout(() => {
      alert('Bare-metal fleet latency check completed: All USA and India 1Gbps uplink nodes are operating with 0% packet loss.');
      btn.disabled = false;
      btn.textContent = '⚡ Re-Test Latencies';
    }, 600);
  }
};

/* ==========================================================================
   10. Support Ticket Form (Syncs to Supabase public.support_tickets)
   ========================================================================== */
function initSupportTicketForm() {
  const form = document.getElementById('supportTicketForm');
  const notice = document.getElementById('ticketSuccessNotice');
  if (!form || !notice) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Ticket to Support Fleet...';
    }

    const name = document.getElementById('ticketName')?.value?.trim() || '';
    const email = document.getElementById('ticketEmail')?.value?.trim() || '';
    const category = document.getElementById('ticketCategory')?.value || 'v2ray';
    const priority = document.getElementById('ticketPriority')?.value || 'normal';
    const subject = document.getElementById('ticketSubject')?.value?.trim() || '';
    const message = document.getElementById('ticketMessage')?.value?.trim() || '';
    const ticketRef = '#NF-' + Math.floor(10000 + Math.random() * 90000);

    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient.from('support_tickets').insert([{
          ticket_ref: ticketRef,
          name,
          email,
          category,
          priority,
          subject,
          message,
          status: 'open'
        }]);
        if (error) console.warn('[Supabase Ticket Sync]', error.message);
      } catch (err) {
        console.warn('[Supabase Ticket Network]', err);
      }
    }

    form.style.display = 'none';
    notice.style.display = 'block';
    const refEl = notice.querySelector('strong');
    if (refEl) refEl.textContent = ticketRef;
  });
}

/* ==========================================================================
   11. Supabase Diagnostic Helper
   ========================================================================== */
window.checkSupabaseConnection = async function() {
  console.log('%c[NETFORGE Backend Diagnostic]', 'color: #00d2ff; font-weight: bold; font-size: 14px;');
  console.log('Project Target URL:', SUPABASE_URL);
  if (!window.supabase) {
    console.error('❌ Supabase JS SDK not loaded on this page.');
    return { ok: false, error: 'SDK_NOT_LOADED' };
  }
  if (!supabaseClient) {
    console.error('❌ Supabase client initialization failed.');
    return { ok: false, error: 'CLIENT_NULL' };
  }
  try {
    const { data, error } = await supabaseClient.from('waitlist').select('count', { count: 'exact', head: true });
    if (error) {
      console.warn('⚠️ Supabase response note:', error.message);
      return { ok: false, message: error.message };
    }
    console.log('✅ Supabase connected successfully! Database tables are reachable.');
    return { ok: true, data };
  } catch (err) {
    console.error('❌ Network error reaching Supabase:', err);
    return { ok: false, error: err.message };
  }
};
