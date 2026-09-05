#!/usr/bin/env python3
"""
ساخت فایل‌های داده سایت از روی bank.json.

bank.json تنها منبع حقیقت است. این اسکریپت آن را به دو بخش می‌شکند تا مرورگر
فقط چیزی را دانلود کند که واقعاً لازم دارد:

  data/questions.json      متن سؤال، گزینه‌ها، کلید و تصاویر — همه ۹۱۰ سؤال
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
SRC_KANOON = SITE / "bank-kanoon.json"
OUT = SITE / "data"

# فیلدهایی که در مسیر آزمون لازم‌اند
QUIZ_FIELDS = ("id", "year", "q", "courseUnit", "answer", "questionText", "options", "sourcePages")
# فیلدهای مخصوص سؤالات کانون: مبدأ و درجه اعتبار کلید
KANOON_FIELDS = ("source", "keyTrust", "acceptedAnswers", "subjectName", "tags")
# «units» هم به سطر افزوده می‌شود: واحدهای درسی ریزِ سؤال کانون

# تحلیل‌های بازنویسی‌شده که روی نسخه قالبی قدیمی سوار می‌شوند
REWRITTEN = SITE / "analyses"
REWRITTEN_KANOON = SITE / "analyses-kanoon"
UNIT_FIX = SITE / "unit-corrections.json"


# نگاشت برچسب سؤالات کانون به همان واحدهای درسی بانک مرکز، تا هر دو بانک
# یک زبان مشترک داشته باشند و بشود یک واحد را در هر دو تمرین کرد.
KANOON_UNIT = {
    "مدنی ۱": "مدنی ۱ — اشخاص، اهلیت و محجورین",
    "مدنی ۲": "مدنی ۲ — اموال و مالکیت",
    "مدنی ۳": "مدنی ۳ — قواعد عمومی قراردادها",
    "مدنی ۴": "مدنی ۴ — الزامات خارج از قرارداد",
    "مدنی ۵": "مدنی ۵ — خانواده",
    "مدنی ۶": "مدنی ۶ — عقود معین ۱",
    "مدنی ۷": "مدنی ۷ — عقود معین ۲",
    "مدنی ۸": "مدنی ۸ — شفعه، وصیت و ارث",
    "دادرسی مدنی ۱": "آیین دادرسی مدنی ۱ — کلیات، صلاحیت و اقامه دعوا",
    "دادرسی مدنی ۲": "آیین دادرسی مدنی ۲ — دادرسی، ادله، تأمین و اجرا",
    "دادرسی مدنی ۳": "آیین دادرسی مدنی ۳ — آراء، اعتراض و داوری",
    "کیفری ۱": "آیین دادرسی کیفری ۱ — کلیات، دعوای عمومی و صلاحیت",
    "کیفری ۲": "آیین دادرسی کیفری ۲ — تحقیقات مقدماتی و تأمین",
    "کیفری ۳": "آیین دادرسی کیفری ۳ — دادگاه، اعتراض و اجرای احکام",
    "تجارت ۱": "تجارت ۱ — تاجر و اعمال تجاری",
    "تجارت ۲": "تجارت ۲ — شرکت‌های تجاری",
    "تجارت ۳": "تجارت ۳ — اسناد تجاری و چک",
    "تجارت ۴": "تجارت ۴ — ورشکستگی",
    "جزای عمومی ۱": "جزای عمومی ۱ — اصول و مسئولیت کیفری",
    "جزای عمومی ۲": "جزای عمومی ۲ — مراحل ارتکاب، شرکت، معاونت و تعدد",
    "جزای عمومی ۳": "جزای عمومی ۳ — مجازات‌ها و نهادهای ارفاقی",
    "جزای اختصاصی ۱": "جزای اختصاصی ۱ — جرایم علیه اشخاص",
    "جزای اختصاصی ۲": "جزای اختصاصی ۲ — جرایم علیه اموال و مالکیت",
    "جزای اختصاصی ۳": "جزای اختصاصی ۳ — امنیت، آسایش و جرایم اداری",
    # این دو درس در کانون شماره‌گذاری واحد ندارند و یکجا طرح می‌شوند
    "اصول و متون فقه": "اصول استنباط و متون فقه — همه مباحث",
    "حقوق اساسی": "حقوق اساسی — همه اصول",
}


def load_unit_corrections() -> dict:
    """تصحیح واحد درسی سؤالاتی که در bank.json اشتباه برچسب خورده‌اند."""
    if not UNIT_FIX.exists():
        return {}
    return json.loads(UNIT_FIX.read_text(encoding="utf-8")).get("corrections", {})


def load_rewritten() -> dict:
    """تمام site/analyses/<سال>.json را در یک نگاشت شناسه → تحلیل ادغام می‌کند."""
    out: dict = {}
    if not REWRITTEN.exists() and not REWRITTEN_KANOON.exists():
        return out
    for path in sorted(REWRITTEN.glob("*.json")):
        out.update(json.loads(path.read_text(encoding="utf-8")))
    if REWRITTEN_KANOON.exists():
        for path in sorted(REWRITTEN_KANOON.glob("*.json")):
            out.update(json.loads(path.read_text(encoding="utf-8")))
    return out


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
    # سؤالات کانون شناسه پیشونددار دارند و با مرکز برخورد نمی‌کنند
    kanoon = json.loads(SRC_KANOON.read_text(encoding="utf-8")) if SRC_KANOON.exists() else []
    if kanoon:
        clash = {q["id"] for q in bank} & {q["id"] for q in kanoon}
        if clash:
            print(f"::error::برخورد شناسه میان دو بانک: {sorted(clash)[:5]}")
            return 1
        bank = bank + kanoon
    if OUT.exists():
        shutil.rmtree(OUT)

    rewritten = load_rewritten()
    unit_fix = load_unit_corrections()
    questions, review_by_year, problems = [], {}, []
    changed_keys = []

    for item in bank:
        qid = item.get("id", "?")
        v2 = item.get("analysisV2") or {}

        row = {k: item.get(k) for k in QUIZ_FIELDS}
        if qid in unit_fix:
            row["courseUnit"] = unit_fix[qid]
        if not (isinstance(row["options"], list) and len(row["options"]) == 4):
            problems.append(f"{qid}: چهار گزینه ندارد")
        if row["answer"] not in (1, 2, 3, 4):
            problems.append(f"{qid}: کلید نامعتبر")
        if not row["questionText"]:
            problems.append(f"{qid}: متن سؤال ندارد")
        if not row["sourcePages"]:
            row["sourcePages"] = [item["asset"]] if item.get("asset") else []
        for f in KANOON_FIELDS:
            if item.get(f) is not None:
                row[f] = item[f]
        if item.get("source") == "kanoon":
            units = [KANOON_UNIT[t] for t in (item.get("tags") or []) if t in KANOON_UNIT]
            if units:
                row["units"] = units
        questions.append(row)

        new = rewritten.get(qid)
        if new:
            entry = {
                "status": "rewritten",
                "legalBasis": new["legalBasis"],
                "summary": new["summary"],
                "options": new["options"],
                "keyAtExam": new["keyAtExam"],
                "keyToday": new["keyToday"],
                "lawChanged": bool(new.get("lawChanged")),
                "changeNote": new.get("changeNote", ""),
                "sources": new.get("sources", []),
                "reviewedAt": new.get("reviewedAt", ""),
                "confidence": new.get("confidence", "high"),
            }
            if entry["keyAtExam"] != row["answer"]:
                problems.append(f"{qid}: keyAtExam با کلید دفترچه نمی‌خواند")
            # مبنای نمره‌دهی قانون امروز است
            if entry["keyToday"] != row["answer"]:
                row["answerToday"] = entry["keyToday"]
                changed_keys.append(qid)
        else:
            opts = v2.get("optionAnalyses") or {}
            entry = {
                "status": "legacy",
                "legalBasis": v2.get("legalBasis") or item.get("legalBasis") or "",
                "summary": v2.get("summary") or item.get("lawExplanation") or item.get("explanation") or "",
                "options": [opts.get(str(i), "") for i in (1, 2, 3, 4)],
                "keyAtExam": row["answer"],
                "keyToday": row["answer"],
                "lawChanged": False,
            }
            if v2.get("currentLawNote"):
                entry["changeNote"] = v2["currentLawNote"]
        bucket = ("k" if item.get("source") == "kanoon" else "") + str(int(item["year"]))
        review_by_year.setdefault(bucket, {})[qid] = entry

    if problems:
        for p in problems[:20]:
            print(f"::error::{p}")
        return 1

    questions.sort(key=lambda r: (r.get("source", "markaz"), int(r["year"]), int(r["q"])))

    total = jdump(OUT / "questions.json", questions)
    print(f"data/questions.json           {total/1024:7.0f} KB  ({len(questions)} سؤال)")

    review_total = 0
    for year in sorted(review_by_year):
        size = jdump(OUT / "review" / f"{year}.json", review_by_year[year])
        review_total += size
        print(f"data/review/{year}.json          {size/1024:7.0f} KB")

    rewritten_ids = [q["id"] for q in questions if q["id"] in rewritten]
    markaz = [r for r in questions if r.get("source") != "kanoon"]
    kanoonq = [r for r in questions if r.get("source") == "kanoon"]

    def unit_years(rows, key="courseUnit"):
        """نگاشت واحد درسی → {سال: تعداد} تا بشود درس یک سالِ خاص را جدا آزمون داد."""
        out: dict = {}
        for r in rows:
            names = r.get(key) if key == "units" else [r[key]]
            for u in (names or []):
                out.setdefault(u, Counter())[int(r["year"])] += 1
        return {u: {str(y): c[y] for y in sorted(c)} for u, c in sorted(out.items())}

    def counts(rows):
        y = Counter(int(r["year"]) for r in rows)
        u = Counter(r["courseUnit"] for r in rows)
        return {"total": len(rows),
                "years": {str(k): y[k] for k in sorted(y)},
                "units": dict(sorted(u.items())),
                "unitYears": unit_years(rows),
                "fineUnitYears": unit_years(rows, "units")}

    units = Counter(r["courseUnit"] for r in markaz)
    years = Counter(int(r["year"]) for r in markaz)
    jdump(OUT / "meta.json", {
        "total": len(markaz),
        "years": {str(y): years[y] for y in sorted(years)},
        "units": dict(sorted(units.items())),
        "unitYears": unit_years(markaz),
        "rewritten": len(rewritten_ids),
        "keyChanged": len(changed_keys),
        "kanoon": counts(kanoonq) if kanoonq else None,
    })

    print(f"\nبارگذاری اولیه: {total/1024:.0f} KB "
          f"(به‌جای {SRC.stat().st_size/1024/1024:.1f} MB)")
    print(f"تحلیل‌ها روی خواست: {review_total/1024:.0f} KB در {len(review_by_year)} فایل")
    if unit_fix:
        print(f"واحد درسی تصحیح‌شده: {len(unit_fix)} سؤال")
    print(f"تحلیل بازنویسی‌شده: {len(rewritten_ids)} از {len(questions)}"
          f"  |  کلید تغییرکرده با قانون روز: {len(changed_keys)}")
    if changed_keys:
        print("  " + ", ".join(changed_keys))
    return 0


if __name__ == "__main__":
    sys.exit(main())
