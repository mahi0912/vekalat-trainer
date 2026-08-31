#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ورود سؤالات کانون وکلا به بانک، با پیشوند امن.

خطر: هر دو آزمون از قالب شناسه «1398-1» استفاده می‌کنند و ۶۵۰ شناسه برخورد
می‌کنند در حالی که سؤال‌ها کاملاً متفاوت‌اند. پس شناسه کانون پیشوند «k» می‌گیرد
و شناسه‌های مرکز دست‌نخورده می‌مانند (تا جلسه‌های ذخیره‌شده کاربر نشکند).

کلیدها از accepted_answers می‌آید و برچسب اعتبارشان در keyTrust نگه داشته می‌شود.
تحلیل‌های آن مخزن عمداً وارد نمی‌شوند: ۹۹٪ متن گزینه‌ها تکراری و قالبی است.
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GPT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/gptbank.json")
OUT = ROOT / "site" / "bank-kanoon.json"

# برچسب کیفیت کلید → درجه اعتماد
TRUST = {
    "کلید نهایی موجود در فایل": "official-final",
    "کلید اولیه رسمی موجود در فایل": "official-preliminary",
    "کلید موجود در فایل": "official",
    "پاسخنامه پیشنهادی موجود در فایل": "suggested",
    "کلید پیشنهادی تحلیلی ۱۴۰۴ (غیررسمی)": "unofficial",
    "نیازمند بررسی؛ از نمره حذف شده": "excluded",
}

# نگاشت درس کانون به گروه‌های درسی برنامه
SUBJECT = {
    "حقوق مدنی": "مدنی",
    "آیین دادرسی مدنی": "آیین دادرسی مدنی",
    "حقوق تجارت": "تجارت",
    "حقوق جزای عمومی و اختصاصی": "جزا",
    "آیین دادرسی کیفری": "آیین دادرسی کیفری",
    "اصول استنباط و متون فقه": "اصول استنباط و متون فقه",
    "حقوق اساسی": "حقوق اساسی",
}


def main() -> int:
    src = json.loads(GPT.read_text(encoding="utf-8"))
    out, skipped = [], []

    for q in src:
        acc = q.get("accepted_answers") or []
        trust = TRUST.get(q.get("key_status", ""), "unknown")
        if not acc or trust == "excluded":
            skipped.append((q["id"], q.get("key_status")))
            continue
        opts = q.get("options") or []
        if len(opts) != 4:
            skipped.append((q["id"], f"{len(opts)} گزینه")); continue

        out.append({
            "id": "k" + q["id"],
            "source": "kanoon",
            "year": int(q["year"]),
            "q": int(q["q"]),
            "answer": int(acc[0]),
            "acceptedAnswers": [int(a) for a in acc],
            "keyTrust": trust,
            "courseUnit": SUBJECT.get(q.get("subject_name", ""), q.get("subject_name", "")),
            "subjectName": q.get("subject_name", ""),
            "tags": q.get("tags") or [],
            "questionText": q.get("question", ""),
            "options": opts,
            "sourcePages": [],
        })

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    import collections
    print(f"وارد شد: {len(out)} سؤال کانون → {OUT.relative_to(ROOT)}")
    print("  سال‌ها:", dict(sorted(collections.Counter(q["year"] for q in out).items())))
    print("  اعتبار کلید:", dict(collections.Counter(q["keyTrust"] for q in out)))
    print("  توزیع کلید:", dict(sorted(collections.Counter(q["answer"] for q in out).items())))
    if skipped:
        print(f"  کنار گذاشته شد: {len(skipped)} → {skipped[:5]}")

    # هیچ شناسه‌ای نباید با بانک مرکز برخورد کند
    markaz = {q["id"] for q in json.loads((ROOT / "site" / "bank.json").read_text(encoding="utf-8"))}
    clash = markaz & {q["id"] for q in out}
    if clash:
        print(f"::error::برخورد شناسه با بانک مرکز: {sorted(clash)[:5]}")
        return 1
    print("  ✔ هیچ برخورد شناسه‌ای با بانک مرکز نیست")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
