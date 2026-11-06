# Rooting your LG webOS TV

This project does not root your TV itself. Rooting means exploiting a bug in
LG's software to get a root shell, and that exploit work is done and
maintained by the webOS homebrew community, not by this repo. Use their
tool:

- **[RootMyTV](https://github.com/RootMyTV/RootMyTV.github.io)** — the
  current, actively maintained rooting tool for webOS TVs (webOS 4.x–6.x,
  depending on model and firmware). Follow the steps on that page exactly;
  it runs from a USB drive and a browser on your TV, no PC software needed
  for the exploit step itself.
- **[webosbrew.org](https://www.webosbrew.org/)** — the project behind the
  Homebrew Channel, the app store you'll end up with after rooting. Its
  [device compatibility list](https://www.webosbrew.org/devices/) and
  [rooting guide](https://www.webosbrew.org/rooting/) are the source of
  truth for "will this work on my TV".

**Before you start:**

1. Find your TV's exact model number and current firmware version
   (Settings → All Settings → General → About This TV).
2. Run `scripts/check-compat.sh` in this repo (or check the webosbrew device
   list linked above) to see whether that model/firmware combination is
   known to work. Rooting exploits are firmware-specific — a method that
   roots one firmware version usually does nothing, or just fails safely, on
   a newer one.
3. **Do not let the TV auto-update** while you're working on this. Turn off
   automatic software updates in Settings first. A firmware update can patch
   the very bug the root method relies on, sometimes permanently.
4. Rooting is reversible in the sense that LG's own factory reset removes
   the apps and most traces, but it does not "un-root" a TV that has gotten
   a persistent root — and a bad flash or interrupted update can brick a
   TV. Don't attempt this on a TV you can't afford to lose, and don't open
   the TV's casing — the capacitors inside hold dangerous voltage even
   unplugged.

**After rooting**, install the [Homebrew Channel](https://www.webosbrew.org/),
then come back here — `scripts/install.sh` installs this launcher, the app
store and the debloat kit in one pass.
