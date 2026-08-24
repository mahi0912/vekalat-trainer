# -*- coding: utf-8 -*-
"""بررسی عددی: مهلت‌ها و مقادیری که در تحلیل ادعا شده، در متن ماده استنادشده هست؟
هدف: گرفتن خطاهایی مثل «ده روز» به جای «پنج روز» که در آزمون تعیین‌کننده‌اند."""
import re, json, glob, sys
sys.path.insert(0, "scripts")
from corpus_index import load_all, to_en

LAWMAP = [(r"کتاب پنجم|تعزیرات", "تعزیرات"), (r"آیین دادرسی کیفری", "آدک"),
          (r"آیین دادرسی مدنی", "آددم"), (r"مجازات اسلامی", "مجازات"),
          (r"قانون مدنی", "مدنی"), (r"قانون تجارت", "تجارت"), (r"قانون ثبت", "ثبت"),
          (r"صدور چک", "چک"), (r"شوراهای حل اختلاف", "شوراها۱۴۰۲"),
          (r"اجرای احکام مدنی", "اجرااحکام"), (r"امور حسبی", "امورحسبی")]
CITE = re.compile(r"(?:ماده|مواد)\s*((?:[۰-۹0-9]{1,4})(?:\s*(?:،|و|تا)\s*[۰-۹0-9]{1,4}){0,4})")
# عدد + واحد زمان/مقدار در متن فارسی
NUMW = {"یک":1,"دو":2,"سه":3,"چهار":4,"پنج":5,"شش":6,"هفت":7,"هشت":8,"نه":9,"ده":10,
 "پانزده":15,"بیست":20,"سی":30,"چهل":40,"چهل و پنج":45,"شصت":60,"نود":90,"یکصد":100,"صد":100,"دویست":200}
UNIT = r"(روز|ماه|سال|هفته|ضربه|درجه|برابر|نوبت|درصد)"
PAT = re.compile(r"(" + "|".join(sorted(NUMW, key=len, reverse=True)) + r"|[۰-۹0-9]{1,4})\s+" + UNIT)

def law_at(text, pos):
    best, bd = None, 10**9
    for pat, key in LAWMAP:
        for m in re.finditer(pat, text):
            d = abs(m.start() - pos)
            if d < bd: bd, best = d, key
    return best if bd < 130 else None

def pairs(s):
    out = set()
    for m in PAT.finditer(s):
        g = m.group(1)
        n = NUMW.get(g) or (int(to_en(g)) if re.fullmatch(r"[۰-۹0-9]+", g) else None)
        if n: out.add((n, m.group(2)))
    return out

def main():
    idx = load_all()
    an = {}
    for f in glob.glob("site/analyses/*.json"):
        an.update(json.load(open(f, encoding="utf-8")))
    flags = []
    for qid in sorted(an):
        a = an[qid]
        blob = a.get("legalBasis", "") + " || " + " ; ".join(a.get("sources", []))
        bodies, laws = "", set()
        for m in CITE.finditer(blob):
            key = law_at(blob, m.start())
            if not key or key not in idx: continue
            for x in re.findall(r"[۰-۹0-9]{1,4}", m.group(1)):
                n = int(to_en(x))
                if 1300 <= n <= 1420 or not (0 < n <= 1400): continue
                bodies += " " + idx[key].get(n, ""); laws.add(f"{key}:{n}")
        if not bodies.strip(): continue
        # فقط گزینه‌ای که «درست» است + خلاصه — یعنی ادعاهای مثبت تحلیل
        k = a["keyToday"]; claim = a.get("summary", "") + " " + (a.get("options", ["", "", "", ""])[k - 1])
        cp, bp = pairs(claim), pairs(bodies)
        missing = {(n, u) for (n, u) in cp if (n, u) not in bp
                   and any(bn != n for (bn, bu) in bp if bu == u)}
        if missing:
            flags.append((qid, a["confidence"], sorted(laws)[:3], sorted(missing),
                          sorted({(n, u) for (n, u) in bp if u in {u2 for _, u2 in missing}})[:6]))
    print(f"سؤالاتی که عدد ادعاشده در تحلیل با عدد متن ماده نمی‌خواند — {len(flags)} مورد\n")
    for q, c, laws, miss, have in flags:
        print(f"   {q} [{c}] {laws}\n      ادعای تحلیل: {miss}\n      در متن ماده: {have}")

main()
