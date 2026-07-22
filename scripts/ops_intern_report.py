#!/usr/bin/env python3
"""
Operations intern report script.

- Checks Operations API health at http://localhost:4000/api/health
- Reads data/sample_students.json
- Computes and prints/saves a summary report
"""

import json
import urllib.request
import urllib.error
from pathlib import Path

FULL_NAME = "Geoffrey Muli Musungu"
HEALTH_URL = "http://localhost:4000/api/health"
DATA_FILE = Path("data/sample_students.json")
REPORT_FILE = Path("docs/intern-submissions/Geoffrey-Muli-Musungu-report.txt")


def check_api_status(url: str) -> str:
    """Return 'UP' if the API health endpoint responds OK, else 'DOWN'."""
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            if response.status == 200:
                return "UP"
            return "DOWN"
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
        return "DOWN"


def load_students(path: Path) -> list:
    """Load the student records from the JSON data file."""
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_report(api_status: str, students: list) -> str:
    """Build the full text report as a single string."""
    total_students = len(students)
    in_credit_students = [s for s in students if s.get("balance", 0) < 0]
    total_in_credit = len(in_credit_students)
    total_balance = sum(s.get("balance", 0) for s in students)

    lines = []
    lines.append(FULL_NAME)
    lines.append("Operations Intern Report")
    lines.append("=" * 40)
    lines.append(f"API status: {api_status}")
    lines.append(f"Total students: {total_students}")
    lines.append(f"Students in credit / overdue (balance < 0): {total_in_credit}")

    if in_credit_students:
        lines.append("In-credit student names:")
        for s in in_credit_students:
            name = s.get("full_name", "Unknown")
            balance = s.get("balance", 0)
            lines.append(f"  - {name} (balance: {balance})")
    else:
        lines.append("In-credit student names: none")

    lines.append(f"Total balance of all students: {total_balance}")

    return "\n".join(lines) + "\n"


def main():
    api_status = check_api_status(HEALTH_URL)
    print(f"API status: {api_status}")

    students = load_students(DATA_FILE)

    total_students = len(students)
    in_credit_students = [s for s in students if s.get("balance", 0) < 0]
    total_balance = sum(s.get("balance", 0) for s in students)

    print(f"Total students: {total_students}")
    print(f"In-credit students: {len(in_credit_students)}")
    print("In-credit student names:")
    for s in in_credit_students:
        print(f"  - {s.get('full_name', 'Unknown')} (balance: {s.get('balance', 0)})")
    print(f"Total balance of all students: {total_balance}")

    report_text = build_report(api_status, students)

    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_FILE.write_text(report_text, encoding="utf-8")
    print(f"\nReport saved to {REPORT_FILE}")


if __name__ == "__main__":
    main()