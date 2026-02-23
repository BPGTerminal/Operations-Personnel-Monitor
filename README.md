# OPM — Operations Personnel Monitor

**Real-time field personnel tracking, communications, and command system for EOC operations, planned events, and emergency activations.**

Built for Philippine LGU operations by **-=pagong=- Joey Sabenacio Heredero**, Brooke's Point, Palawan.

---

## What It Does

OPM is a zero-cost, browser-based command-and-control system that connects field personnel to an operations commander in real time — no app store, no servers, no monthly fees.

| Feature | Description |
|---|---|
| 🗺️ **Live Map** | Personnel GPS positions update every 10 seconds on the commander's map |
| 📡 **Real-time Comms** | Two-way messaging between commander and all field units |
| 📸 **Photo Reports** | Field personnel attach photos with embedded GPS coordinates |
| 🎥 **Video Calls** | One-click Google Meet integration — auto-broadcasts link to all phones |
| ✅ **Access Approval** | Commander approves or rejects each login request before personnel enter |
| 🗂️ **Multi-team Support** | Up to 7 color-coded teams/sectors with individual access codes |
| 🌐 **Hazard Overlays** | Flood, landslide, and storm surge maps from PHIVOLCS Hazard Hunter |
| 📴 **Offline-resilient** | Installable PWA — works on any phone browser, retries on signal loss |
| 📊 **Auto-logging** | All comms, personnel check-ins, and video calls logged to Google Sheets |

---

## Three Interfaces

```
commander.html  →  EOC Dashboard (desktop/laptop)
personnel.html  →  Field Personnel App (mobile phone)
admin.html      →  Event Setup & Configuration
```

**Commander Dashboard** — Full-screen map with live personnel markers, comms log, team filters, hazard overlays, video call launcher, and approval panel for incoming login requests.

**Personnel App** — Mobile-optimized check-in form, messaging, photo capture, GPS sharing, and video call join — all in a phone browser. Installs to home screen like a native app.

**Admin Panel** — Configure event name, dates, commander callsign, teams, access codes, and map center location. Changes propagate to all connected devices automatically.

---

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Hosting | GitHub Pages | Free |
| Database | Google Sheets | Free |
| Backend | Google Apps Script | Free |
| Maps | Leaflet.js + OpenStreetMap | Free |
| Satellite Layer | Esri World Imagery | Free |
| Hazard Data | PHIVOLCS Hazard Hunter WMS | Free |
| Video Calls | Google Meet | Free |
| **Total** | | **₱0 / month** |

---

## Use Cases

- 🎉 Fiesta and cultural event operations
- 🚦 Traffic management and crowd control
- 🏥 Disaster response and EOC activation
- 🏛️ Barangay and municipal operations
- 🔒 Security and site monitoring
- 🌊 Typhoon and flood response coordination

---

## Quick Start

1. **Admin** — Open `admin.html`, enter your Apps Script URL, configure your event and teams, save.
2. **Commander** — Open `commander.html` on a laptop or desktop at the EOC.
3. **Personnel** — Each field officer opens `personnel.html` on their phone, fills in their details, and waits for commander approval.
4. **Operate** — Commander sees everyone on the map, sends orders, receives situation reports, and launches video calls with one click.

---

## Data & Privacy

All data is stored in **your own Google Sheets** — Anthropic, GitHub, and no third party has access to your operational data. Personnel GPS coordinates are transmitted directly to your Apps Script backend and stored only in your spreadsheet.

---

## Designed For

Philippine LGU emergency and event operations teams with limited budgets and rural connectivity. Works on standard mobile data (3G/LTE). Degrades gracefully on slow connections.

---

**© 2026 Joey Sabenacio Heredero** · EOC / Operations Management · Brooke's Point, Palawan  
*-=pagong=-*
