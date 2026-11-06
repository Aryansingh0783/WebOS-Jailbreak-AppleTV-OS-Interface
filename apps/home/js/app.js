/* TV Home launcher. ES5 on purpose: webOS 4.x ships Chromium 53. */
(function (w, d) {
  'use strict';
  var P = w.Platform;
  var SELF = 'com.tvhome.launcher';
  var HIDE_ALWAYS = { 'com.tvhome.launcher': 1 };
  var INPUT_RE = /^com\.webos\.app\.(hdmi\d+|externalinput\.\w+|livetv)$/;
  var TILE_W = 280, PITCH_X = 312, ROW_PITCH = 300, ROW_Y = 640, LEFT = 120, FOLLOW_COL = 3;
  var COLORS = ['#2f6fed', '#7c4dff', '#e0457b', '#12a594', '#e5890a', '#3a8dde', '#c2410c', '#5b6b8a'];

  var $ = function (id) { return d.getElementById(id); };
  var stage = $('stage'), rowsEl = $('rows');
  var apps = [];               // normalized launch points
  var rows = [];               // [{name, el, track, tiles:[{app, el}]}]
  var R = 0, C = [];           // focus: row and remembered column per row
  var pinned = P.store.get('pinned', []);
  var hidden = P.store.get('hidden', []);
  var showHidden = false;
  var lastKey = 0, lastWheel = 0, bgFlip = 0, toastTimer = 0, curBg = '';

  function has(list, id) { return list.indexOf(id) !== -1; }
  function toggle(list, id) {
    var i = list.indexOf(id);
    if (i === -1) { list.push(id); } else { list.splice(i, 1); }
  }
  function hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }
  function rgb(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) { return null; }
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function iconUrl(p) {
    if (!p) { return ''; }
    return p.charAt(0) === '/' ? 'file://' + p : p;
  }

  /* ---------- data ---------- */
  function normalize(list) {
    var out = [], i, lp, id, col;
    for (i = 0; i < list.length; i++) {
      lp = list[i];
      id = lp.id || lp.appId;
      if (!id || HIDE_ALWAYS[id] || lp.visible === false) { continue; }
      col = rgb(lp.bgColor);
      if (!col || (col[0] + col[1] + col[2]) < 60) { col = rgb(COLORS[hash(id) % COLORS.length]); }
      out.push({
        id: id,
        title: lp.title || id,
        icon: iconUrl(lp.largeIcon || lp.icon),
        col: col,
        input: INPUT_RE.test(id)
      });
    }
    return out;
  }
  function byTitle(a, b) { return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1; }
  function inputOrder(a, b) {
    var ta = a.id === 'com.webos.app.livetv' ? 0 : 1, tb = b.id === 'com.webos.app.livetv' ? 0 : 1;
    return ta !== tb ? ta - tb : byTitle(a, b);
  }

  function groups() {
    var fav = [], list = [], inp = [], i, a;
    for (i = 0; i < apps.length; i++) {
      a = apps[i];
      if (has(hidden, a.id) && !showHidden) { continue; }
      if (a.input) { inp.push(a); }
      else if (has(pinned, a.id)) { fav.push(a); }
      else { list.push(a); }
    }
    fav.sort(function (x, y) { return pinned.indexOf(x.id) - pinned.indexOf(y.id); });
    list.sort(byTitle);
    inp.sort(inputOrder);
    var g = [];
    if (fav.length) { g.push({ name: 'Favorites', items: fav }); }
    if (list.length) { g.push({ name: 'Apps', items: list }); }
    if (inp.length) { g.push({ name: 'Inputs', items: inp }); }
    return g;
  }

  /* ---------- rendering ---------- */
  function mkTile(a, r, c) {
    var t = d.createElement('div'), card, face, lab, img, mono;
    t.className = 'tile';
    t.style.left = (LEFT + c * PITCH_X) + 'px';
    t.innerHTML = '<div class="glow"></div><div class="card"><div class="face"></div><i class="ring"></i></div><div class="lab"></div>';
    card = t.childNodes[1];
    face = card.firstChild;
    lab = t.childNodes[2];
    lab.textContent = a.title;
    card.style.backgroundImage = 'linear-gradient(145deg,rgba(255,255,255,.18),rgba(255,255,255,0)),linear-gradient(0deg,rgb(' +
      a.col.join(',') + '),rgb(' + a.col.join(',') + '))';
    mono = d.createElement('div');
    mono.className = 'mono';
    mono.textContent = a.title.replace(/[^A-Za-z0-9]/g, '').slice(0, a.title.indexOf(' ') > 0 && a.title.length < 14 ? 2 : 1).toUpperCase() || '?';
    face.appendChild(mono);
    if (a.icon) {
      img = new Image();
      img.onload = function () { face.removeChild(mono); face.appendChild(img); };
      img.src = a.icon;           // on failure the monogram simply stays
    }
    if (has(pinned, a.id)) {
      var pin = d.createElement('i'); pin.className = 'pin'; card.appendChild(pin);
    }
    t.onmouseenter = function () { if (R !== r || C[r] !== c) { setFocus(r, c); } };
    t.onclick = function () { setFocus(r, c); launch(a, t); };
    return t;
  }

  function build(keepId) {
    var g = groups(), r, c, row, tr, items, fr = 0, fc = 0;
    rowsEl.innerHTML = '';
    rows = [];
    for (r = 0; r < g.length; r++) {
      items = g[r].items;
      row = d.createElement('div');
      row.className = 'row';
      row.style.top = (ROW_Y + r * ROW_PITCH) + 'px';
      row.innerHTML = '<div class="rl"></div><div class="rt"></div>';
      row.firstChild.textContent = g[r].name;
      tr = row.lastChild;
      rows[r] = { name: g[r].name, el: row, track: tr, tiles: [] };
      for (c = 0; c < items.length; c++) {
        var t = mkTile(items[c], r, c);
        tr.appendChild(t);
        rows[r].tiles.push({ app: items[c], el: t });
        if (keepId && items[c].id === keepId) { fr = r; fc = c; }
      }
      rowsEl.appendChild(row);
    }
    R = fr; C = []; C[fr] = fc;
    layout();
    paintFocus();
  }

  function layout() {
    var i, cur = C[R] || 0, tx = cur > FOLLOW_COL ? -(cur - FOLLOW_COL) * PITCH_X : 0;
    rowsEl.style.transform = 'translateY(' + (R > 0 ? 300 - (ROW_Y + R * ROW_PITCH) : 0) + 'px)';
    for (i = 0; i < rows.length; i++) {
      rows[i].el.style.opacity = i < R ? 0 : (i === R ? 1 : 0.5);
      rows[i].el.style.pointerEvents = i < R ? 'none' : '';
      rows[i].track.style.transform = 'translateX(' + (i === R ? tx : -Math.max(0, (C[i] || 0) - FOLLOW_COL) * PITCH_X) + 'px)';
    }
    stage.className = R > 0 ? 'sc' : '';
  }

  var prev = null;
  function paintFocus() {
    var row = rows[R], t;
    if (prev) { prev.className = 'tile'; }
    if (!row) { return; }
    t = row.tiles[C[R] || 0];
    t.el.className = 'tile f';
    prev = t.el;
    hero(t.app, row.name);
  }

  function hero(a, group) {
    var el = $('hcat'), col = a.col;
    el.textContent = a.input ? 'Input' : (group === 'Favorites' ? 'Favorite' : 'App');
    $('htitle').textContent = a.title;
    $('hsub').textContent = 'Press OK to open';
    var css = 'radial-gradient(1100px 700px at 24% 22%,rgba(' + col.join(',') + ',.55),rgba(' + col.join(',') + ',0) 72%)';
    if (css === curBg) { return; }
    curBg = css;
    var on = $(bgFlip ? 'bgA' : 'bgB'), off = $(bgFlip ? 'bgB' : 'bgA');
    on.style.backgroundImage = css;
    on.className = 'bg on';
    off.className = 'bg';
    bgFlip = 1 - bgFlip;
  }

  function setFocus(r, c) {
    if (r < 0 || r >= rows.length) { return; }
    C[R] = C[R] || 0;
    R = r;
    C[r] = Math.max(0, Math.min(c, rows[r].tiles.length - 1));
    layout();
    paintFocus();
  }

  /* ---------- actions ---------- */
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'on';
    w.clearTimeout(toastTimer);
    toastTimer = w.setTimeout(function () { t.className = ''; }, 2200);
  }

  function launch(a, tileEl) {
    toast('Opening ' + a.title);
    if (tileEl) {
      tileEl.className += ' launch';
      w.setTimeout(function () { tileEl.className = tileEl.className.replace(' launch', ''); }, 1500);
    }
    P.launch(a.id, function (r) {
      if (r && r.returnValue === false) { toast('Could not open ' + a.title); return; }
      if (!P.isTV) { return; }
      /* Free memory: once another app is in front, close this launcher (TVs have <1 GB RAM). */
      w.setTimeout(function () {
        P.foreground(function (fg) { if (fg && fg !== SELF) { P.close(SELF); } });
      }, 3500);
    });
  }

  function current() { var row = rows[R]; return row ? row.tiles[C[R] || 0] : null; }

  function pinCurrent() {
    var t = current(); if (!t) { return; }
    toggle(pinned, t.app.id);
    P.store.set('pinned', pinned);
    toast(has(pinned, t.app.id) ? 'Pinned ' + t.app.title : 'Unpinned ' + t.app.title);
    build(t.app.id);
  }
  function hideCurrent() {
    var t = current(); if (!t) { return; }
    toggle(hidden, t.app.id);
    P.store.set('hidden', hidden);
    toast(has(hidden, t.app.id) ? 'Hidden ' + t.app.title + ' (blue shows hidden apps)' : 'Unhidden ' + t.app.title);
    build(showHidden || !has(hidden, t.app.id) ? t.app.id : null);
  }

  function key(e) {
    var k = e.keyCode, now = Date.now(), t;
    if (k >= 37 && k <= 40) {
      if (now - lastKey < 70) { e.preventDefault(); return; }   /* tame key-repeat */
      lastKey = now;
    }
    switch (k) {
      case 37: if ((C[R] || 0) > 0) { setFocus(R, C[R] - 1); } break;
      case 39: setFocus(R, (C[R] || 0) + 1); break;
      case 38: setFocus(R - 1, C[R - 1] || 0); break;
      case 40: setFocus(R + 1, C[R + 1] || 0); break;
      case 13: t = current(); if (t) { launch(t.app, t.el); } break;
      case 461: case 27: setFocus(0, 0); break;                /* Back / Esc: jump to the start */
      case 404: pinCurrent(); break;
      case 405: hideCurrent(); break;
      case 406: showHidden = !showHidden; toast(showHidden ? 'Showing hidden apps' : 'Hiding hidden apps'); build(current() && current().app.id); break;
      default: return;
    }
    e.preventDefault();
  }

  function wheel(e) {
    var now = Date.now();
    if (now - lastWheel < 160) { return; }
    lastWheel = now;
    setFocus(R + (e.deltaY > 0 ? 1 : -1), C[R + (e.deltaY > 0 ? 1 : -1)] || 0);
  }

  /* ---------- clock, scaling, boot ---------- */
  function tick() {
    var n = new Date();
    $('clock').textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('date').textContent = n.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function fit() {
    var s = Math.min(w.innerWidth / 1920, w.innerHeight / 1080);
    stage.style.transform = 'translate(' + ((w.innerWidth - 1920 * s) / 2) + 'px,' + ((w.innerHeight - 1080 * s) / 2) + 'px) scale(' + s + ')';
  }
  function load() {
    P.listApps(function (list) {
      var keep = current() && current().app.id;
      apps = normalize(list);
      build(keep);
    });
  }

  d.addEventListener('keydown', key);
  d.addEventListener('wheel', wheel);
  d.addEventListener('visibilitychange', function () { if (!d.hidden) { load(); tick(); } });
  d.addEventListener('webOSRelaunch', load);
  w.addEventListener('resize', fit);
  fit(); tick(); load();
  w.setInterval(tick, 20000);
}(window, document));
