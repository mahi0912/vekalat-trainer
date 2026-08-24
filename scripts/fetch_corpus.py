# -*- coding: utf-8 -*-
"""دانلود متن کامل قوانین مرجع برای راستی‌آزمایی محلی استنادها."""
import re, html, subprocess, sys, os, json

SOURCES = {
 "مدنی": "https://www.ekhtebar.ir/%D9%82%D8%A7%D9%86%D9%88%D9%86-%D9%85%D8%AF%D9%86%DB%8C/",
 "مجازات": "https://www.ekhtebar.ir/%D9%85%D8%AA%D9%86-%D9%82%D8%A7%D9%86%D9%88%D9%86-%D9%85%D8%AC%D8%A7%D8%B2%D8%A7%D8%AA-%D8%A7%D8%B3%D9%84%D8%A7%D9%85%DB%8C-%DA%A9%D8%AA%D8%A7%D8%A8-%D8%A7%D9%88%D9%84-%D8%AA%D8%A7-%DA%86%D9%87%D8%A7/",
 "تعزیرات": "https://www.ekhtebar.ir/%D9%83%D8%AA%D8%A7%D8%A8-%D9%BE%D9%86%D8%AC%D9%85-%D9%82%D8%A7%D9%86%D9%88%D9%86-%D9%85%D8%AC%D8%A7%D8%B2%D8%A7%D8%AA-%D8%A7%D8%B3%D9%84%D8%A7%D9%85%D9%8A-%E2%80%8C-%D8%AA%D8%B9%D8%B2%D9%8A%D8%B1/",
 "آددم": "https://ekhtebar.ir/%E2%80%8C%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A2%D8%A6%D9%8A%D9%86-%D8%AF%D8%A7%D8%AF%D8%B1%D8%B3%D9%8A-%D8%AF%D8%A7%D8%AF%DA%AF%D8%A7%D9%87%D9%87%D8%A7%D9%8A-%D8%B9%D9%85%D9%88%D9%85%D9%8A-%D9%88/",
 "آدک": "https://shenasname.ir/laws/2327-%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%A2%DB%8C%DB%8C%D9%86-%D8%AF%D8%A7%D8%AF%D8%B1%D8%B3%DB%8C-%DA%A9%DB%8C%D9%81%D8%B1%DB%8C",
 "تجارت": "https://www.ekhtebar.ir/%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%AA%D8%AC%D8%A7%D8%B1%D8%AA/",
 "ثبت": "https://www.ekhtebar.ir/%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%AB%D8%A8%D8%AA-%D8%A7%D8%B3%D9%86%D8%A7%D8%AF-%D9%88-%D8%A7%D9%85%D9%84%D8%A7%D9%83-%E2%80%8C%D9%85%D8%B5%D9%88%D8%A8-1310/",
 "چک": "https://www.ekhtebar.ir/%D9%85%D8%AA%D9%86-%D9%82%D8%A7%D9%86%D9%88%D9%86-%DA%86%DA%A9-%D8%A8%D8%A7-%D8%A2%D8%AE%D8%B1%DB%8C%D9%86-%D8%A7%D8%B5%D9%84%D8%A7%D8%AD%D8%A7%D8%AA/",
 "شوراها۱۴۰۲": "https://shenasname.ir/laws/7846-%D9%82%D8%A7%D9%86%D9%88%D9%86-%D8%B4%D9%88%D8%B1%D8%A7%D9%87%D8%A7%DB%8C-%D8%AD%D9%84-%D8%A7%D8%AE%D8%AA%D9%84%D8%A7%D9%81",
}

def clean(raw):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    return re.sub(r"[ \t‌]+", " ", t)

def fetch(name, url):
    out = f"corpus/{name}.txt"
    if os.path.exists(out) and os.path.getsize(out) > 20000:
        return out, os.path.getsize(out)
    r = subprocess.run(["curl", "-sL", "--max-time", "90", "-A", "Mozilla/5.0", url],
                       capture_output=True)
    txt = clean(r.stdout.decode("utf-8", "ignore"))
    open(out, "w", encoding="utf-8").write(txt)
    return out, len(txt)

if __name__ == "__main__":
    for n, u in SOURCES.items():
        p, s = fetch(n, u)
        print(f"{n:12s} {s:>8d}  {p}")
