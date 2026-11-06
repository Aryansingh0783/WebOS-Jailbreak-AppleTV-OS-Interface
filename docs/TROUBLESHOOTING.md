# Troubleshooting

### Home key still opens LG's home screen after reboot

The autostart chain on webOS 4.x doesn't always run automatically — this is
a known Homebrew Channel issue, not something specific to this project. Open
the **Homebrew Channel** app once after boot; opening it runs the startup
scripts it may have missed. If it keeps happening, check that
`/var/lib/webosbrew/init.d/50-tv-home` and `60-home-key` exist and are
executable:

```sh
ares-novacom -d my-tv --run "ls -la /var/lib/webosbrew/init.d/"
```

### The launcher is slow / the TV lags

These TVs often have well under 1 GB of RAM. Run `debloat/tv-stats.sh` to
see free memory. The launcher closes itself a few seconds after you open
another app specifically to free memory back up — if that's not happening,
check that `Platform.isTV` is true (open the app's dev tools over
`ares-inspect` and check the console) rather than it silently running in
browser/demo mode.

### The App Store can't reach the catalogue

The store fetches `https://repo.webosbrew.org/api/apps.json` directly from
the TV's browser sandbox, which sometimes can't make outbound HTTPS
requests depending on firmware. The store automatically retries through a
root `curl` call in that case — if both fail, check the TV has working
internet (try the TV's own browser or YouTube app).

### SSH / developer mode keeps turning itself off

Also a known webOS 4.x behavior after certain settings changes or power
cycles. Re-enable it in the Homebrew Channel app each time, or see the
[webosbrew FAQ](https://www.webosbrew.org/) for persistent-SSH workarounds.

### The TV freezes or shows a black screen after installing

1. Don't press Home — if a boot script is misbehaving, Home may relaunch
   the same thing. Press Input or Live TV instead.
2. Unplug the TV for 60 seconds and power it back on.
3. If it's still stuck, the Homebrew Channel has a **failsafe mode**: if the
   TV loses power while its startup scripts are still running, the next
   boot skips all of them automatically and briefly opens a root telnet
   shell (no password) so you can fix things. See the
   [webosbrew startup-script guide](https://www.webosbrew.org/develop/guides/startup-script/)
   for exact timing — it clears itself after ~15 seconds, so you need a
   script polling port 23 ready before you trigger it.
4. As a last resort, `scripts/uninstall.sh` removes everything this project
   added; a factory reset (Settings → General → Reset to Initial Settings)
   removes it too, along with all other installed apps.

### Visual glitching, color banding, or flickering on every input

That's a hardware symptom (panel driver or T-con connection), not something
any app on the TV can cause, including this one. If the same artifact shows
up with the TV on an HDMI input and no apps running, it's not software —
get the panel looked at.
