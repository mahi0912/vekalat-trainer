# -*- coding: utf-8 -*-
"""نمایه‌سازی مواد قوانین از فایل‌های corpus/ برای راستی‌آزمایی استنادها."""
import re, glob, os, json, sys
sys.path.insert(0, "scripts")
from fa_ordinal import parse_ordinal

FA = "۰۱۲۳۴۵۶۷۸۹"
def to_en(s): return "".join(str(FA.index(c)) if c in FA else c for c in s)

ART = re.compile(r"ماده\s*([۰-۹0-9]{1,4})\s*[ـ\-–—:.]?\s*")
ASL = re.compile(r"اصل\s*([۰-۹0-9]{1,3})\s*[ـ\-–—:.]?\s*")
ORD = r"(?:[\u0600-\u06FF\u200c]+(?:\s+و\s+[\u0600-\u06FF\u200c]+){0,3})"
ASL_W = re.compile(r"اصل\s+(" + ORD + r")\s*[ـ\-–—:.]?\s*")
ART_W = re.compile(r"ماده\s+(" + ORD + r")\s*[ـ\-–—:.]?\s*")

def parse(path, pat=None):
    pat = pat or ART
    t = open(path, encoding="utf-8").read()
    arts, pos = {}, []
    for m in pat.finditer(t):
        g = m.group(1)
        n = int(to_en(g)) if re.fullmatch(r"[۰-۹0-9]+", g) else parse_ordinal(g)
        if n: pos.append((n, m.end(), m.start()))
    pos.sort(key=lambda x: x[1])
    for i, (num, start, _) in enumerate(pos):
        end = pos[i + 1][2] if i + 1 < len(pos) else min(len(t), start + 2500)
        body = t[start:end].strip()
        # نگه داشتن طولانی‌ترین نسخه (متن کامل ماده، نه ارجاع کوتاه)
        if num not in arts or len(body) > len(arts[num]):
            arts[num] = body[:3000]
    return arts

def load_all():
    idx = {}
    for p in glob.glob("corpus/*.txt"):
        n = os.path.basename(p)[:-4]
        if n == "اساسی": idx[n] = parse(p, ASL_W)
        elif n == "لایحه": idx[n] = parse(p, ART_W)
        else: idx[n] = parse(p)
    return idx

if __name__ == "__main__":
    idx = load_all()
    for k, v in sorted(idx.items()):
        nums = sorted(v)
        print(f"{k:12s} مواد: {len(v):5d}  بازه: {nums[0]}..{nums[-1]}")
    print("\nنمونه — قانون مدنی ماده ۱۹۰:\n", idx["مدنی"].get(190, "؟")[:300])
    print("\nنمونه — تعزیرات ماده ۶۷۷:\n", idx["تعزیرات"].get(677, "؟")[:300])
