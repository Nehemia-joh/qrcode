#!/usr/bin/env python3
"""Copy sample Kitchen/Farm/Facilities Dashboard.json into a school's data folder."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ("kitchen", "farm", "facilities")


def main() -> None:
    p = argparse.ArgumentParser(description="Seed module dashboard JSON for demos")
    p.add_argument("--school", default="sl-main", help="School id (default sl-main)")
    p.add_argument("--module", choices=[*MODULES, "all"], default="all")
    args = p.parse_args()

    targets = MODULES if args.module == "all" else (args.module,)
    for mod in targets:
        src = ROOT / "data" / "seeds" / mod / "Dashboard.json"
        dst_dir = ROOT / "data" / "schools" / args.school / mod
        dst = dst_dir / "Dashboard.json"
        if not src.exists():
            print(f"Skip {mod}: seed missing at {src}")
            continue
        dst_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        print(f"Seeded {mod} → {dst}")

    print("Done. Refresh Kitchen/Farm/Facilities dashboards in the app.")


if __name__ == "__main__":
    main()
