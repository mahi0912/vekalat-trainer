#!/usr/bin/env python3
"""
جایگزینی placeholder در site/auth-config.js با هش پسورد.

پسورد از متغیر محیطی WEBAPP_PASSWORD خوانده می‌شود (در CI از GitHub Secret).
الگوریتم دقیقاً همان چیزی است که gate.js در مرورگر اجرا می‌کند:
PBKDF2-HMAC-SHA256، ۱۵۰۰۰۰ تکرار، خروجی ۲۵۶ بیت، به شکل hex.

⚠️ این دروازه امنیت واقعی نیست — توضیح کامل در بالای site/gate.js.
"""
from __future__ import annotations

import hashlib
import os
import re
import sys
from pathlib import Path

ITERATIONS = 150_000
CONFIG = Path(__file__).resolve().parent.parent / "site" / "auth-config.js"


def main() -> int:
    password = os.environ.get("WEBAPP_PASSWORD", "")
    if not password:
        print("::error::متغیر WEBAPP_PASSWORD تنظیم نشده است. "
              "سکرت WEBAPP_PASSWORD را در Settings → Secrets → Actions اضافه کنید.")
        return 1

    src = CONFIG.read_text(encoding="utf-8")

    m = re.search(r"salt:\s*'([^']*)'", src)
    if not m:
        print("::error::salt در auth-config.js پیدا نشد")
        return 1
    salt = m.group(1)

    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS, dklen=32
    ).hex()

    if "__GATE_HASH__" not in src:
        print("::error::placeholder __GATE_HASH__ در auth-config.js پیدا نشد")
        return 1

    CONFIG.write_text(src.replace("__GATE_HASH__", digest), encoding="utf-8")
    print(f"دروازه ورود فعال شد (طول هش: {len(digest)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
