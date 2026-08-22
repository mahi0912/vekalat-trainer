#!/usr/bin/env python3
"""
اعتبارسنجی سایت پیش از انتشار روی GitHub Pages.

بررسی می‌کند:
  ۱. فایل‌های اصلی موجود باشند
  ۲. bank.js قابل تجزیه باشد و دقیقاً ۹۱۰ سؤال داشته باشد
     (index.html اگر تعداد ۹۱۰ نباشد خطا نشان می‌دهد)
  ۳. هر سؤال کلید پاسخ معتبر (۱ تا ۴) و واحد درسی داشته باشد
  ۴. تمام تصاویر ارجاع‌شده در سؤالات واقعاً روی دیسک موجود باشند

اجرای محلی:  python3 scripts/verify_site.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
EXPECTED_TOTAL = 910

errors: list[str] = []
warnings: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)


def load_bank() -> list | None:
    bank_js = SITE / "bank.js"
    if not bank_js.exists():
        fail("site/bank.js یافت نشد")
        return None
    raw = bank_js.read_text(encoding="utf-8").strip()
    m = re.match(r"^window\.BANK_DATA\s*=\s*(.*?);?$", raw, re.DOTALL)
    if not m:
        fail("ساختار bank.js باید به شکل `window.BANK_DATA=[...]` باشد")
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        fail(f"JSON داخل bank.js معتبر نیست: {e}")
        return None


def main() -> int:
    for name in ("index.html", "bank.js"):
        if not (SITE / name).exists():
            fail(f"فایل ضروری site/{name} وجود ندارد")

    bank = load_bank()
    if bank is None:
        report()
        return 1

    if not isinstance(bank, list):
        fail("BANK_DATA باید یک آرایه باشد")
        report()
        return 1

    # تعداد کل — index.html روی این عدد قفل شده است
    if len(bank) != EXPECTED_TOTAL:
        fail(f"تعداد سؤالات {len(bank)} است اما index.html انتظار {EXPECTED_TOTAL} سؤال دارد")

    seen_ids: set[str] = set()
    missing_assets: set[str] = set()
    years: dict[int, int] = {}

    for idx, q in enumerate(bank):
        tag = q.get("id") or f"index {idx}"

        qid = q.get("id")
        if not qid:
            fail(f"سؤال {tag}: فیلد id ندارد")
        elif qid in seen_ids:
            fail(f"شناسه تکراری: {qid}")
        else:
            seen_ids.add(qid)

        if q.get("answer") not in (1, 2, 3, 4):
            fail(f"سؤال {tag}: کلید پاسخ نامعتبر ({q.get('answer')!r})")

        if not q.get("courseUnit"):
            fail(f"سؤال {tag}: واحد درسی ندارد")

        try:
            years[int(q["year"])] = years.get(int(q["year"]), 0) + 1
        except (KeyError, TypeError, ValueError):
            fail(f"سؤال {tag}: سال نامعتبر")

        opts = q.get("options")
        if q.get("questionText") and not (isinstance(opts, list) and len(opts) == 4):
            warnings.append(f"سؤال {tag}: متن دارد ولی چهار گزینه ندارد؛ فقط تصویر نمایش داده می‌شود")

        pages = q.get("sourcePages") or ([q["asset"]] if q.get("asset") else [])
        if not pages:
            fail(f"سؤال {tag}: هیچ تصویر منبعی ندارد")
        for p in pages:
            if not (SITE / p).exists():
                missing_assets.add(p)

    if missing_assets:
        fail(f"{len(missing_assets)} تصویر ارجاع‌شده موجود نیست، از جمله: "
             + ", ".join(sorted(missing_assets)[:10]))

    print(f"سؤالات: {len(bank)}")
    print("توزیع سالانه: " + ", ".join(f"{y}={years[y]}" for y in sorted(years)))
    print(f"تصاویر ارجاع‌شده و موجود: {sum(1 for _ in (SITE / 'assets').rglob('*.jpg'))} فایل روی دیسک")

    report()
    return 1 if errors else 0


def report() -> None:
    for w in warnings:
        print(f"::warning::{w}")
    for e in errors:
        print(f"::error::{e}")
    print("نتیجه: " + ("ناموفق" if errors else "موفق"))


if __name__ == "__main__":
    sys.exit(main())
