# -*- coding: utf-8 -*-
"""راستی‌آزمایی استنادها در برابر متن واقعی قوانین (پوشه corpus/).
[۱] ماده‌ای که در متن آن قانون وجود ندارد → احتمال اشتباه در شماره ماده.
[۲] ماده‌ای که هست ولی هیچ واژه کلیدی مشترکی با تحلیل ندارد → نیازمند نگاه انسانی.
قوانین بدون نسخه محلی (اساسی، لایحه اصلاحی تجارت، قوانین خاص) نادیده گرفته می‌شوند."""
import re, json, glob, sys
sys.path.insert(0, "scripts")
from corpus_index import load_all, to_en

LAWMAP = [(r"کتاب پنجم|تعزیرات", "تعزیرات"), (r"آیین دادرسی کیفری", "آدک"),
          (r"آیین دادرسی مدنی", "آددم"), (r"مجازات اسلامی", "مجازات"),
          (r"قانون مدنی", "مدنی"), (r"لایحه", None), (r"قانون تجارت", "تجارت"),
          (r"قانون ثبت", "ثبت"), (r"صدور چک", "چک"),
          (r"شوراهای حل اختلاف", "شوراها۱۴۰۲"), (r"اجرای احکام مدنی", "اجرااحکام"),
          (r"امور حسبی", "امورحسبی")]
STOP = set("و در از به که را با این آن های ها یا برای بر است می شود کرد کند نیست بود مورد کدام صحیح غلط درست ماده قانون بند تبصره اگر هر چه نمی هم تا نیز آنها وی او خود مصوب اصلاحی مقررات قواعد".split())

def words(s):
    s = re.sub(r"[‌ً-ْ]", "", s)
    s = re.sub(r"[^؀-ۿ\s]", " ", s)
    return {w for w in s.split() if len(w) > 3 and w not in STOP}

def nearest_law(text, pos):
    best, bd = "NONE", 10**9
    for pat, key in LAWMAP:
        for m in re.finditer(pat, text):
            d = abs(m.start() - pos)
            if d < bd: bd, best = d, key
    return best if bd < 130 else None

# «ماده N» یا «مواد N، M و K» — سال‌ها (۱۳۰۰ تا ۱۴۲۰) کنار گذاشته می‌شوند
CITE = re.compile(r"(?:ماده|مواد)\s*((?:[۰-۹0-9]{1,4})(?:\s*(?:،|و|تا)\s*[۰-۹0-9]{1,4}){0,4})")

def nums(g):
    out = []
    for x in re.findall(r"[۰-۹0-9]{1,4}", g):
        n = int(to_en(x))
        if 1300 <= n <= 1420: continue      # سال، نه شماره ماده
        if 0 < n <= 1400: out.append(n)
    return out

def main():
    idx = load_all()
    an = {}
    for f in glob.glob("site/analyses/*.json"):
        an.update(json.load(open(f, encoding="utf-8")))
    missing, weak, checked, skipped = [], [], 0, 0
    for qid in sorted(an):
        a = an[qid]
        blob = a.get("legalBasis", "") + " || " + " ; ".join(a.get("sources", []))
        ctx = words(a.get("summary", "") + " " + a.get("legalBasis", "") + " " + " ".join(a.get("options", [])))
        seen = set()
        for m in CITE.finditer(blob):
            key = nearest_law(blob, m.start())
            if key is None or key == "NONE" or key not in idx:
                skipped += 1; continue
            for n in nums(m.group(1)):
                if (key, n) in seen: continue
                seen.add((key, n)); checked += 1
                body = idx[key].get(n)
                if body is None or len(body) < 8:
                    missing.append((qid, key, n, a.get("legalBasis", "")[:70])); continue
                ov = words(body) & ctx
                if len(ov) < 3:
                    weak.append((qid, key, n, len(ov), body[:95].replace("\n", " ")))
    print(f"استناد بررسی‌شده: {checked}   (نادیده‌گرفته‌شده چون قانونش نسخه محلی ندارد: {skipped})")
    print(f"\n[۱] ماده در متن قانون یافت نشد — {len(missing)} مورد")
    for q, k, n, lb in missing: print(f"   {q}  «{k}» ماده {n}   ← {lb}")
    print(f"\n[۲] هم‌پوشانی واژگانی ضعیف — {len(weak)} مورد")
    for q, k, n, c, s in weak: print(f"   {q}  «{k}» م{n} ({c}) → {s}")

main()
