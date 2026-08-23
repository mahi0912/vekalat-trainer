#!/usr/bin/env python3
"""
بررسی ایستای ماژول‌های جاوااسکریپت بدون نیاز به مرورگر.

۱. صحت نحوی هر فایل
۲. اینکه هر مسیر import واقعاً وجود دارد
۳. اینکه هر نامی که import می‌شود، در فایل مقصد export شده است

روی macOS از JavaScriptCore (osascript) و در CI از node استفاده می‌کند.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

JS_DIR = Path(__file__).resolve().parent.parent / "site" / "js"
errors: list[str] = []


def syntax_check(files: list[Path]) -> None:
    """import/export را حذف می‌کند و بقیه کد را برای اعتبارسنجی نحوی کامپایل می‌کند."""
    node = shutil.which("node")
    for f in files:
        src = f.read_text(encoding="utf-8")
        stripped = re.sub(r"^\s*import\s+[^;]+;\s*$", "", src, flags=re.M)
        stripped = re.sub(r"\bawait import\(", "Promise.resolve(", stripped)
        stripped = re.sub(r"^\s*export\s+(?=(default\s+)?(const|let|var|function|async|class))",
                          "", stripped, flags=re.M)
        stripped = re.sub(r"^\s*export\s*\{[^}]*\};?\s*$", "", stripped, flags=re.M)

        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
            t.write(stripped)
            tmp = t.name

        if node:
            proc = subprocess.run([node, "--check", tmp], capture_output=True, text=True)
        else:
            probe = ("var fs=$.NSString.stringWithContentsOfFileEncodingError("
                     f"{json.dumps(tmp)}, 4, $());\n"
                     "try { new Function(ObjC.unwrap(fs)); console.log('OK'); }\n"
                     "catch (e) { console.log('ERR ' + e.message); }")
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t2:
                t2.write(probe)
                probe_path = t2.name
            proc = subprocess.run(["osascript", "-l", "JavaScript", probe_path],
                                  capture_output=True, text=True)
            if "ERR" in proc.stdout:
                proc.returncode = 1
                proc.stderr = proc.stdout

        if proc.returncode != 0:
            errors.append(f"{f.name}: خطای نحوی — {(proc.stderr or proc.stdout).strip().splitlines()[0]}")


def import_check(files: list[Path]) -> None:
    exports: dict[str, set[str]] = {}
    for f in files:
        src = f.read_text(encoding="utf-8")
        names = set(re.findall(r"^\s*export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([\w$]+)", src, re.M))
        for block in re.findall(r"^\s*export\s*\{([^}]*)\}", src, re.M):
            names |= {n.strip().split()[-1] for n in block.split(",") if n.strip()}
        exports[f.name] = names

    for f in files:
        for names, path in re.findall(r"import\s+\{([^}]*)\}\s*from\s*'([^']+)'", f.read_text(encoding="utf-8")):
            target = (f.parent / path).resolve()
            if not target.exists():
                errors.append(f"{f.name}: مسیر import پیدا نشد → {path}")
                continue
            for raw in names.split(","):
                name = raw.strip().split()[0]
                if name and name not in exports.get(target.name, set()):
                    errors.append(f"{f.name}: «{name}» در {target.name} export نشده است")
        for path in re.findall(r"import\s+\*\s+as\s+\w+\s+from\s+'([^']+)'", f.read_text(encoding="utf-8")):
            if not (f.parent / path).resolve().exists():
                errors.append(f"{f.name}: مسیر import پیدا نشد → {path}")


def main() -> int:
    files = sorted(JS_DIR.glob("*.js"))
    if not files:
        print("::error::هیچ ماژول جاوااسکریپتی پیدا نشد")
        return 1
    syntax_check(files)
    import_check(files)
    for e in errors:
        print(f"::error::{e}")
    print(f"بررسی {len(files)} ماژول: " + ("ناموفق" if errors else "موفق"))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
