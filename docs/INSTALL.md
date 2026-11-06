# Installing

## 0. Prerequisites

- A rooted LG webOS TV with the [Homebrew Channel](https://www.webosbrew.org/)
  installed (see [ROOTING.md](ROOTING.md) if you haven't done this yet).
- A PC on the same network as the TV, with:
  - [Node.js](https://nodejs.org/) 18+
  - The webOS CLI: `npm install -g @webosose/ares-cli`

## 1. Register the TV

Enable developer mode / SSH on the TV (toggle in the Homebrew Channel app),
note its IP address (Settings → Network → Wi-Fi/Wired → your connection),
then:

```sh
ares-setup-device --add my-tv --info '{"host":"<tv-ip>","port":"9922","username":"prisoner"}'
```

Confirm it connects:

```sh
ares-novacom -d my-tv --run "echo ok"
```

If that fails, check the IP and that developer/SSH mode is still on — it's
usually a toggle in Homebrew Channel's settings that reset itself after a
reboot (a known webOS 4.x quirk).

## 2. Build and install

```sh
git clone https://github.com/<you>/webos-tv-home.git
cd webos-tv-home
./scripts/install.sh my-tv
```

This packages both apps, installs them, copies the boot scripts and the
Home-key watcher, and tells you to reboot the TV once at the end.

## 3. Reboot and check

```sh
ares-novacom -d my-tv --run reboot
```

After the TV comes back, the Home key should open this launcher. If it
opens LG's own home screen instead, the boot scripts didn't take — see
[TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 4. Optional: debloat

```sh
./debloat/debloat.sh my-tv --dry-run   # see what would be removed
./debloat/debloat.sh my-tv             # actually remove it
./debloat/tv-stats.sh my-tv            # RAM / storage before & after
```

Edit `debloat/apps-removable.txt` first if you want to keep any of the
listed apps. Core system apps are never touched.

## Uninstalling

```sh
./scripts/uninstall.sh my-tv
```

Removes the launcher, the store and the boot scripts. Your TV goes back to
LG's own home screen on the next boot. This does not remove the Homebrew
Channel or un-root the TV.
