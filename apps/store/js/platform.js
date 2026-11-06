/* webOS platform bridge (ES5, Chromium 53 safe).
 * On a TV it talks to Luna services through PalmServiceBridge.
 * In a normal browser it falls back to a small demo backend, which is what
 * powers the GitHub Pages preview and local development. */
(function (w) {
  'use strict';
  var P = { isTV: !!w.PalmServiceBridge };

  function call(uri, params, cb) {
    if (!P.isTV) { return demo(uri, params, cb); }
    var b = new w.PalmServiceBridge();
    b.onservicecallback = function (msg) {
      var r;
      try { r = JSON.parse(msg); } catch (e) { r = { returnValue: false, errorText: 'bad response' }; }
      if (cb) { cb(r); }
    };
    b.call(uri, JSON.stringify(params || {}));
  }
  P.call = call;

  P.listApps = function (cb) {
    call('luna://com.webos.applicationManager/listLaunchPoints', {}, function (r) {
      cb(r && r.launchPoints ? r.launchPoints : []);
    });
  };
  P.launch = function (id, cb) {
    call('luna://com.webos.applicationManager/launch', { id: id }, cb);
  };
  P.close = function (id, cb) {
    call('luna://com.webos.applicationManager/close', { id: id }, cb);
  };
  P.foreground = function (cb) {
    call('luna://com.webos.applicationManager/getForegroundAppInfo', {}, function (r) {
      cb(r && (r.appId || (r.foregroundAppInfo && r.foregroundAppInfo[0] && r.foregroundAppInfo[0].appId)) || '');
    });
  };
  /* Root shell through the Homebrew Channel service (only works on a rooted TV). */
  P.exec = function (command, cb) {
    call('luna://org.webosbrew.hbchannel.service/exec', { command: command }, cb);
  };

  /* Safe localStorage */
  P.store = {
    get: function (k, d) {
      try { var v = w.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { w.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- demo backend (browser only) ---------- */
  var DEMO = [
    { id: 'com.webos.app.livetv', title: 'Live TV', bgColor: '#1f6feb' },
    { id: 'com.webos.app.hdmi1', title: 'HDMI 1', bgColor: '#374151' },
    { id: 'com.webos.app.hdmi2', title: 'HDMI 2', bgColor: '#374151' },
    { id: 'com.webos.app.hdmi3', title: 'HDMI 3', bgColor: '#374151' },
    { id: 'com.webos.app.externalinput.av1', title: 'AV', bgColor: '#374151' },
    { id: 'netflix', title: 'Netflix', bgColor: '#b91c1c' },
    { id: 'youtube.leanback.v4', title: 'YouTube', bgColor: '#dc2626' },
    { id: 'amazon', title: 'Prime Video', bgColor: '#0e7490' },
    { id: 'com.webos.app.photovideo', title: 'Photos & Videos', bgColor: '#7c3aed' },
    { id: 'com.webos.app.music', title: 'Music', bgColor: '#be185d' },
    { id: 'com.webos.app.browser', title: 'Web Browser', bgColor: '#047857' },
    { id: 'com.webos.app.screensaver', title: 'Screen Saver', bgColor: '#92400e' },
    { id: 'com.tvhome.store', title: 'App Store', bgColor: '#2563eb' },
    { id: 'com.palm.app.settings', title: 'Settings', bgColor: '#4b5563' }
  ];
  function demo(uri, params, cb) {
    var r = { returnValue: true };
    if (/listLaunchPoints/.test(uri)) { r.launchPoints = DEMO; }
    else if (/getForegroundAppInfo/.test(uri)) { r.appId = 'com.tvhome.launcher'; }
    else if (/launch$/.test(uri) && w.console) { w.console.log('[demo] launch', params.id); }
    if (cb) { w.setTimeout(function () { cb(r); }, 20); }
  }

  w.Platform = P;
}(window));
