# How this works

### Why it looks the way it does

webOS 4.x ships a Chromium ~53 web runtime: no CSS Grid, no
`backdrop-filter`, no `async`/`await`, and these TVs commonly have well
under 1 GB of RAM. Both apps are written in plain ES5, animate only
`transform` and `opacity` (the two properties a weak GPU can composite
without triggering layout), and avoid big DOM trees. There's no build step
and no framework — it's deliberately simple so it stays fast on old
hardware and easy to read.

### The launcher (`apps/home`)

- `js/platform.js` wraps the Luna service bridge (`PalmServiceBridge`) and
  falls back to a small mock backend when opened in a normal browser, so
  the whole UI can be previewed and developed without a TV.
- `js/app.js` reads the installed-app list via
  `luna://com.webos.applicationManager/listLaunchPoints`, groups it into
  Favorites / Apps / Inputs, and renders rows the remote's d-pad can move
  through. Pin (green) and hide (yellow) are stored in `localStorage` and
  applied to the list the next time apps are read.
- After launching another app, the launcher checks in after 3.5s whether
  it's still in the foreground, and if not, closes itself — these TVs don't
  have the RAM to keep multiple webapp runtimes alive at once.

### The store (`apps/store`)

- Reads the public catalogue at `repo.webosbrew.org/api/apps.json` (an open
  community listing maintained by the webosbrew project, not by this repo).
  If the TV's web sandbox can't make the HTTPS request directly, it retries
  through a root `curl` call via the Homebrew Channel's exec service.
- Installs apps via `luna://com.webos.appInstallService/dev/install`, after
  downloading the `.ipk` and checking its sha256 against the catalogue's
  published hash.
- This app store does **not** include apps like Netflix, Prime Video, or
  other official/DRM-licensed streaming apps — those come from LG's own
  Content Store, are tied to LG's app-signing and device certification, and
  aren't something a third-party store can legitimately distribute. Use
  LG's Content Store for those; use this store for the open-source/homebrew
  catalogue.

### Root and boot scripts (`autostart/`)

- `50-tv-home` is a Homebrew Channel startup script (see
  [their docs](https://www.webosbrew.org/develop/guides/startup-script/))
  that launches the custom launcher ~30s after boot, but only if the TV
  landed on live TV / the stock launcher / nothing — it never steals focus
  from an app you already opened.
- `60-home-key` starts `homekey.py`, a small Python 2 daemon (matching the
  interpreter on these TVs) that reads raw input events from
  `/dev/input/event*` and relaunches the custom launcher when it sees the
  remote's Home key — LG's own launcher is baked into the system layer and
  can't be replaced or disabled outright, so this redirects the key instead
  of removing LG's.

### Debloat kit (`debloat/`)

`debloat.sh` removes the app IDs listed in `apps-removable.txt` via the
same `dev/remove` Luna call the store uses, and never touches anything
under `com.webos.*`, `com.palm.*`, or the Homebrew Channel. `tv-stats.sh`
reports RAM/CPU/storage before and after so you can see the effect.
