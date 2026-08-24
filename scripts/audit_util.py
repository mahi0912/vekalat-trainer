# -*- coding: utf-8 -*-
"""ابزار کمکی حسابرسی: خواندن/به‌روزرسانی تحلیل‌ها بدون دست زدن به bank.json."""
import json, glob, os
BANK = {q["id"]: q for q in json.load(open("site/bank.json", encoding="utf-8"))}

def path_for(qid): return f"site/analyses/{qid.split('-')[0]}.json"

def load(qid):
    return json.load(open(path_for(qid), encoding="utf-8"))[qid]

def show(ids, full=True):
    for i in ids:
        q, a = BANK[i], load(i)
        print(f"\n=== {i} | کلید دفترچه {a['keyAtExam']} | امروز {a['keyToday']} | {a['confidence']}")
        print("BASIS:", a["legalBasis"])
        if full:
            print(q["questionText"][:400])
            for n, o in enumerate(q["options"], 1): print(f"  {n}) {o[:180]}")

def patch(qid, **kw):
    """به‌روزرسانی امن یک تحلیل. keyAtExam هرگز تغییر نمی‌کند."""
    p = path_for(qid); d = json.load(open(p, encoding="utf-8")); e = d[qid]
    assert e["keyAtExam"] == BANK[qid]["answer"], qid
    if "keyAtExam" in kw: raise ValueError("کلید دفترچه تغییرناپذیر است")
    e.update(kw)
    e["lawChanged"] = e["keyAtExam"] != e["keyToday"]
    if e["lawChanged"] and not e.get("changeNote"): raise ValueError(f"{qid}: changeNote لازم است")
    assert e["keyToday"] in (1, 2, 3, 4), qid
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
    print("patched", qid, "| امروز:", e["keyToday"], "| lawChanged:", e["lawChanged"], "|", e["confidence"])
