"""Verify every STATIC_ASSETS entry resolves 200 on a base URL.

Usage: python scripts/verify-precache.py <base-url>
Example: python scripts/verify-precache.py https://pyknowledge.onrender.com
"""
import re
import sys
import urllib.request


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/verify-precache.py <base-url>")
        return 2

    base = sys.argv[1].rstrip('/')
    try:
        sw = open('service-worker.js').read()
    except OSError as exc:
        print(f"Cannot read service-worker.js: {exc}")
        return 2

    block = re.search(r'STATIC_ASSETS = \[([\s\S]*?)\]', sw)
    if not block:
        print("Could not parse STATIC_ASSETS from service-worker.js")
        return 2

    assets = re.findall(r"['\"]([^'\"]+)['\"]", block.group(1))

    fails, ok = [], 0
    for a in assets:
        path = '/' if a == '/' else a
        try:
            req = urllib.request.Request(base + path, method='GET')
            resp = urllib.request.urlopen(req, timeout=20)
            if resp.status == 200:
                ok += 1
            else:
                fails.append((a, resp.status))
        except Exception as exc:  # noqa: BLE001 - audit tool reports any failure
            fails.append((a, str(exc)))

    print(f"{base}: {ok}/{len(assets)} cached-asset URLs return 200")
    for f in fails:
        print("FAIL:", f)
    print("ALL OK" if not fails else "BROKEN ASSETS FOUND")
    return 0 if not fails else 1


if __name__ == '__main__':
    sys.exit(main())
