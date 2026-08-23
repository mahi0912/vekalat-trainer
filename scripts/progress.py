#!/usr/bin/env python3
"""
گزارش پیشرفت بازنویسی تحلیل‌ها و تعیین دسته بعدی.

حالت کار روی دیسک است (site/analyses/*.json)، پس هر اجرا بدون نیاز به حافظه
می‌فهمد چه چیزی مانده است.

اجرا:  python3 scripts/progress.py          گزارش کامل
       python3 scripts/progress.py --next   فقط دسته بعدی، برای اتوماسیون
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

# ترتیب کار: سال به سال، و داخل هر سال به ترتیب دروس
UNIT_ORDER = ["مدنی", "آیین دادرسی مدنی", "جزای عمومی", "جزای اختصاصی",
              "آیین دادرسی کیفری", "تجارت", "متون فقه", "حقوق ثبت", "حقوق اساسی"]
BATCH = 20


def load():
    bank = json.loads((SITE / "bank.json").read_text(encoding="utf-8"))
    done: set[str] = set()
    flagged: list[str] = []
    for p in sorted((SITE / "analyses").glob("*.json")):
        for qid, entry in json.loads(p.read_text(encoding="utf-8")).items():
            done.add(qid)
            if entry.get("confidence") == "needs-check":
                flagged.append(qid)
    return bank, done, flagged


def group_key(unit: str) -> int:
    for i, prefix in enumerate(UNIT_ORDER):
        if unit.startswith(prefix):
            return i
    return len(UNIT_ORDER)


def next_batch(bank, done):
    """اولین دسته باقی‌مانده، به ترتیب سال و درس."""
    remaining = [q for q in bank if q["id"] not in done]
    if not remaining:
        return None
    remaining.sort(key=lambda q: (q["year"], group_key(q["courseUnit"]), q["courseUnit"], q["q"]))
    head = remaining[0]
    group = group_key(head["courseUnit"])
    same = [q for q in remaining
            if q["year"] == head["year"] and group_key(q["courseUnit"]) == group]
    return {
        "year": head["year"],
        "subject": UNIT_ORDER[group] if group < len(UNIT_ORDER) else head["courseUnit"],
        "ids": [q["id"] for q in same[:BATCH]],
        "remaining_in_subject": len(same),
    }


def main() -> int:
    bank, done, flagged = load()
    batch = next_batch(bank, done)

    if "--next" in sys.argv:
        if not batch:
            print("DONE")
            return 0
        print(f"سال {batch['year']} — {batch['subject']} — {len(batch['ids'])} سؤال")
        print(" ".join(batch["ids"]))
        return 0

    total = len(bank)
    print(f"بازنویسی‌شده: {len(done)} از {total}  ({len(done)/total*100:.1f}%)")
    print(f"تحلیل گزینه: {len(done)*4} از {total*4}")
    if flagged:
        print(f"نیازمند تأیید حقوق‌دان: {len(flagged)} — {', '.join(sorted(flagged))}")

    per_year = Counter(q["year"] for q in bank)
    done_year = Counter(q["year"] for q in bank if q["id"] in done)
    print("\nبه تفکیک سال:")
    for y in sorted(per_year):
        n, d = per_year[y], done_year[y]
        bar = "█" * round(d / n * 24) + "·" * (24 - round(d / n * 24))
        print(f"  {y}  {bar}  {d:3}/{n}")

    if batch:
        print(f"\nدسته بعدی: سال {batch['year']} — {batch['subject']}"
              f"  ({len(batch['ids'])} از {batch['remaining_in_subject']} باقی‌مانده این درس)")
        print("  " + " ".join(batch["ids"]))
    else:
        print("\nهمه سؤالات بازنویسی شده‌اند.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
