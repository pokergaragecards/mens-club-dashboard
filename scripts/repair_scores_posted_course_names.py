import argparse
import os
from collections import defaultdict
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

from import_scores_posted import parse_scores_posted_text
from utils.scores_posted_pdf import pdf_to_coordinate_text


SOURCE = "SCORES_POSTED_REPORT"
PAGE_SIZE = 1000
MISSING_ROUND_TYPES_TO_INSERT = {"NCA", "NCH"}
DEFAULT_REPORTS = (
    Path("scripts/Downloads/Scores Posted Report.pdf"),
    Path("scripts/Downloads/archive/Scores Posted Report.pdf"),
    Path("scripts/Downloads/archive/Scores Posted Report-7-7-YEAR.pdf"),
)


def _numeric_key(value, decimals=3):
    if value is None or value == "":
        return ""
    return f"{float(value):.{decimals}f}"


def parsed_natural_key(round_row):
    return (
        str(round_row.get("ghinNumber") or ""),
        str(round_row.get("playedAt") or ""),
        str(round_row.get("scoreType") or ""),
        _numeric_key(round_row.get("adjustedGrossScore"), 0),
        _numeric_key(round_row.get("courseRating")),
        _numeric_key(round_row.get("slopeRating"), 0),
        _numeric_key(round_row.get("differential")),
    )


def database_natural_key(round_row):
    return (
        str(round_row.get("ghin_number") or ""),
        str(round_row.get("played_at") or ""),
        str(round_row.get("score_type") or ""),
        _numeric_key(round_row.get("adjusted_gross_score"), 0),
        _numeric_key(round_row.get("course_rating")),
        _numeric_key(round_row.get("slope_rating"), 0),
        _numeric_key(round_row.get("differential")),
    )


def load_authoritative_rounds(report_paths):
    authoritative = {}
    report_stats = []

    for report_path in report_paths:
        path = Path(report_path)
        if not path.is_file():
            raise FileNotFoundError(f"Scores Posted report not found: {path}")

        logical_text = pdf_to_coordinate_text(str(path))
        rounds, invalid = parse_scores_posted_text(logical_text)
        if invalid:
            raise RuntimeError(
                f"{path} still has {len(invalid)} invalid rows; repair aborted."
            )

        report_stats.append(
            {
                "path": str(path),
                "logical_rows": len(logical_text.splitlines()),
                "unique_rows": len(rounds),
                "nca_rows": sum(row["scoreType"] == "NCA" for row in rounds),
                "nch_rows": sum(row["scoreType"] == "NCH" for row in rounds),
            }
        )

        for round_row in rounds:
            key = parsed_natural_key(round_row)
            existing = authoritative.get(key)
            if existing:
                existing_identity = (existing["courseName"], existing.get("pcc"))
                new_identity = (round_row["courseName"], round_row.get("pcc"))
                if existing_identity != new_identity:
                    raise RuntimeError(
                        "Conflicting source reports for "
                        f"{round_row['golferName']} {round_row['playedAt']}: "
                        f"{existing_identity!r} vs {new_identity!r}."
                    )
                continue
            authoritative[key] = round_row

    return authoritative, report_stats


def load_all(client, table, fields, source=None):
    rows = []
    offset = 0
    while True:
        query = client.table(table).select(fields)
        if source:
            query = query.eq("source", source)
        page = query.range(offset, offset + PAGE_SIZE - 1).execute().data or []
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def insert_payload(round_row, player_id):
    score_type = round_row["scoreType"]
    return {
        "player_id": player_id,
        "played_at": round_row["playedAt"],
        "posted_at": None,
        "gross_score": round_row["adjustedGrossScore"],
        "adjusted_gross_score": round_row["adjustedGrossScore"],
        "differential": round_row["differential"],
        "course_rating": round_row["courseRating"],
        "slope_rating": round_row["slopeRating"],
        "pcc": round_row.get("pcc"),
        "score_type": score_type,
        "course_name": round_row["courseName"],
        "score_handicap_index": round_row.get("scoreHandicapIndex"),
        "net_score_differential": round_row.get("netScoreDifferential"),
        "handicap_index_used": round_row.get("scoreHandicapIndex"),
        "is_home": "H" in score_type,
        "is_away": "A" in score_type,
        "is_competition": "C" in score_type,
        "ghin_number": round_row["ghinNumber"],
        "golfer_status": round_row.get("golferStatus"),
        "round_count": round_row.get("roundCount"),
        "source": SOURCE,
        "external_round_key": round_row["externalKey"],
    }


