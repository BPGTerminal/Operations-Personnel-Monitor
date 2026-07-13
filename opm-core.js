/* ═══════════════════════════════════════════════════════════════
   OPM v2 — Core JavaScript Module
   Shared utilities: config, storage, messaging, GPS, sound, toast
   ═══════════════════════════════════════════════════════════════ */

const OPM = (() => {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  let _config = null;

  function loadConfig() {
    try {
      const raw = localStorage.getItem('opm_config_v2') ||
                  localStorage.getItem('tms_config');
      const cfg = raw ? JSON.parse(raw) : {};
      _config = cfg;
      return cfg;
    } catch (e) {
      console.error('[OPM] Config load failed:', e);
      return {};
    }
  }

  function saveConfig(cfg) {
    try {
      _config = { ..._config, ...cfg };
      localStorage.setItem('opm_config_v2', JSON.stringify(_config));
      // Also maintain backward compat
      localStorage.setItem('tms_config', JSON.stringify(_config));
    } catch (e) {
      console.error('[OPM] Config save failed:', e);
    }
  }

  function getConfig() { return _config || loadConfig(); }

  // ── Device ID ─────────────────────────────────────────────
  function getDeviceId() {
    let id = localStorage.getItem('opm_device_id');
    if (!id) {
      id = 'DEV_' + crypto.randomUUID().split('-')[0].toUpperCase();
      localStorage.setItem('opm_device_id', id);
    }
    return id;
  }

  // ── Toast Notifications ───────────────────────────────────
  let _toastContainer = null;

  function initToasts() {
    if (_toastContainer) return;
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    document.body.appendChild(_toastContainer);
  }

  function toast(message, type = 'info', duration = 3000) {
    initToasts();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    el.innerHTML = `<span>${icons[type] || '•'}</span> ${message}`;
    _toastContainer.appendChild(el);
    setTimeout(() => el.remove(), duration + 400);
  }

  // ── Sound Alerts ──────────────────────────────────────────
  const SOUNDS = {
    checkin:   { freq: 880, type: 'sine',   duration: .15, repeat: 2, gap: .08 },
    message:   { freq: 660, type: 'sine',   duration: .12, repeat: 2, gap: .06 },
    alert:     { freq: 440, type: 'square', duration: .3,  repeat: 3, gap: .1  },
    approval:  { freq: 1100, type: 'sine',  duration: .1,  repeat: 1, gap: 0   },
    broadcast: { freq: 520, type: 'triangle', duration: .2, repeat: 3, gap: .15 },
  };

  let _audioCtx = null;
  let _soundEnabled = localStorage.getItem('opm_sound') !== 'off';

  function getAudioCtx() {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _audioCtx;
  }

  function playSound(name) {
    if (!_soundEnabled) return;
    const s = SOUNDS[name];
    if (!s) return;

    try {
      const ctx = getAudioCtx();
      let time = ctx.currentTime;
      for (let i = 0; i < s.repeat; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = s.type;
        osc.frequency.value = s.freq;
        gain.gain.setValueAtTime(.08, time);
        gain.gain.exponentialRampToValueAtTime(.001, time + s.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + s.duration);
        time += s.duration + s.gap;
      }
    } catch (e) { /* Silently fail — audio is non-critical */ }
  }

  function toggleSound() {
    _soundEnabled = !_soundEnabled;
    localStorage.setItem('opm_sound', _soundEnabled ? 'on' : 'off');
    return _soundEnabled;
  }

  function isSoundEnabled() { return _soundEnabled; }

  // ── API Helper ─────────────────────────────────────────────
  const SHEET_URL = () => getConfig().sheetUrl || '';

  async function apiCall(action, data = {}, method = 'GET') {
    const url = SHEET_URL();
    if (!url) throw new Error('No backend URL configured');

    const params = new URLSearchParams({ action, t: Date.now(), ...data });
    const fetchOpts = method === 'POST'
      ? { method: 'POST', body: JSON.stringify({ action, ...data }) }
      : { method: 'GET', cache: 'no-store' };

    const fetchUrl = method === 'POST' ? url : `${url}?${params}`;
    const res = await fetch(fetchUrl, fetchOpts);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  // ── Offline Queue ──────────────────────────────────────────
  function getOfflineQueue() {
    try {
      return JSON.parse(localStorage.getItem('opm_offline_queue') || '[]');
    } catch { return []; }
  }

  function enqueueOffline(action, data) {
    const queue = getOfflineQueue();
    queue.push({ action, data, timestamp: Date.now() });
    localStorage.setItem('opm_offline_queue', JSON.stringify(queue));
  }

  async function flushOfflineQueue() {
    const queue = getOfflineQueue();
    if (!queue.length) return;

    const url = SHEET_URL();
    if (!url) return;

    let successCount = 0;
    for (const item of [...queue]) {
      try {
        await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ action: item.action, ...item.data })
        });
        successCount++;
      } catch { break; /* Stop on first failure */ }
    }

    // Remove successfully sent items
    const remaining = queue.slice(successCount);
    localStorage.setItem('opm_offline_queue', JSON.stringify(remaining));

    if (successCount > 0) {
      toast(`Synced ${successCount} queued ${successCount === 1 ? 'action' : 'actions'}`, 'success');
    }
  }

  // ── Network Status ────────────────────────────────────────
  let _isOnline = navigator.onLine;
  const _onlineCallbacks = [];
  const _offlineCallbacks = [];

  function onOnline(cb) { _onlineCallbacks.push(cb); }
  function onOffline(cb) { _offlineCallbacks.push(cb); }
  function isOnline() { return _isOnline; }

  window.addEventListener('online', () => {
    _isOnline = true;
    toast('Connection restored', 'success', 2000);
    flushOfflineQueue();
    _onlineCallbacks.forEach(cb => cb());
  });

  window.addEventListener('offline', () => {
    _isOnline = false;
    toast('Working offline — changes will sync when reconnected', 'warning', 4000);
    _offlineCallbacks.forEach(cb => cb());
  });

  // ── Theme ─────────────────────────────────────────────────
  function getTheme() {
    const stored = localStorage.getItem('opm_theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('opm_theme', theme);
  }

  function toggleTheme() {
    const current = getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  }

  function initTheme() {
    setTheme(getTheme());
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
      if (!localStorage.getItem('opm_theme')) setTheme(e.matches ? 'light' : 'dark');
    });
  }

  // ── Date/Time Helpers ─────────────────────────────────────
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function formatDateTime(date = new Date()) {
    return date.toLocaleDateString('en-PH', { day: '2-digit', month: 'long', year: 'numeric' }) +
      ' ' + formatTime(date);
  }

  function timeAgo(timestamp) {
    const diff = Date.now() - new Date(timestamp).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  // ── Confirm Dialog ────────────────────────────────────────
  function confirm(title, message, confirmLabel = 'Confirm', danger = false) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:400px;">
          <div class="modal-title">${title}</div>
          <p style="margin-bottom:16px;color:var(--text-secondary);font-size:14px;">${message}</p>
          <div class="flex gap-sm justify-between">
            <button class="btn" id="opm-confirm-cancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="opm-confirm-ok">${confirmLabel}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelector('#opm-confirm-cancel').onclick = () => {
        overlay.remove();
        resolve(false);
      };
      overlay.querySelector('#opm-confirm-ok').onclick = () => {
        overlay.remove();
        resolve(true);
      };
      overlay.onclick = (e) => {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      };
    });
  }

  // ── CSV Export ────────────────────────────────────────────
  function exportCSV(data, filename) {
    if (!data || !data.length) {
      toast('No data to export', 'warning');
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = String(row[h] ?? '');
        return val.includes(',') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export complete', 'success');
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    loadConfig();
    initTheme();
    initToasts();
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ────────────────────────────────────────────
  return {
    // Config
    loadConfig, saveConfig, getConfig,
    // Identity
    getDeviceId,
    // Notifications
    toast,
    // Sound
    playSound, toggleSound, isSoundEnabled,
    // API
    apiCall, SHEET_URL,
    // Offline
    enqueueOffline, flushOfflineQueue, getOfflineQueue,
    onOnline, onOffline, isOnline,
    // Theme
    getTheme, setTheme, toggleTheme, initTheme,
    // Helpers
    formatTime, formatDateTime, timeAgo, confirm, exportCSV,
  };
})();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OPM;
}
