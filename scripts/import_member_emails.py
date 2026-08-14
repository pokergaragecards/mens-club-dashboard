import argparse
import csv
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Match a roster CSV to players by GHIN number and populate empty "
            "player email fields. The command is a dry run unless --apply is used."
        )
    )
    parser.add_argument("csv_path", help="CSV containing GHIN, name, and email columns")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write validated email addresses to the database",
    )
    return parser.parse_args()


def first_value(row, names):
    for name in names:
        value = row.get(name)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def normalize_ghin(value):
    value = str(value or "").strip()
    if value.endswith(".0"):
        value = value[:-2]
    return re.sub(r"\D", "", value)


def normalize_name(value):
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def load_roster(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = []
        for line_number, row in enumerate(reader, start=2):
            ghin = normalize_ghin(
                first_value(row, ("GHIN Number", "GHIN", "ghin_number"))
            )
            name = first_value(row, ("Member Name", "Golfer Name", "full_name"))
            email = first_value(row, ("Email Address", "Email", "email")).lower()

            if not ghin or not name or not EMAIL_PATTERN.fullmatch(email):
                raise ValueError(
                    f"Invalid roster row {line_number}: GHIN, name, and a valid email are required."
                )

            rows.append({"ghin": ghin, "name": name, "email": email})

    ghins = [row["ghin"] for row in rows]
    emails = [row["email"] for row in rows]
    if len(ghins) != len(set(ghins)):
        raise ValueError("The roster contains duplicate GHIN numbers.")
    if len(emails) != len(set(emails)):
        raise ValueError("The roster contains duplicate email addresses.")

    return rows


def get_client():
    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )
    return create_client(url, key)


def main():
    args = parse_args()
    csv_path = Path(args.csv_path).expanduser().resolve()
    if not csv_path.is_file():
        raise FileNotFoundError(f"Roster CSV not found: {csv_path}")

    roster = load_roster(csv_path)
    client = get_client()

    try:
        response = client.table("players").select(
            "id, full_name, ghin_number, email"
        ).execute()
    except Exception as error:
        if "email" in str(error).lower():
            raise RuntimeError(
                "The players.email column is unavailable. Apply "
                "supabase/migrations/202608140001_add_player_email.sql first."
            ) from error
        raise

    players_by_ghin = {}
    duplicate_db_ghins = set()
    for player in response.data or []:
        ghin = normalize_ghin(player.get("ghin_number"))
        if not ghin:
            continue
        if ghin in players_by_ghin:
            duplicate_db_ghins.add(ghin)
        players_by_ghin[ghin] = player

    updates = []
    unchanged = []
    conflicts = []
    unmatched = []
    name_warnings = []

    for member in roster:
        player = players_by_ghin.get(member["ghin"])
        if not player or member["ghin"] in duplicate_db_ghins:
            unmatched.append(member)
            continue

        player_name = str(player.get("full_name") or "").strip()
        if normalize_name(player_name) != normalize_name(member["name"]):
            name_warnings.append((member, player_name))

        current_email = str(player.get("email") or "").strip().lower()
        if not current_email:
            updates.append((member, player))
        elif current_email == member["email"]:
            unchanged.append(member)
        else:
            conflicts.append((member, current_email))

    print(f"Roster rows: {len(roster)}")
    print(f"Ready to add: {len(updates)}")
    print(f"Already current: {len(unchanged)}")
    print(f"Existing-email conflicts preserved: {len(conflicts)}")
    print(f"Unmatched or duplicate DB GHINs: {len(unmatched)}")
    print(f"GHIN matches with name differences: {len(name_warnings)}")

    for member, existing in conflicts:
        print(
            f"CONFLICT GHIN {member['ghin']}: {member['name']} | "
            f"database={existing} roster={member['email']}"
        )
    for member in unmatched:
        print(f"UNMATCHED GHIN {member['ghin']}: {member['name']}")
    for member, database_name in name_warnings:
        print(
            f"NAME CHECK GHIN {member['ghin']}: "
            f"database={database_name} roster={member['name']}"
        )

    if not args.apply:
        print("Dry run only. Re-run with --apply to write the ready records.")
        return 0

    for member, player in updates:
        client.table("players").update({"email": member["email"]}).eq(
            "id", player["id"]
        ).execute()

    player_ids = [player["id"] for _, player in updates]
    verified = 0
    if player_ids:
        verification = client.table("players").select("id, email").in_(
            "id", player_ids
        ).execute()
        expected_by_id = {
            player["id"]: member["email"] for member, player in updates
        }
        verified = sum(
            1
            for player in verification.data or []
            if str(player.get("email") or "").strip().lower()
            == expected_by_id.get(player.get("id"))
        )

    if verified != len(updates):
        raise RuntimeError(
            f"Verification failed: expected {len(updates)} updates, verified {verified}."
        )

    print(f"Applied and verified: {verified}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
