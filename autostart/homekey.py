#!/usr/bin/env python2
"""Watches the Magic Remote's input devices for the Home key and relaunches
com.tvhome.launcher when it's pressed, so the Home button opens this
launcher instead of LG's own home screen. Root-only; python2, matching the
interpreter on webOS 4.x TVs. See docs/ARCHITECTURE.md for why this exists.
"""
import glob
import os
import struct
import subprocess
import time

EVENT_FORMAT = "iiHHi"
EVENT_SIZE = struct.calcsize(EVENT_FORMAT)
HOME_CODES = (0x4ae, 102)   # KEY_HOMEPAGE, and the plain "Home" code seen on some remotes
EV_KEY = 1
KEY_DOWN = 1
LAUNCH_ID = "com.tvhome.launcher"
COOLDOWN_SEC = 1.5


def launch():
    cmd = [
        "luna-send", "-n", "1",
        "-f", "luna://com.webos.applicationManager/launch",
        '{"id":"%s"}' % LAUNCH_ID,
    ]
    try:
        subprocess.call(cmd)
    except OSError:
        pass


def watch_device(path, last_fire):
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
    except OSError:
        return last_fire
    try:
        while True:
            try:
                data = os.read(fd, EVENT_SIZE)
            except OSError:
                break
            if len(data) < EVENT_SIZE:
                break
            _, _, ev_type, code, value = struct.unpack(EVENT_FORMAT, data)
            if ev_type == EV_KEY and value == KEY_DOWN and code in HOME_CODES:
                now = time.time()
                if now - last_fire > COOLDOWN_SEC:
                    launch()
                    last_fire = now
    finally:
        os.close(fd)
    return last_fire


def main():
    last_fire = 0
    while True:
        for path in glob.glob("/dev/input/event*"):
            last_fire = watch_device(path, last_fire)
        time.sleep(0.05)


if __name__ == "__main__":
    main()
