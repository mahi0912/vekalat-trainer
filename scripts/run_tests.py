#!/usr/bin/env python3
"""
اجرای تست‌های منطقی روی ماژول‌های جاوااسکریپت.

هر فایل tests/*_test.js به دنبال ماژول متناظرش در site/js/ چسبانده و اجرا می‌شود.
روی macOS با JavaScriptCore و در CI با node اجرا می‌شود.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / "tests"
MODULES = ROOT / "site" / "js"


def bundle(entry: Path, seen: set[str] | None = None) -> str:
    """ماژول و وابستگی‌های محلی‌اش را به ترتیب وابستگی به هم می‌چسباند."""
    seen = seen if seen is not None else set()
    if entry.name in seen:
        return ""
    seen.add(entry.name)

    src = entry.read_text(encoding="utf-8")
    out = []
    for dep in re.findall(r"^\s*import\s+(?:[^;]*?)\s*from\s*'(\./[^']+)'", src, re.M):
        out.append(bundle((entry.parent / dep).resolve(), seen))

    src = re.sub(r"^\s*import\s+[^;]+;\s*$", "", src, flags=re.M)
    src = re.sub(r"^\s*export\s+(?=(default\s+)?(const|let|var|function|async|class))", "", src, flags=re.M)
    src = re.sub(r"^\s*export\s*\{[^}]*\};?\s*$", "", src, flags=re.M)
    out.append(f"// ── {entry.name} ──\n{src}")
    return "\n".join(out)


def run(js_path: str) -> subprocess.CompletedProcess:
    node = shutil.which("node")
    if node:
        return subprocess.run([node, js_path], capture_output=True, text=True)
    return subprocess.run(["osascript", "-l", "JavaScript", js_path], capture_output=True, text=True)


def main() -> int:
    files = sorted(TESTS.glob("*_test.js"))
    if not files:
        print("::error::هیچ تستی پیدا نشد")
        return 1

    failed = 0
    for test in files:
        module = MODULES / (test.name.replace("_test.js", ".js"))
        if not module.exists():
            print(f"::error::ماژول {module.name} برای {test.name} پیدا نشد")
            failed += 1
            continue

        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
            fixture = TESTS / "fixture.json"
            preamble = ""
            if fixture.exists():
                preamble = "var FIXTURE = " + json.dumps(
                    fixture.read_text(encoding="utf-8"), ensure_ascii=False) + ";\n"
            # داخل یک تابع پیچیده می‌شود تا نام‌هایی مثل $ با گلوبال‌های
            # مفسر تداخل نکنند (JavaScriptCore خودش $ دارد)
            t.write("(function(){\n" + bundle(module) + "\n" + preamble
                    + test.read_text(encoding="utf-8") + "\n})();\n")
            tmp = t.name

        print(f"── {test.name} ──")
        proc = run(tmp)
        out = (proc.stdout or "") + (proc.stderr or "")
        print(out.rstrip())
        if proc.returncode != 0 or "FAIL" in out or "ناموفق" in out:
            failed += 1

    print("\nنتیجه تست‌ها: " + ("ناموفق" if failed else "همه موفق"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
