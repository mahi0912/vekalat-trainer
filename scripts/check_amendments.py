# -*- coding: utf-8 -*-
"""یافتن سؤالاتی که ماده استنادشده‌شان پس از سال برگزاری آزمون اصلاح یا الحاق شده است.
متن قوانین در corpus/ نشانه‌هایی مانند «(اصلاحی ۱۴۰۳/۳/۳۰)» یا «الحاقی ۱۳۹۹» دارد."""
import re, json, glob, sys
sys.path.insert(0, "scripts")
from corpus_index import load_all, to_en

LAWMAP = [(r"کتاب پنجم|تعزیرات", "تعزیرات"), (r"آیین دادرسی کیفری", "آدک"),
          (r"آیین دادرسی مدنی", "آددم"), (r"مجازات اسلامی", "مجازات"),
          (r"قانون مدنی", "مدنی"), (r"قانون تجارت", "تجارت"), (r"قانون ثبت", "ثبت"),
          (r"صدور چک", "چک"), (r"شوراهای حل اختلاف", "شوراها۱۴۰۲"),
          (r"اجرای احکام مدنی", "اجرااحکام"), (r"امور حسبی", "امورحسبی")]
CITE = re.compile(r"(?:ماده|مواد)\s*((?:[۰-۹0-9]{1,4})(?:\s*(?:،|و|تا)\s*[۰-۹0-9]{1,4}){0,4})")
STAMP = re.compile(r"(اصلاحی|الحاقی|اصلاح)\s*([۰-۹0-9]{4})")

def law_at(text, pos):
    best, bd = None, 10**9
    for pat, key in LAWMAP:
        for m in re.finditer(pat, text):
            d = abs(m.start() - pos)
            if d < bd: bd, best = d, key
    return best if bd < 130 else None

def main():
    idx = load_all()
    an = {}
    for f in glob.glob("site/analyses/*.json"):
        an.update(json.load(open(f, encoding="utf-8")))
    hits = []
    for qid in sorted(an):
        a = an[qid]; year = int(qid.split("-")[0])
        blob = a.get("legalBasis", "") + " || " + " ; ".join(a.get("sources", []))
        seen = set()
        for m in CITE.finditer(blob):
            key = law_at(blob, m.start())
            if not key or key not in idx: continue
            for x in re.findall(r"[۰-۹0-9]{1,4}", m.group(1)):
                n = int(to_en(x))
                if 1300 <= n <= 1420 or not (0 < n <= 1400): continue
                if (key, n) in seen: continue
                seen.add((key, n))
                body = idx[key].get(n, "")
                for s in STAMP.finditer(body[:400]):
                    yr = int(to_en(s.group(2)))
                    if 1390 <= yr <= 1405 and yr > year:
                        hits.append((qid, key, n, yr, a["confidence"], a.get("changeNote", "")[:1] != ""))
    print(f"سؤالاتی که ماده استنادشده‌شان بعد از سال آزمون اصلاح شده — {len(hits)} مورد\n")
    for q, k, n, yr, conf, hasnote in hits:
        print(f"   {q}  «{k}» ماده {n} — اصلاحی {yr}   [{conf}{'، یادداشت دارد' if hasnote else '، بدون یادداشت'}]")

main()
