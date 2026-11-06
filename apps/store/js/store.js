/* Community App Store — browses repo.webosbrew.org's catalogue and installs
 * ipks through the Homebrew Channel's dev install service. ES5 only. */
(function (w, d) {
  'use strict';
  var P = w.Platform;
  var CATALOG_URL = 'https://repo.webosbrew.org/api/apps.json';
  var COLS = 4, CARD_W = 414, CARD_H = 234, ROWS_VISIBLE = 3;

  var $ = function (id) { return d.getElementById(id); };
  var grid = $('grid'), detail = $('detail'), statusEl = $('status');
  var apps = [], idx = 0, mode = 'grid', installed = {};

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.className = 'on';
    w.setTimeout(function () { t.className = ''; }, 2200);
  }

  function xhrJSON(url, cb) {
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.timeout = 15000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) { return; }
      if (x.status >= 200 && x.status < 300) {
        try { cb(null, JSON.parse(x.responseText)); } catch (e) { cb(e); }
      } else { cb(new Error('HTTP ' + x.status)); }
    };
    x.onerror = function () { cb(new Error('network error')); };
    x.ontimeout = function () { cb(new Error('timed out')); };
    x.send();
  }

  /* On a rooted TV without working outbound HTTPS from the webapp sandbox,
   * fall back to curl through the root exec bridge. */
  function fetchCatalog(cb) {
    xhrJSON(CATALOG_URL, function (err, data) {
      if (!err) { return cb(null, data); }
      if (!P.isTV) { return cb(err); }
      statusEl.textContent = 'Retrying via root shell…';
      P.exec('curl -fsSL --max-time 15 ' + CATALOG_URL, function (r) {
        if (!r || !r.returnValue || !r.stdout) { return cb(err); }
        try { cb(null, JSON.parse(r.stdout)); } catch (e2) { cb(e2); }
      });
    });
  }

  function refreshInstalled(cb) {
    P.listApps(function (list) {
      installed = {};
      var i;
      for (i = 0; i < list.length; i++) { installed[list[i].id || list[i].appId] = true; }
      if (cb) { cb(); }
    });
  }

  function load() {
    statusEl.textContent = 'Loading catalogue…';
    fetchCatalog(function (err, data) {
      if (err) {
        statusEl.textContent = 'Could not reach repo.webosbrew.org (' + err.message + ')';
        toast('Check the TV’s network connection');
        return;
      }
      apps = (data.packages || []).map(function (p) {
        return {
          id: p.id,
          title: p.title,
          desc: p.shortDescription || (p.manifest && p.manifest.appDescription) || '',
          icon: p.iconUri,
          ipkUrl: p.manifest && p.manifest.ipkUrl,
          sha256: p.manifest && p.manifest.ipkHash && p.manifest.ipkHash.sha256,
          size: p.manifest && p.manifest.ipkSize,
          version: p.manifest && p.manifest.version,
          root: !!(p.manifest && p.manifest.rootRequired)
        };
      }).sort(function (a, b) { return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1; });
      refreshInstalled(function () {
        statusEl.textContent = apps.length + ' apps';
        renderGrid();
      });
    });
  }

  function renderGrid() {
    grid.innerHTML = '';
    var i, a, card, row, col;
    for (i = 0; i < apps.length; i++) {
      a = apps[i];
      row = Math.floor(i / COLS); col = i % COLS;
      card = d.createElement('div');
      card.className = 'card';
      card.style.left = (col * CARD_W) + 'px';
      card.style.top = (row * CARD_H) + 'px';
      card.innerHTML = '<div class="ic"></div><div class="nm"></div><div class="desc"></div>' +
        '<div class="badge' + (a.root ? ' root' : '') + '"></div><div class="state"></div>';
      card.childNodes[1].textContent = a.title;
      card.childNodes[2].textContent = a.desc;
      card.childNodes[3].textContent = a.root ? 'Needs root' : 'No root needed';
      if (a.icon) { card.firstChild.style.backgroundImage = 'url(' + a.icon + ')'; }
      if (installed[a.id]) { card.childNodes[4].textContent = 'Installed'; card.childNodes[4].className = 'state installed'; }
      (function (n) { card.onclick = function () { idx = n; openDetail(); }; })(i);
      grid.appendChild(card);
    }
    position();
  }

  function position() {
    var row = Math.floor(idx / COLS);
    var top = Math.max(0, (row - 1)) * -CARD_H;
    grid.style.transform = 'translateY(' + top + 'px)';
    var cards = grid.childNodes, i;
    for (i = 0; i < cards.length; i++) { cards[i].className = cards[i].className.replace(' f', ''); }
    if (cards[idx]) { cards[idx].className += ' f'; }
  }

  /* ---------- detail / install ---------- */
  function openDetail() {
    var a = apps[idx];
    mode = 'detail';
    detail.className = 'on';
    $('dtitle').textContent = a.title;
    $('ddesc').textContent = a.desc;
    $('dmeta').textContent = 'Version ' + (a.version || '?') + (a.size ? '  ·  ' + Math.round(a.size / 1024) + ' KB' : '') +
      (a.root ? '  ·  requires root' : '');
    $('dlog').textContent = installed[a.id]
      ? 'Already installed.\nOK: open app.\nYellow: remove.'
      : 'OK: install.' + (a.root && !P.isTV ? '\n(Preview mode — install is disabled in the browser.)' : '');
    $('dprog').style.display = 'none';
  }
  function closeDetail() { mode = 'grid'; detail.className = ''; position(); }

  function log(line) { var el = $('dlog'); el.textContent += '\n' + line; el.scrollTop = el.scrollHeight; }
  function progress(pct) { var p = $('dprog'); p.style.display = 'block'; p.firstChild.style.width = pct + '%'; }

  function install(a) {
    if (!a.ipkUrl) { log('No download URL for this app.'); return; }
    if (!P.isTV) { log('Preview mode: nothing to install in a browser.'); return; }
    log('Downloading ' + a.ipkUrl);
    progress(5);
    var dest = '/media/developer/temp/' + a.id + '.ipk';
    var cmd = 'curl -fL --max-time 120 -o ' + dest + ' "' + a.ipkUrl + '"' +
      (a.sha256 ? ' && echo "' + a.sha256 + '  ' + dest + '" | sha256sum -c -' : '') +
      ' && echo DL_OK || echo DL_FAIL';
    P.exec(cmd, function (r) {
      var out = (r && (r.stdout || r.stdoutString)) || '';
      if (!/DL_OK/.test(out)) { log('Download or checksum failed.'); log(out); return; }
      progress(55);
      log('Installing…');
      P.call('luna://com.webos.appInstallService/dev/install',
        { id: a.id, ipkUrl: dest, subscribe: true },
        function (ir) {
          if (!ir) { return; }
          if (ir.statusValue >= 30 || /success/i.test(ir.status || '')) {
            progress(100);
            log('Installed ' + a.title + '.');
            installed[a.id] = true;
            renderGrid();
          } else if (ir.returnValue === false) {
            log('Install failed: ' + (ir.errorText || 'unknown error'));
          } else if (ir.statusValue) {
            progress(55 + Math.min(40, ir.statusValue));
          }
        });
    });
  }

  function remove(a) {
    P.call('luna://com.webos.appInstallService/dev/remove', { id: a.id, subscribe: true }, function (r) {
      if (r && r.returnValue !== false) {
        log('Removed ' + a.title + '.');
        delete installed[a.id];
        renderGrid();
      } else {
        log('Remove failed.');
      }
    });
  }

  function key(e) {
    var k = e.keyCode, a = apps[idx];
    if (mode === 'grid') {
      switch (k) {
        case 37: if (idx % COLS > 0) { idx--; position(); } break;
        case 39: if (idx % COLS < COLS - 1 && idx + 1 < apps.length) { idx++; position(); } break;
        case 38: if (idx - COLS >= 0) { idx -= COLS; position(); } break;
        case 40: if (idx + COLS < apps.length) { idx += COLS; position(); } break;
        case 13: openDetail(); break;
        case 461: case 27: P.launch('com.tvhome.launcher'); break;
        default: return;
      }
    } else {
      switch (k) {
        case 13:
          if (installed[a.id]) { P.launch(a.id); } else { install(a); }
          break;
        case 405: if (installed[a.id]) { remove(a); } break;
        case 461: case 27: closeDetail(); break;
        default: return;
      }
    }
    e.preventDefault();
  }

  function fit() {
    var s = Math.min(w.innerWidth / 1920, w.innerHeight / 1080);
    $('stage').style.transform = 'translate(' + ((w.innerWidth - 1920 * s) / 2) + 'px,' + ((w.innerHeight - 1080 * s) / 2) + 'px) scale(' + s + ')';
  }

  d.addEventListener('keydown', key);
  w.addEventListener('resize', fit);
  fit(); load();
}(window, document));
