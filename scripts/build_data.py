#!/usr/bin/env python3
"""
ساخت فایل‌های داده سایت از روی bank.json.

bank.json تنها منبع حقیقت است. این اسکریپت آن را به دو بخش می‌شکند تا مرورگر
فقط چیزی را دانلود کند که واقعاً لازم دارد:

  data/questions.json      متن سؤال، گزینه‌ها، کلید و تصاویر — همه ۹۱۰ سؤال (~۵۲۰KB)
                           برای صفحه خانه و کل مسیر آزمون کافی است.
  data/review/<سال>.json   تحلیل حقوقی چهارگزینه‌ای — فقط هنگام نمایش نتیجه
                           و فقط برای سال‌های همان جلسه بارگذاری می‌شود.
  data/meta.json           شمارش‌ها و فهرست سال‌ها

فیلدهایی مثل searchText و scrollRatio که رابط کاربری استفاده نمی‌کند منتشر
نمی‌شوند (در bank.json باقی می‌مانند).

اجرا:  python3 scripts/build_data.py
"""
from __future__ import annotations

import json
import shutil
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
SRC = SITE / "bank.json"
OUT = SITE / "data"

# فیلدهایی که در مسیر آزمون لازم‌اند
QUIZ_FIELDS = ("id", "year", "q", "courseUnit", "answer", "questionText", "options", "sourcePages")


def jdump(path: Path, obj) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def main() -> int:
    if not SRC.exists():
        print(f"::error::{SRC} یافت نشد")
        return 1

    bank = json.loads(SRC.read_text(encoding="utf-8"))
    if OUT.exists():
        shutil.rmtree(OUT)

    questions, review_by_year, problems = [], {}, []

    for item in bank:
        qid = item.get("id", "?")
        v2 = item.get("analysisV2") or {}

        row = {k: item.get(k) for k in QUIZ_FIELDS}
        if not (isinstance(row["options"], list) and len(row["options"]) == 4):
            problems.append(f"{qid}: چهار گزینه ندارد")
        if row["answer"] not in (1, 2, 3, 4):
            problems.append(f"{qid}: کلید نامعتبر")
        if not row["questionText"]:
            problems.append(f"{qid}: متن سؤال ندارد")
        if not row["sourcePages"]:
            row["sourcePages"] = [item["asset"]] if item.get("asset") else []
        questions.append(row)

        opts = v2.get("optionAnalyses") or {}
        entry = {
            "legalBasis": v2.get("legalBasis") or item.get("legalBasis") or "",
            "summary": v2.get("summary") or item.get("lawExplanation") or item.get("explanation") or "",
            "options": [opts.get(str(i), "") for i in (1, 2, 3, 4)],
        }
        if v2.get("currentLawNote"):
            entry["currentLawNote"] = v2["currentLawNote"]
        review_by_year.setdefault(int(item["year"]), {})[qid] = entry

    if problems:
        for p in problems[:20]:
            print(f"::error::{p}")
        return 1

    questions.sort(key=lambda r: (int(r["year"]), int(r["q"])))

    total = jdump(OUT / "questions.json", questions)
    print(f"data/questions.json           {total/1024:7.0f} KB  ({len(questions)} سؤال)")

    review_total = 0
    for year in sorted(review_by_year):
        size = jdump(OUT / "review" / f"{year}.json", review_by_year[year])
        review_total += size
        print(f"data/review/{year}.json          {size/1024:7.0f} KB")

    units = Counter(r["courseUnit"] for r in questions)
    years = Counter(int(r["year"]) for r in questions)
    jdump(OUT / "meta.json", {
        "total": len(questions),
        "years": {str(y): years[y] for y in sorted(years)},
        "units": dict(sorted(units.items())),
    })

    print(f"\nبارگذاری اولیه: {total/1024:.0f} KB "
          f"(به‌جای {SRC.stat().st_size/1024/1024:.1f} MB)")
    print(f"تحلیل‌ها روی خواست: {review_total/1024:.0f} KB در {len(review_by_year)} فایل")
    return 0


if __name__ == "__main__":
    sys.exit(main())
