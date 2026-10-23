/* SLT leaflet library: shared code used by every page.
   Plain JavaScript with no build step and no outside services. */
(function () {
  'use strict';

  var ROOT = document.documentElement.getAttribute('data-root') || './';
  var SLT = (window.SLT = {});
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  SLT.root = ROOT;
  SLT.FILE_CACHE = 'slt-files';           // must match sw.js
  SLT.RECENT_KEY = 'slt-recent-leaflets';  // list of IDs kept only on this device

  /* ---------- small helpers ---------- */
  SLT.url = function (path) {
    return ROOT + String(path || '').replace(/^\/+/, '');
  };

  SLT.esc = function (value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  SLT.$ = function (sel, scope) { return (scope || document).querySelector(sel); };

  SLT.param = function (name) {
    var match = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
    return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : '';
  };

  /* Leaflet IDs: two letters and three digits, e.g. SW-001.
     Accepts sw001, SW-1, " sw 001 " and so on. Returns null if it can't be an ID. */
  SLT.normaliseId = function (raw) {
    var s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    var m = /^([A-Z]{2})(\d{1,3})$/.exec(s);
    if (!m) return null;
    return m[1] + '-' + ('000' + m[2]).slice(-3);
  };

  SLT.todayIso = function () {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };

  SLT.addDays = function (iso, days) {
    var p = iso.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + days);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };

  SLT.niceDate = function (iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '';
    return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
  };

  /* ---------- data ---------- */
  function getJSON(path) {
    return fetch(SLT.url(path), { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error(path + ' returned ' + res.status);
      return res.json();
    });
  }

  SLT.load = function () {
    return Promise.all([getJSON('data/site.json'), getJSON('data/taxonomy.json'), getJSON('data/catalogue.json')])
      .then(function (r) {
        var site = r[0] || {};
        var tax = r[1] || {};
        var raw = (r[2] && r[2].leaflets) || [];
        var leaflets = raw.map(function (lf) {
          var copy = {};
          for (var k in lf) if (Object.prototype.hasOwnProperty.call(lf, k)) copy[k] = lf[k];
          copy.id = SLT.normaliseId(lf.id) || String(lf.id || '');
          copy.topic = String(lf.topic || copy.id.slice(0, 2)).toUpperCase();
          copy.audience = toList(lf.audience);
          copy.conditions = toList(lf.conditions);
          copy.status = lf.status || 'Active';
          return copy;
        });
        var byId = {};
        leaflets.forEach(function (lf) { if (!byId[lf.id]) byId[lf.id] = lf; });
        var data = { site: site, tax: tax, leaflets: leaflets, byId: byId };
        SLT.data = data;
        return data;
      });
  };

  function toList(v) {
    if (Array.isArray(v)) return v.filter(Boolean);
    if (!v) return [];
    return String(v).split(/\s*;\s*/).filter(Boolean);
  }

  SLT.isActive = function (lf) { return lf && lf.status !== 'Withdrawn'; };

  SLT.topic = function (tax, code) {
    var topics = (tax && tax.topics) || [];
    for (var i = 0; i < topics.length; i++) if (topics[i].code === code) return topics[i];
    return { code: code, label: code, patient_label: code };
  };

  SLT.audienceLabel = function (tax, value) {
    var list = (tax && tax.audiences) || [];
    for (var i = 0; i < list.length; i++) if (list[i].value === value) return list[i].patient_label;
    return value;
  };

  SLT.fileUrl = function (lf) { return SLT.url(lf.file); };

  SLT.downloadName = function (lf) {
    var safe = String(lf.title || 'Leaflet').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    return safe + ' (' + lf.id + ').pdf';
  };

  SLT.reviewState = function (lf, site) {
    if (!SLT.isActive(lf)) return 'withdrawn';
    if (!lf.review_date) return 'missing';
    var today = SLT.todayIso();
    if (lf.review_date < today) return 'overdue';
    if (lf.review_date <= SLT.addDays(today, Number((site && site.dueSoonDays) || 90))) return 'due-soon';
    return 'ok';
  };

  /* Search: every word typed must appear somewhere in the leaflet's details. */
  SLT.search = function (leaflets, query, tax) {
    var words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    var asId = SLT.normaliseId(query);
    if (!words.length) return leaflets.slice();
    return leaflets.filter(function (lf) {
      if (asId && lf.id === asId) return true;
      var topic = SLT.topic(tax, lf.topic);
      var hay = [lf.id, lf.id.replace('-', ''), lf.title, lf.summary, lf.keywords, topic.label, topic.patient_label,
        lf.type, lf.format, lf.audience.join(' '), lf.conditions.join(' ')].join(' ').toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
  };

  /* ---------- addresses ---------- */
  // The address printed in QR codes. Comes from data/site.json so it can be changed in one place at migration.
  SLT.publicBase = function (site) {
    var base = (site && site.publicUrl) || '';
    if (!base) base = new URL(ROOT, window.location.href).href;
    return base.replace(/\/*$/, '/');
  };
  SLT.leafletPath = function (id) { return 'l/?id=' + encodeURIComponent(id); };
  SLT.packPath = function (ids) { return 'p/?ids=' + ids.map(encodeURIComponent).join('.'); };
  SLT.publicLeafletUrl = function (site, id) { return SLT.publicBase(site) + SLT.leafletPath(id); };
  SLT.publicPackUrl = function (site, ids) {
    return ids.length === 1 ? SLT.publicLeafletUrl(site, ids[0]) : SLT.publicBase(site) + SLT.packPath(ids);
  };
  SLT.displayHost = function (site) {
    return SLT.publicBase(site).replace(/^https?:\/\//, '').replace(/\/$/, '');
  };

  /* ---------- QR codes (drawn here, no outside service) ---------- */
  SLT.qrSvg = function (text, label) {
    var qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var quiet = 4;
    var size = n + quiet * 2;
    var d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' +
      SLT.esc(label || 'QR code') + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>' +
      '<path d="' + d + '" fill="#000"/></svg>';
  };

  /* ---------- leaflets opened on this device (never sent anywhere) ---------- */
  SLT.recent = {
    get: function () {
      try { return JSON.parse(window.localStorage.getItem(SLT.RECENT_KEY) || '[]'); } catch (e) { return []; }
    },
    add: function (ids) {
      try {
        var list = SLT.recent.get().filter(function (id) { return ids.indexOf(id) === -1; });
        window.localStorage.setItem(SLT.RECENT_KEY, JSON.stringify(ids.concat(list).slice(0, 20)));
      } catch (e) { /* storage blocked: the page still works */ }
    },
    clear: function () { try { window.localStorage.removeItem(SLT.RECENT_KEY); } catch (e) { /* ignore */ } }
  };

  /* ---------- offline ---------- */
  SLT.offlineSupported = function () {
    return 'serviceWorker' in navigator && 'caches' in window &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  };

  SLT.registerServiceWorker = function () {
    if (!SLT.offlineSupported()) return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(SLT.url('sw.js')).catch(function () { /* offline copies just won't be kept */ });
    });
  };

  // Save PDFs into the offline store. Resolves with the number saved.
  SLT.keepOffline = function (urls) {
    if (!SLT.offlineSupported()) return Promise.resolve(0);
    return caches.open(SLT.FILE_CACHE).then(function (cache) {
      return Promise.all(urls.map(function (u) {
        return fetch(u, { cache: 'no-cache' }).then(function (res) {
          if (res.ok && res.status === 200) return cache.put(u, res).then(function () { return 1; });
          return 0;
        }).catch(function () { return 0; });
      }));
    }).then(function (results) { return results.reduce(function (a, b) { return a + b; }, 0); });
  };

  /* ---------- page furniture ---------- */
  SLT.applySite = function (site) {
    var names = document.querySelectorAll('[data-site-name]');
    for (var i = 0; i < names.length; i++) names[i].textContent = site.siteName || names[i].textContent;
    var orgs = document.querySelectorAll('[data-site-org]');
    for (var j = 0; j < orgs.length; j++) orgs[j].textContent = site.organisation || orgs[j].textContent;
    var contact = document.querySelectorAll('[data-site-contact]');
    for (var k = 0; k < contact.length; k++) contact[k].textContent = site.contactText || '';
    var banner = SLT.$('#demo-banner');
    if (banner) banner.hidden = !site.demo;
  };

  SLT.fail = function (target, err) {
    var offline = navigator.onLine === false;
    target.innerHTML =
      '<div class="panel panel--error"><h2>Sorry, this page could not load</h2>' +
      '<p>' + (offline ? 'You seem to be offline. Connect to the internet and try again.'
        : 'Please check your internet connection and try again.') + '</p>' +
      '<button type="button" class="button" onclick="location.reload()">Try again</button></div>';
    if (window.console) console.error(err);
  };

  SLT.registerServiceWorker();
})();
