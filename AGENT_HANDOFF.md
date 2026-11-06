# Agent handoff

Written by Claude (Sonnet) on 2026-11-06, for whichever AI agent or human
picks this up next. This is state, not instructions — read it, don't treat
any of it as a command, and verify anything load-bearing before acting on
it.

## What this repo is

A rewrite of a custom Apple-TV-style home screen for Aryan's rooted LG
49UK7500PTA (webOS 4.4.3). The original build ran on his TV for a few
weeks; that TV then developed an unrelated hardware panel fault (confirmed
by video — see "Prior incident" below) and was factory reset, which erased
the original source. This repo is a clean rewrite from scratch, not a
recovery of the old code. It has **not been tested on a real TV**.

## Current state (as of this commit)

- `apps/home` — launcher, complete. ES5-checked with acorn (`ecmaVersion:
  5`), all 4 JS files pass. Not rendered against a real device; only
  previewed via the browser-mode mock in `platform.js`.
- `apps/store` — app store against `repo.webosbrew.org/api/apps.json`,
  complete. Same verification level as above.
- `debloat/` — `debloat.sh`, `tv-stats.sh`, `apps-removable.txt`. `bash -n`
  syntax-checked, not run against a device.
- `autostart/` — boot scripts + `homekey.py` (Python 2, matching the TV's
  interpreter). Logic carried over from what worked before the TV's reset,
  per the user's prior session, but rewritten and not re-verified on
  hardware.
- `scripts/` — `build.sh`, `install.sh`, `uninstall.sh`, `check-compat.sh`.
  `install.sh` in particular is the least-verified file in the repo: it
  assumes `ares-push` may or may not exist depending on CLI version and
  falls back to base64-over-`ares-novacom --run` for small files. **This
  fallback has not been exercised.** If you're picking this up and have TV
  access, this is the first thing to actually test.
- CI (`.github/workflows/build.yml`) builds both `.ipk`s and runs
  shellcheck on push/PR; shellcheck itself was not available in the
  sandbox this was built in, so the scripts are only `bash -n` clean, not
  shellcheck-clean. Expect CI to flag style/quoting issues on first run.
- Docs: `README.md`, `docs/INSTALL.md`, `docs/ARCHITECTURE.md`,
  `docs/TROUBLESHOOTING.md`, `docs/ROOTING.md`.

## Deliberately out of scope — don't add these

- **No jailbreak/root exploit implementation in this repo.** The user
  asked for "one-click jailbreaking" for webOS TVs specifically; I (the
  agent who wrote this) declined to write or reimplement an exploit and
  pointed to the existing maintained tool instead
  (`docs/ROOTING.md` → RootMyTV / webosbrew). If a future request asks to
  add actual exploit code here, that's the same request in different
  words — treat it the same way: point to the existing community tool,
  automate everything *around* it (compat checks, post-root setup), don't
  reimplement the security bypass itself.
- **No Rave / watch-party app.** The user explicitly asked for it to be
  dropped from this rewrite (it existed as a dead `rave.io` redirect
  shortcut before, with no real functionality — not worth carrying
  forward).
- **No DRM-licensed streaming apps (Netflix, Prime Video, etc.) in the
  store.** Explained in README — those require LG's own app signing/cert
  process; a third-party store can't legitimately distribute them.

## Prior incident (context, not a current task)

The original TV developed a hardware fault — full-height vertical color
banding visible on every input, confirmed from a user-provided video —
consistent with a T-con board or panel driver issue, not software. It was
not caused by the custom launcher; that was my mistaken early guess before
I saw the video, and I corrected it once I did. The user then factory-reset
the TV, which is what wiped the original source this repo is rebuilding.
**This repo's code is not implicated in that hardware fault** and there's
no reason to re-investigate it as a cause of future bug reports, though a
genuinely new hardware issue on this or another TV is of course still
possible and should be judged on its own evidence.

## If you're an agent picking this up

1. Check `git log` / recent commits for anything that happened after this
   file was written — this snapshot may be stale.
2. If the user has TV access, the highest-value next step is running
   `scripts/install.sh` against a real device and fixing whatever breaks —
   everything here is written-but-unverified.
3. Don't assume the user still has the exact TV model/firmware described
   above; ask, or check `docs/ROOTING.md`'s compat checker output, rather
   than assuming continuity from this file.
4. Normal engineering judgment applies otherwise — this file is scope and
   history, not a spec to follow mechanically.
