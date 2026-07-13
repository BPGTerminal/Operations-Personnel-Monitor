# OPM v2 — Operations Personnel Monitor (Enhanced)

**Real-time field personnel tracking, communications, and command system for EOC operations, planned events, and emergency activations.**

> 🚀 **Enhanced version** of the original [BPGTerminal/Operations-Personnel-Monitor](https://github.com/BPGTerminal/Operations-Personnel-Monitor)
> Built for Philippine LGU operations by **-=pagong=- Joey Sabenacio Heredero**, Brooke's Point, Palawan.

---

## What's New in v2: Brutal Enhancement

### 🏗️ **Architecture Overhaul**

| Problem | v1 | v2 |
|---------|-----|-----|
| Code structure | Monolithic 92KB HTML files | Modular CSS + JS + HTML |
| CSS | Inline/page-level, ~800 lines duplicated | Shared design system (`opm-core.css`) |
| JavaScript | Global scope, spaghetti dependencies | Module pattern (`OPM.*` namespace) |
| Config management | localStorage scattered everywhere | Centralized `OPM.getConfig()` / `OPM.saveConfig()` |
| Service worker | Basic network-first | Stale-while-revalidate, push notifications, offline fallback page |

### ✨ **New Features**

| Feature | Description |
|---------|-------------|
| 🔊 **Sound Alerts** | Audio cues for new check-ins, messages, approvals, and broadcasts (Web Audio API) |
| 📦 **Offline Message Queue** | Messages auto-queue when offline, flush when reconnected |
| 🌓 **Dark/Light Theme** | System-preference aware with manual toggle |
| 📊 **Toast Notifications** | Non-blocking status notifications for all operations |
| ⌨️ **Keyboard Shortcuts** | `Ctrl+F` to focus compose, `M` to toggle map fullscreen |
| 📴 **Offline Fallback Page** | Graceful offline page instead of browser error |
| 🔔 **Push Notification Support** | Service worker ready for push alerts |
| 🔄 **Background Sync** | Periodic sync API integration for offline queue |
| 📸 **Lazy-Loaded Photos** | Images use `loading="lazy"` for better performance |
| 🔍 **Better GPS Quality Indicator** | Visual indicator for GPS accuracy (good/fair/poor) |

### 🐛 **Bug Fixes**

| Fix | Detail |
|-----|--------|
| Silent error swallowing | 15+ `catch(e){}` blocks now show user feedback |
| Demo data leakage | Hardcoded "PARADE TEAM"/"PAGONG" strings removed from production code |
| Google Meet hack panel | 200+ lines of non-functional embed code replaced with streamlined flow |
| CORS proxy dependency | PHIVOLCS layers now try direct WMS first, with clear fallback messaging |
| localStorage sync | Config now uses `opm_config_v2` key with backward-compat writes |
| Session restore race | Personnel app handles session restore more robustly |

### 🚀 **Performance**

| Metric | v1 | v2 |
|--------|-----|-----|
| CSS size | ~900 lines (duplicated) | ~400 lines (shared) |
| JS density | Global scope | Namespaced modules |
| Initial load | 3 HTML files × ~80KB | CSS cached, JS shared |
| SW cache strategy | Network-only HTML | Stale-while-revalidate for CDN assets |

---

## Architecture

```
opm-enhanced/
├── css/
│   ├── opm-core.css          # Design system (shared by all pages)
│   └── opm-commander.css     # Commander-specific styles
├── js/
│   └── opm-core.js           # Shared utilities module
├── assets/                   # (future: icons, sounds)
├── commander.html            # EOC Commander Dashboard
├── personnel.html            # Field Personnel Mobile App
├── admin.html                # ⚠️ Not yet enhanced (use v1 admin.html)
├── sw.js                     # Enhanced Service Worker
├── manifest.json             # PWA Manifest (with shortcuts)
├── icon-192.png
├── icon-512.png
└── README.md
```

---

## Migration from v1

### Step 1: Replace files
Drop the enhanced files into your existing GitHub Pages deployment alongside the original admin.html, or replace all three HTML files:

```bash
# Copy enhanced files
cp -r opm-enhanced/* your-deploy-dir/
# Keep original admin.html (not yet enhanced)
cp opm-original/admin.html your-deploy-dir/
```

### Step 2: Update cache version
The new service worker (`sw.js`) uses `CACHE_VERSION = 'opm-v4'`. It will auto-clean old caches on activation.

### Step 3: Clear client-side storage (recommended)
Ask personnel to clear site data once, or the new `opm_config_v2` key will coexist with the old `tms_config`.

### Backward compatibility
- Config is written to **both** `opm_config_v2` (new) and `tms_config` (old) keys
- Device IDs are preserved
- Session tokens (`opm_pending`) are preserved
- Google Sheets backend requires **no changes**

---

## Tech Stack (unchanged)

| Layer | Technology | Cost |
|-------|-----------|------|
| Hosting | GitHub Pages | Free |
| Database | Google Sheets | Free |
| Backend | Google Apps Script | Free |
| Maps | Leaflet.js + OpenStreetMap | Free |
| Satellite | Esri World Imagery | Free |
| Hazard Data | PHIVOLCS Hazard Hunter WMS | Free |
| Video Calls | Google Meet | Free |
| **Total** | | **₱0/month** |

---

## Quick Start

1. **Admin** — Open `admin.html`, enter your Apps Script URL, configure event/teams, save.
2. **Commander** — Open `commander.html` on a laptop/desktop at the EOC.
3. **Personnel** — Each field officer opens `personnel.html` on their phone, fills in details, waits for approval.
4. **Operate** — Commander sees everyone on the map, sends orders, receives reports, launches video calls.

---

## Keyboard Shortcuts (Commander)

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus message compose |
| `M` | Toggle map fullscreen |
| `Esc` | Close photo modal / panels |

---

## Future Roadmap

- [ ] Enhance `admin.html` with the new design system
- [ ] Add personnel route history tracking on map
- [ ] Add geofence alerts (personnel leaves assigned area)
- [ ] Add weather overlay from PAGASA
- [ ] Add battery level reporting from personnel devices
- [ ] Add push notification support (requires server-side VAPID keys)
- [ ] Add data export (CSV/PDF) for after-action reports
- [ ] Add unit tests for core JS module
- [ ] Add E2E tests with Playwright

---

## Data & Privacy

All data is stored in **your own Google Sheets** — no third party has access to your operational data. Personnel GPS coordinates are transmitted directly to your Apps Script backend.

---

**© 2026 Joey Sabenacio Heredero** · EOC / Operations Management · Brooke's Point, Palawan
_-=pagong=-_