def build_repair_plan(authoritative, database_rounds, players):
    database_by_key = defaultdict(list)
    database_by_external_key = {}
    for database_round in database_rounds:
        database_by_key[database_natural_key(database_round)].append(database_round)
        external_key = database_round.get("external_round_key")
        if external_key:
            database_by_external_key[external_key] = database_round["id"]

    player_by_ghin = {
        str(player.get("ghin_number") or ""): player["id"] for player in players
    }
    updates = []
    inserts = []
    unresolved = []
    unmatched_other = []

    for key, source_round in authoritative.items():
        matches = database_by_key.get(key, [])
        if matches:
            if len(matches) > 1:
                raise RuntimeError(
                    "Duplicate Scores Posted database rounds share the natural key for "
                    f"{source_round['golferName']} {source_round['playedAt']} "
                    f"{source_round['scoreType']}; repair aborted."
                )
            for database_round in matches:
                payload = {
                    "course_name": source_round["courseName"],
                    "pcc": source_round.get("pcc"),
                    "external_round_key": source_round["externalKey"],
                }
                changed = (
                    database_round.get("course_name") != payload["course_name"]
                    or database_round.get("pcc") != payload["pcc"]
                    or database_round.get("external_round_key")
                    != payload["external_round_key"]
                )
                if not changed:
                    continue
                conflicting_id = database_by_external_key.get(
                    payload["external_round_key"]
                )
                if conflicting_id and conflicting_id != database_round["id"]:
                    raise RuntimeError(
                        "External-key conflict while repairing round "
                        f"{database_round['id']}: key already belongs to {conflicting_id}."
                    )
                updates.append(
                    {
                        "id": database_round["id"],
                        "played_at": source_round["playedAt"],
                        "golfer_name": source_round["golferName"],
                        "old_course": database_round.get("course_name"),
                        "old_pcc": database_round.get("pcc"),
                        "payload": payload,
                    }
                )
            continue

        if source_round["scoreType"] not in MISSING_ROUND_TYPES_TO_INSERT:
            unmatched_other.append(source_round)
            continue

        player_id = player_by_ghin.get(source_round["ghinNumber"])
        if not player_id:
            unresolved.append(source_round)
            continue

        conflicting_id = database_by_external_key.get(source_round["externalKey"])
        if conflicting_id:
            raise RuntimeError(
                "External-key conflict for missing round "
                f"{source_round['golferName']} {source_round['playedAt']}: "
                f"key belongs to {conflicting_id}."
            )
        inserts.append(
            {
                "played_at": source_round["playedAt"],
                "golfer_name": source_round["golferName"],
                "score_type": source_round["scoreType"],
                "course_name": source_round["courseName"],
                "payload": insert_payload(source_round, player_id),
            }
        )

    return {
        "updates": updates,
        "inserts": inserts,
        "unresolved": unresolved,
        "unmatched_other": unmatched_other,
    }


def print_plan(report_stats, authoritative, database_rounds, plan):
    for stat in report_stats:
        print(
            f"{stat['path']}: {stat['logical_rows']} logical rows, "
            f"{stat['unique_rows']} unique, {stat['nch_rows']} NCH, "
            f"{stat['nca_rows']} NCA, 0 invalid"
        )
    print(f"Authoritative unique source rounds: {len(authoritative)}")
    print(f"Scores Posted database rounds checked: {len(database_rounds)}")
    print(f"Course/PCC repairs: {len(plan['updates'])}")
    print(f"Missing NCH/NCA rounds to insert: {len(plan['inserts'])}")
    print(f"Missing NCH/NCA rounds without a player match: {len(plan['unresolved'])}")
    print(
        "Other source rounds absent from the database (reported, not inserted): "
        f"{len(plan['unmatched_other'])}"
    )

    for update in plan["updates"]:
        payload = update["payload"]
        print(
            f"UPDATE {update['golfer_name']} {update['played_at']}: "
            f"{update['old_course']!r} -> {payload['course_name']!r}; "
            f"PCC {update['old_pcc']!r} -> {payload['pcc']!r}"
        )
    for insert in plan["inserts"]:
        print(
            f"INSERT {insert['golfer_name']} {insert['played_at']} "
            f"{insert['score_type']} {insert['course_name']}"
        )
    for unresolved in plan["unresolved"]:
        print(
            f"UNRESOLVED {unresolved['golferName']} "
            f"GHIN {unresolved['ghinNumber']} {unresolved['playedAt']}"
        )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Rebuild authoritative Scores Posted rows from PDF coordinates, "
            "repair course/PCC fields, and insert missing NCH/NCA rounds."
        )
    )
    parser.add_argument(
        "reports",
        nargs="*",
        help="Scores Posted PDFs. Defaults to the current and archived reports.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply the printed plan. Without this flag, the script is read-only.",
    )
    args = parser.parse_args()

    report_paths = [Path(path) for path in args.reports] or list(DEFAULT_REPORTS)
    authoritative, report_stats = load_authoritative_rounds(report_paths)

    load_dotenv(".env.local")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )
    client = create_client(url, key)
    database_rounds = load_all(
        client,
        "rounds",
        (
            "id,ghin_number,played_at,score_type,adjusted_gross_score,"
            "course_rating,slope_rating,differential,course_name,pcc,"
            "external_round_key"
        ),
        source=SOURCE,
    )
    players = load_all(client, "players", "id,ghin_number")
    plan = build_repair_plan(authoritative, database_rounds, players)
    print_plan(report_stats, authoritative, database_rounds, plan)

    if plan["unresolved"]:
        raise RuntimeError("Repair aborted: one or more NCH/NCA players are unresolved.")
    if not args.apply:
        print("Dry run only. Re-run with --apply to execute this exact repair plan.")
        return

    for update in plan["updates"]:
        (
            client.table("rounds")
            .update(update["payload"])
            .eq("id", update["id"])
            .execute()
        )
    for insert in plan["inserts"]:
        client.table("rounds").insert(insert["payload"]).execute()

    verified_rounds = load_all(
        client,
        "rounds",
        (
            "id,ghin_number,played_at,score_type,adjusted_gross_score,"
            "course_rating,slope_rating,differential,course_name,pcc,"
            "external_round_key"
        ),
        source=SOURCE,
    )
    remaining = build_repair_plan(authoritative, verified_rounds, players)
    if remaining["updates"] or remaining["inserts"] or remaining["unresolved"]:
        raise RuntimeError(
            "Post-repair verification failed: "
            f"{len(remaining['updates'])} updates, "
            f"{len(remaining['inserts'])} inserts, and "
            f"{len(remaining['unresolved'])} unresolved rounds remain."
        )
    print(
        f"Applied and verified {len(plan['updates'])} repairs and "
        f"{len(plan['inserts'])} NCH/NCA inserts."
    )


if __name__ == "__main__":
    main()
