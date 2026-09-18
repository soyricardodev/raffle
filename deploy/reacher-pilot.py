#!/usr/bin/env python3
"""Audit a bounded recipient sample through the local Reacher wrapper.

This command is intentionally read-only: it never updates recipient verification
or suppression tables. The JSONL report contains PII and is created with mode 0600.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default="/home/admin/raffle/data/raffle.db")
    parser.add_argument("--secret-file", default="/home/admin/reacher/reacher.secret")
    parser.add_argument("--url", default="http://127.0.0.1:8081/v1/check_email")
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=65.0)
    parser.add_argument("--output-dir", default="/home/admin/reacher/audits")
    return parser.parse_args()


def select_recipients(connection: sqlite3.Connection, limit: int) -> tuple[int, list[dict[str, Any]]]:
    active = connection.execute(
        "SELECT id FROM raffles WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if not active:
        raise RuntimeError("No active raffle found")
    raffle_id = int(active[0])

    active_rows = connection.execute(
        """
        SELECT lower(trim(customer_email)) AS email, max(created_at) AS last_seen
        FROM purchases
        WHERE raffle_id = ?
          AND customer_email IS NOT NULL
          AND trim(customer_email) <> ''
        GROUP BY lower(trim(customer_email))
        ORDER BY last_seen DESC
        LIMIT ?
        """,
        (raffle_id, limit),
    ).fetchall()
    recipients = [
        {"email": str(row[0]), "source": "active_raffle", "last_seen": int(row[1])}
        for row in active_rows
    ]

    remaining = limit - len(recipients)
    if remaining > 0:
        active_emails = {row["email"] for row in recipients}
        historical_rows = connection.execute(
            """
            SELECT lower(trim(customer_email)) AS email, max(created_at) AS last_seen
            FROM purchases
            WHERE customer_email IS NOT NULL
              AND trim(customer_email) <> ''
              AND raffle_id <> ?
            GROUP BY lower(trim(customer_email))
            ORDER BY last_seen DESC
            """,
            (raffle_id,),
        )
        for row in historical_rows:
            email = str(row[0])
            if email in active_emails:
                continue
            recipients.append(
                {"email": email, "source": "recent_history", "last_seen": int(row[1])}
            )
            if len(recipients) >= limit:
                break

    return raffle_id, recipients


def verify(url: str, secret: str, email: str, timeout: float) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        method="POST",
        headers={"content-type": "application/json", "x-reacher-secret": secret},
        data=json.dumps({"to_email": email}).encode(),
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        return {"is_reachable": "unknown", "audit_error": f"http_{error.code}"}
    except Exception as error:  # noqa: BLE001 - preserve a bounded audit error
        return {"is_reachable": "unknown", "audit_error": type(error).__name__}


def main() -> int:
    args = parse_args()
    if args.limit < 1 or args.limit > 1_000:
        raise ValueError("limit must be between 1 and 1000")

    secret = Path(args.secret_file).read_text(encoding="utf-8").strip()
    if len(secret) < 16:
        raise RuntimeError("Reacher secret is missing or too short")

    connection = sqlite3.connect(f"file:{args.database}?mode=ro", uri=True)
    try:
        raffle_id, recipients = select_recipients(connection, args.limit)
    finally:
        connection.close()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    report_path = output_dir / f"reacher-pilot-{timestamp}.jsonl"
    summary_path = output_dir / f"reacher-pilot-{timestamp}.summary.json"

    states: Counter[str] = Counter()
    sources: Counter[str] = Counter(row["source"] for row in recipients)
    started = time.monotonic()

    descriptor = os.open(report_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as report:
        for index, recipient in enumerate(recipients, start=1):
            result = verify(args.url, secret, recipient["email"], args.timeout)
            state = str(result.get("is_reachable") or "unknown")
            if state not in {"safe", "risky", "invalid", "unknown"}:
                state = "unknown"
            states[state] += 1
            report.write(
                json.dumps(
                    {
                        "email": recipient["email"],
                        "source": recipient["source"],
                        "last_seen": recipient["last_seen"],
                        "state": state,
                        "result": result,
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                + "\n"
            )
            report.flush()
            if index % 25 == 0 or index == len(recipients):
                print(f"checked={index}/{len(recipients)} states={dict(states)}", flush=True)
            if index < len(recipients):
                time.sleep(args.delay)

    summary = {
        "raffle_id": raffle_id,
        "requested": args.limit,
        "checked": len(recipients),
        "sources": dict(sources),
        "states": dict(states),
        "duration_seconds": round(time.monotonic() - started, 2),
        "report": str(report_path),
        "audit_only": True,
    }
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    summary_path.chmod(0o600)
    print(json.dumps(summary, separators=(",", ":")), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
