import argparse
import os
import re

from dotenv import load_dotenv
from supabase import create_client

from utils.parser_utils import split_scores_posted_course_and_pcc


SOURCE = "SCORES_POSTED_REPORT"
PAGE_SIZE = 1000
_NEW_RICHMOND_DAMAGE = re.compile(r"New Richmond|^(?:[+-]\d+\s+)?-\s*Old\b", re.I)


def external_key(round_row, course_name):
    return "|".join(
        str(value if value is not None else "")
        for value in [
            "SCORES_POSTED",
            round_row.get("ghin_number"),
            round_row.get("played_at"),
            round_row.get("score_type"),
            round_row.get("adjusted_gross_score"),
            round_row.get("course_rating"),
            round_row.get("slope_rating"),
            round_row.get("differential"),
            course_name,
        ]
    )


def load_scores_posted_rounds(client):
    fields = (
        "id,ghin_number,played_at,score_type,adjusted_gross_score,course_rating,"
        "slope_rating,differential,course_name,pcc,external_round_key"
    )
    rows = []
    offset = 0
    while True:
        page = (
            client.table("rounds")
            .select(fields)
            .eq("source", SOURCE)
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
            .data
            or []
        )
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


def proposed_repairs(rows):
    repairs = []
    for row in rows:
        old_course = str(row.get("course_name") or "").strip()
        if not _NEW_RICHMOND_DAMAGE.search(old_course):
            continue

        new_course, new_pcc = split_scores_posted_course_and_pcc(
            old_course, row.get("pcc")
        )
        new_key = external_key(row, new_course)
        if (
            new_course != old_course
            or new_pcc != row.get("pcc")
            or new_key != row.get("external_round_key")
        ):
            repairs.append(
                {
                    "id": row["id"],
                    "played_at": row.get("played_at"),
                    "old_course": old_course,
                    "course_name": new_course,
                    "old_pcc": row.get("pcc"),
                    "pcc": new_pcc,
                    "external_round_key": new_key,
                }
            )
    return repairs


def main():
    parser = argparse.ArgumentParser(
        description="Repair New Richmond course names damaged by PDF row wrapping."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply repairs. Without this flag, only print the proposed changes.",
    )
    args = parser.parse_args()

    load_dotenv(".env.local")
    client = create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )
    rows = load_scores_posted_rounds(client)
    repairs = proposed_repairs(rows)

    print(f"Scores Posted rounds checked: {len(rows)}")
    print(f"New Richmond repairs found: {len(repairs)}")
    for repair in repairs:
        print(
            f"{repair['id']} {repair['played_at']}: "
            f"{repair['old_course']!r} -> {repair['course_name']!r}; "
            f"PCC {repair['old_pcc']!r} -> {repair['pcc']!r}"
        )

    if not args.apply:
        print("Dry run only. Re-run with --apply to update these rows.")
        return

    for repair in repairs:
        payload = {
            "course_name": repair["course_name"],
            "pcc": repair["pcc"],
            "external_round_key": repair["external_round_key"],
        }
        client.table("rounds").update(payload).eq("id", repair["id"]).execute()

    remaining = proposed_repairs(load_scores_posted_rounds(client))
    if remaining:
        raise RuntimeError(f"Verification failed: {len(remaining)} repairs remain.")

    print(f"Applied and verified {len(repairs)} repairs.")


if __name__ == "__main__":
    main()
