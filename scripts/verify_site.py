#!/usr/bin/env python3
"""
اعتبارسنجی سایت پیش از انتشار.

بررسی می‌کند:
  ۱. فایل‌های اصلی و ماژول‌ها موجود باشند و index.html آن‌ها را صدا بزند
  ۲. داده‌های ساخته‌شده به‌روز باشند (از bank.json عقب نمانده باشند)
  ۳. دقیقاً ۹۱۰ سؤال با کلید معتبر، متن، چهار گزینه و واحد درسی وجود داشته باشد
  ۴. هر سؤال تحلیل چهارگزینه‌ای داشته باشد
  ۵. تمام تصاویر ارجاع‌شده روی دیسک موجود باشند

اجرای محلی:  python3 scripts/build_data.py && python3 scripts/verify_site.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DATA = SITE / "data"
EXPECTED_TOTAL = 910

errors: list[str] = []
warnings: list[str] = []
fail = errors.append


def main() -> int:
    required = [
        "index.html", "bank.json", "auth-config.js", "css/styles.css",
        "js/gate.js", "js/app.js", "js/data.js", "js/state.js",
        "js/views.js", "js/util.js", "js/groups.js",
    ]
    for name in required:
        if not (SITE / name).exists():
            fail(f"فایل ضروری site/{name} وجود ندارد")

    html = (SITE / "index.html").read_text(encoding="utf-8") if (SITE / "index.html").exists() else ""
    for ref in ("css/styles.css", "auth-config.js", "js/gate.js"):
        if ref not in html:
            fail(f"index.html به {ref} ارجاع نمی‌دهد")

    if not DATA.exists():
        fail("پوشه site/data ساخته نشده است — اول scripts/build_data.py را اجرا کنید")
        return report()

    bank = SITE / "bank.json"
    questions_file = DATA / "questions.json"
    if bank.exists() and questions_file.exists() and bank.stat().st_mtime > questions_file.stat().st_mtime:
        fail("bank.json از data/questions.json جدیدتر است — scripts/build_data.py را دوباره اجرا کنید")

    questions = json.loads(questions_file.read_text(encoding="utf-8"))
    meta = json.loads((DATA / "meta.json").read_text(encoding="utf-8"))

    if len(questions) != EXPECTED_TOTAL:
        fail(f"تعداد سؤالات {len(questions)} است، انتظار {EXPECTED_TOTAL}")
    if meta.get("total") != len(questions):
        fail("meta.json با questions.json هم‌خوان نیست")

    by_id = {q.get("id"): q for q in questions}
    rewritten_count = [0]
    needs_check: list[str] = []
    seen: set[str] = set()
    missing_assets: set[str] = set()
    by_year: dict[int, list[str]] = {}

    for q in questions:
        tag = q.get("id") or "?"
        if not q.get("id"):
            fail("سؤالی بدون شناسه وجود دارد")
        elif q["id"] in seen:
            fail(f"شناسه تکراری: {tag}")
        else:
            seen.add(q["id"])

        if q.get("answer") not in (1, 2, 3, 4):
            fail(f"سؤال {tag}: کلید نامعتبر ({q.get('answer')!r})")
        if not q.get("questionText"):
            fail(f"سؤال {tag}: متن سؤال ندارد")
        if not (isinstance(q.get("options"), list) and len(q["options"]) == 4):
            fail(f"سؤال {tag}: چهار گزینه ندارد")
        if not q.get("courseUnit"):
            fail(f"سؤال {tag}: واحد درسی ندارد")

        pages = q.get("sourcePages") or []
        if not pages:
            fail(f"سؤال {tag}: تصویر منبع ندارد")
        for p in pages:
            if not (SITE / p).exists():
                missing_assets.add(p)

        by_year.setdefault(int(q["year"]), []).append(q["id"])

    for year, ids in sorted(by_year.items()):
        path = DATA / "review" / f"{year}.json"
        if not path.exists():
            fail(f"تحلیل‌های سال {year} ساخته نشده است")
            continue
        analyses = json.loads(path.read_text(encoding="utf-8"))
        for qid in ids:
            entry = analyses.get(qid)
            if not entry:
                fail(f"سؤال {qid}: تحلیل ندارد")
                continue
            if sum(1 for t in entry.get("options", []) if t) != 4:
                warnings.append(f"سؤال {qid}: تحلیل هر چهار گزینه کامل نیست")

            booklet = by_id[qid]["answer"]
            at_exam, today = entry.get("keyAtExam"), entry.get("keyToday")
            if at_exam != booklet:
                fail(f"سؤال {qid}: keyAtExam ({at_exam}) با کلید دفترچه ({booklet}) نمی‌خواند")
            if today not in (1, 2, 3, 4):
                fail(f"سؤال {qid}: keyToday نامعتبر ({today!r})")
            if bool(entry.get("lawChanged")) != (at_exam != today):
                fail(f"سؤال {qid}: lawChanged با تفاوت کلیدها هم‌خوان نیست")
            if entry.get("lawChanged") and not entry.get("changeNote"):
                fail(f"سؤال {qid}: قانون تغییر کرده ولی توضیحی ثبت نشده")

            if entry.get("status") == "rewritten":
                rewritten_count[0] += 1
                for i, text in enumerate(entry.get("options", []), 1):
                    if len(text or "") < 60:
                        warnings.append(f"سؤال {qid} گزینه {i}: تحلیل بازنویسی‌شده خیلی کوتاه است")
                if not entry.get("sources"):
                    warnings.append(f"سؤال {qid}: مستندات ثبت نشده")
                if entry.get("confidence") not in ("high", "needs-check"):
                    fail(f"سؤال {qid}: confidence نامعتبر ({entry.get('confidence')!r})")
                elif entry["confidence"] == "needs-check":
                    needs_check.append(qid)
            # کلید امروز باید روی خود سؤال هم نشسته باشد تا نمره‌دهی درست کار کند
            expected = today if today != booklet else None
            if by_id[qid].get("answerToday") != expected:
                fail(f"سؤال {qid}: answerToday در questions.json با تحلیل هم‌خوان نیست")

    if missing_assets:
        fail(f"{len(missing_assets)} تصویر موجود نیست، از جمله: " + ", ".join(sorted(missing_assets)[:8]))

    size = questions_file.stat().st_size / 1024
    review_size = sum(p.stat().st_size for p in (DATA / "review").glob("*.json")) / 1024
    changed = sum(1 for q in questions if q.get("answerToday"))
    print(f"سؤالات: {len(questions)}  |  بارگذاری اولیه: {size:.0f} KB  |  تحلیل‌ها روی خواست: {review_size:.0f} KB")
    print(f"تحلیل بازنویسی‌شده: {rewritten_count[0]}  |  کلید تغییرکرده با قانون روز: {changed}")
    if needs_check:
        print(f"نیازمند بازبینی حقوق‌دان ({len(needs_check)}): " + ", ".join(needs_check))
    print("توزیع سالانه: " + ", ".join(f"{y}={len(v)}" for y, v in sorted(by_year.items())))
    return report()


def report() -> int:
    for w in warnings[:20]:
        print(f"::warning::{w}")
    for e in errors[:30]:
        print(f"::error::{e}")
    print("نتیجه: " + ("ناموفق" if errors else "موفق"))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
