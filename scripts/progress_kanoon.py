#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""پیشرفت بازنویسی تحلیل‌های کانون. بی‌حالت است: هر بار از روی دیسک می‌شمارد."""
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANK = ROOT / "site" / "bank-kanoon.json"
AN = ROOT / "site" / "analyses-kanoon"

UNIT_ORDER = ["مدنی", "آیین دادرسی مدنی", "تجارت", "جزا",
              "آیین دادرسی کیفری", "اصول استنباط و متون فقه", "حقوق اساسی"]
YEARS = [1398, 1400, 1402, 1403, 1404]
BATCH = 10


def load():
    qs = json.loads(BANK.read_text(encoding="utf-8"))
    done = {}
    if AN.exists():
        for p in sorted(AN.glob("*.json")):
            done.update(json.loads(p.read_text(encoding="utf-8")))
    return qs, done


def main() -> int:
    qs, done = load()
    todo = [q for q in qs if q["id"] not in done]

    if "--next" in sys.argv:
        if not todo:
            print("DONE")
            return 0
        # دسته بعدی: یک واحد درسی از یک سال، به ترتیب UNIT_ORDER
        for y in YEARS:
            for u in UNIT_ORDER:
                pool = [q for q in todo if q["year"] == y and q["courseUnit"] == u]
                if pool:
                    pool.sort(key=lambda q: q["q"])
                    print(f"سال {y} — {u}  ({len(pool)} باقی‌مانده)")
                    print(" ".join(q["id"] for q in pool[:BATCH]))
                    return 0
        print("DONE")
        return 0

    n = len(qs)
    for y in YEARS:
        ys = [q for q in qs if q["year"] == y]
        d = sum(1 for q in ys if q["id"] in done)
        bar = "█" * (d * 24 // max(len(ys), 1))
        print(f"  کانون {y}  {bar:<24} {d}/{len(ys)}")
    print(f"\nجمع: {len(done)}/{n}  ({len(done)*100//max(n,1)}٪)")
    if todo:
        print(f"باقی‌مانده: {len(todo)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
