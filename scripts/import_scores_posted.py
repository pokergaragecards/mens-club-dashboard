import os
import re
import sys
import time
import pdfplumber
from dotenv import load_dotenv
from supabase import create_client
from utils.parser_utils import clean_course_name, normalize_course_name

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

SOURCE = "SCORES_POSTED_REPORT"
HBH_SOURCE = "GHIN_HBH_PDF"

STATUSES = {"Active", "Inactive"}
SCORE_TYPES = {"H", "A", "C", "CH", "CA", "EA", "EH", "ECH", "NA", "NH"}

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "1000"))
START_AT = int(os.environ.get("START_AT", "1"))


def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


supabase = get_client()


def pdf_to_text(path: str) -> str:
    parts = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            parts.append(page.extract_text() or "")
    return "\n".join(parts)


def normalize_text(text: str) -> str:
    text = text.replace("\r", " ").replace("\n", " ")
    text = re.sub(r'[",\[\]]', " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text: str):
    return [t for t in normalize_text(text).split(" ") if t]


def is_date(value):
    return bool(value and re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", value))


def parse_date(value):
    month, day, year = value.split("/")
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def parse_number(value):
    if not value:
        return None
    try:
        return float(value.replace(",", ""))
    except ValueError:
        return None


def to_int(value):
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def parse_ghin_number(value):
    if not value:
        return None
    if value.startswith("+"):
        n = parse_number(value[1:])
        return -n if n is not None else None
    return parse_number(value)


def is_integer(value):
    return bool(value and re.match(r"^\d+$", value))


def is_number_like(value):
    return bool(value and re.match(r"^[+-]?\d+(\.\d+)?$", value))


def is_score_type(value):
    return value in SCORE_TYPES


def clean_name(value):
    return re.sub(r"\s+", " ", value).strip()


def parse_course_name(tokens):
    if not tokens:
        return "", None

    last = tokens[-1]

    if re.match(r"^[+-]\d+$", last):
        course_name = " ".join(tokens[:-1]).strip()
        return clean_course_name(course_name), int(last)

    course_name = " ".join(tokens).strip()
    return clean_course_name(course_name), None


def is_player_start(tokens, index):
    if not re.match(r"^\d{3,}$", tokens[index] if index < len(tokens) else ""):
        return False

    for i in range(index + 1, min(index + 9, len(tokens))):
        if tokens[i] in STATUSES:
            return (
                is_number_like(tokens[i + 1] if i + 1 < len(tokens) else None)
                and is_integer(tokens[i + 2] if i + 2 < len(tokens) else None)
                and is_score_type(tokens[i + 3] if i + 3 < len(tokens) else None)
                and is_date(tokens[i + 4] if i + 4 < len(tokens) else None)
            )

    return False


def find_next_boundary(tokens, start):
    for i in range(start, len(tokens)):
        if is_player_start(tokens, i):
            return i

        if is_score_type(tokens[i]) and is_date(
            tokens[i + 1] if i + 1 < len(tokens) else None
        ):
            return i

    return len(tokens)


def create_external_key(round_row):
    return "|".join(
        str(x if x is not None else "")
        for x in [
            "SCORES_POSTED",
            round_row["ghinNumber"],
            round_row["playedAt"],
            round_row["scoreType"],
            round_row["adjustedGrossScore"],
            round_row["courseRating"],
            round_row["slopeRating"],
            round_row["differential"],
            round_row["courseName"],
        ]
    )


def parse_round_at(tokens, start, player):
    score_type = tokens[start] if start < len(tokens) else None
    raw_date = tokens[start + 1] if start + 1 < len(tokens) else None

    if not is_score_type(score_type) or not is_date(raw_date):
        return None

    adjusted_gross_score = parse_number(
        tokens[start + 2] if start + 2 < len(tokens) else None
    )
    course_rating = parse_number(
        tokens[start + 3] if start + 3 < len(tokens) else None
    )
    slope_rating = parse_number(
        tokens[start + 4] if start + 4 < len(tokens) else None
    )
    differential = parse_ghin_number(
        tokens[start + 5] if start + 5 < len(tokens) else None
    )
    score_handicap_index = parse_ghin_number(
        tokens[start + 6] if start + 6 < len(tokens) else None
    )
    net_score_differential = parse_number(
        tokens[start + 7] if start + 7 < len(tokens) else None
    )

    if None in [
        adjusted_gross_score,
        course_rating,
        slope_rating,
        differential,
        score_handicap_index,
        net_score_differential,
    ]:
        return None

    course_start = start + 8
    next_index = find_next_boundary(tokens, course_start)
    course_name, pcc = parse_course_name(tokens[course_start:next_index])

    if not course_name:
        return None

    round_row = {
        **player,
        "scoreType": score_type,
        "playedAt": parse_date(raw_date),
        "adjustedGrossScore": to_int(adjusted_gross_score),
        "courseRating": course_rating,
        "slopeRating": to_int(slope_rating),
        "differential": differential,
        "scoreHandicapIndex": score_handicap_index,
        "netScoreDifferential": net_score_differential,
        "courseName": course_name,
        "pcc": pcc,
    }

    round_row["externalKey"] = create_external_key(round_row)

    return round_row, next_index


def parse_scores_posted_text(text):
    tokens = tokenize(text)
    valid = []
    invalid = []
    current_player = None
    i = 0

    while i < len(tokens):
        if is_player_start(tokens, i):
            ghin_number = tokens[i]
            status_index = -1

            for j in range(i + 1, min(i + 9, len(tokens))):
                if tokens[j] in STATUSES:
                    status_index = j
                    break

            if status_index == -1:
                i += 1
                continue

            current_player = {
                "ghinNumber": ghin_number,
                "golferName": clean_name(" ".join(tokens[i + 1 : status_index])),
                "golferStatus": tokens[status_index],
                "handicapIndex": parse_ghin_number(tokens[status_index + 1]),
                "roundCount": to_int(parse_number(tokens[status_index + 2])),
            }

            parsed = parse_round_at(tokens, status_index + 3, current_player)

            if parsed:
                round_row, i = parsed
                valid.append(round_row)
                continue

            invalid.append(" ".join(tokens[i : i + 35]))
            i += 1
            continue

        if current_player and is_score_type(tokens[i]) and is_date(
            tokens[i + 1] if i + 1 < len(tokens) else None
        ):
            parsed = parse_round_at(tokens, i, current_player)

            if parsed:
                round_row, i = parsed
                valid.append(round_row)
                continue

            invalid.append(" ".join(tokens[i : i + 35]))

        i += 1

    seen = set()
    deduped = []

    for row in valid:
        if row["externalKey"] not in seen:
            seen.add(row["externalKey"])
            deduped.append(row)

    return deduped, invalid[:25]


def split_name(full_name):
    parts = full_name.strip().split()

    if len(parts) == 1:
        return parts[0], ""

    return " ".join(parts[:-1]), parts[-1]


def normalize_name(value):
    return re.sub(r"\s+", "", (value or "").lower()).strip()


def is_temp_ghin(value):
    return not value or str(value).startswith("TEMP-")


def find_or_create_player(round_row):
    global supabase

    first, last = split_name(round_row["golferName"])

    match = (
        supabase.table("players")
        .select("id, full_name, ghin_number")
        .eq("ghin_number", round_row["ghinNumber"])
        .limit(1)
        .execute()
        .data
    )

    payload = {
        "first_name": first,
        "last_name": last,
        "current_index": round_row["handicapIndex"],
        "golfer_status": round_row["golferStatus"],
        "last_round_count": round_row["roundCount"],
        "is_active": round_row["golferStatus"] == "Active",
    }

    if match:
        player_id = match[0]["id"]
        supabase.table("players").update(payload).eq("id", player_id).execute()
        return player_id, False

    players = (
        supabase.table("players")
        .select("id, full_name, ghin_number")
        .execute()
        .data
        or []
    )

    name_match = next(
        (
            p
            for p in players
            if normalize_name(p.get("full_name"))
            == normalize_name(round_row["golferName"])
        ),
        None,
    )

    if name_match and is_temp_ghin(name_match.get("ghin_number")):
        player_id = name_match["id"]

        supabase.table("players").update(
            {
                **payload,
                "ghin_number": round_row["ghinNumber"],
            }
        ).eq("id", player_id).execute()

        return player_id, False

    created = (
        supabase.table("players")
        .insert(
            {
                "first_name": first,
                "last_name": last,
                "ghin_number": round_row["ghinNumber"],
                "current_index": round_row["handicapIndex"],
                "golfer_status": round_row["golferStatus"],
                "last_round_count": round_row["roundCount"],
                "is_active": round_row["golferStatus"] == "Active",
                "sync_enabled": True,
            }
        )
        .execute()
        .data
    )

    return created[0]["id"], True


def update_player_handicap_index(player_id, round_row):
    """Refresh current HI immediately from the Scores Posted player header."""
    supabase.table("players").update(
        {
            "current_index": round_row["handicapIndex"],
            "golfer_status": round_row["golferStatus"],
            "last_round_count": round_row["roundCount"],
            "is_active": round_row["golferStatus"] == "Active",
        }
    ).eq("id", player_id).execute()


def is_goodrich(course_name):
    return "goodrich" in (course_name or "").lower()


def missing(existing, key):
    return existing.get(key) is None


def update_goodrich_hbh(player_id, round_row):
    global supabase

    query = (
        supabase.table("rounds")
        .select("*")
        .eq("player_id", player_id)
        .eq("played_at", round_row["playedAt"])
        .eq("gross_score", round_row["adjustedGrossScore"])
        .eq("source", HBH_SOURCE)
        .limit(1)
        .execute()
        .data
    )

    if not query:
        return False

    existing = query[0]

    payload = {
        "adjusted_gross_score": existing.get("adjusted_gross_score")
        if existing.get("adjusted_gross_score") is not None
        else round_row["adjustedGrossScore"],
        "differential": existing.get("differential")
        if existing.get("differential") is not None
        else round_row["differential"],
        "course_rating": existing.get("course_rating")
        if existing.get("course_rating") is not None
        else round_row["courseRating"],
        "slope_rating": existing.get("slope_rating")
        if existing.get("slope_rating") is not None
        else round_row["slopeRating"],
        "pcc": existing.get("pcc")
        if existing.get("pcc") is not None
        else round_row["pcc"],
        "score_type": existing.get("score_type") or round_row["scoreType"],
        "score_handicap_index": existing.get("score_handicap_index")
        if existing.get("score_handicap_index") is not None
        else round_row["scoreHandicapIndex"],
        "net_score_differential": existing.get("net_score_differential")
        if existing.get("net_score_differential") is not None
        else round_row["netScoreDifferential"],
        "handicap_index_used": existing.get("handicap_index_used")
        if existing.get("handicap_index_used") is not None
        else round_row["scoreHandicapIndex"],
        "ghin_number": existing.get("ghin_number") or round_row["ghinNumber"],
        "golfer_status": existing.get("golfer_status")
        or round_row["golferStatus"],
        "round_count": existing.get("round_count")
        if existing.get("round_count") is not None
        else round_row["roundCount"],
    }

    supabase.table("rounds").update(payload).eq("id", existing["id"]).execute()

    supabase.table("hole_scores").update(
        {
            "differential": payload["differential"],
            "handicap_index_used": payload["handicap_index_used"],
        }
    ).eq("round_id", existing["id"]).execute()

    return True


def find_existing_scores_posted_round(player_id, round_row):
    by_key = (
        supabase.table("rounds")
        .select("id")
        .eq("external_round_key", round_row["externalKey"])
        .limit(1)
        .execute()
        .data
    )

    if by_key:
        return by_key[0]

    natural = (
        supabase.table("rounds")
        .select("id")
        .eq("player_id", player_id)
        .eq("played_at", round_row["playedAt"])
        .eq("source", SOURCE)
        .eq("score_type", round_row["scoreType"] or "")
        .eq("adjusted_gross_score", round_row["adjustedGrossScore"])
        .eq("differential", round_row["differential"])
        .limit(1)
        .execute()
        .data
    )

    return natural[0] if natural else None


def insert_or_update_scores_posted(player_id, round_row):
    global supabase

    existing = find_existing_scores_posted_round(player_id, round_row)

    score_type = round_row["scoreType"] or ""

    payload = {
        "player_id": player_id,
        "played_at": round_row["playedAt"],
        "posted_at": None,
        "gross_score": round_row["adjustedGrossScore"],
        "adjusted_gross_score": round_row["adjustedGrossScore"],
        "differential": round_row["differential"],
        "course_rating": round_row["courseRating"],
        "slope_rating": round_row["slopeRating"],
        "pcc": round_row["pcc"],
        "score_type": score_type,
        "course_name": round_row["courseName"],
        "score_handicap_index": round_row["scoreHandicapIndex"],
        "net_score_differential": round_row["netScoreDifferential"],
        "handicap_index_used": round_row["scoreHandicapIndex"],
        "is_home": "H" in score_type,
        "is_away": "A" in score_type,
        "is_competition": "C" in score_type,
        "ghin_number": round_row["ghinNumber"],
        "golfer_status": round_row["golferStatus"],
        "round_count": round_row["roundCount"],
        "source": SOURCE,
        "external_round_key": round_row["externalKey"],
    }

    if existing:
        supabase.table("rounds").update(payload).eq("id", existing["id"]).execute()
        return False

    supabase.table("rounds").insert(payload).execute()
    return True


def import_file(path):
    global supabase

    text = pdf_to_text(path)
    rounds, invalid = parse_scores_posted_text(text)

    print(f"Parsed {len(rounds)} valid rounds, {len(invalid)} invalid rows.")
    print(f"START_AT={START_AT}, BATCH_SIZE={BATCH_SIZE}")

    imported = 0
    existing = 0
    goodrich_updated = 0
    players_created = 0
    players_updated = 0
    rows_failed = 0

    started = time.time()

    for batch_start in range(0, len(rounds), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(rounds))

        if batch_end < START_AT:
            continue

        print(f"\n=== Batch {batch_start + 1}-{batch_end} of {len(rounds)} ===")

        supabase = get_client()

        batch = rounds[batch_start:batch_end]

        for offset, row in enumerate(batch):
            idx = batch_start + offset + 1

            if idx < START_AT:
                continue

            elapsed = time.time() - started
            done = idx - START_AT + 1
            rate = done / elapsed if elapsed > 0 else 0
            remaining = len(rounds) - idx
            eta = remaining / rate if rate > 0 else 0

            print(
                f"[{idx}/{len(rounds)}] "
                f"{row['golferName']} {row['playedAt']} "
                f"{row['courseName']} {row['adjustedGrossScore']} "
                f"diff {row['differential']} | ETA {eta / 60:.1f}m"
            )

            try:
                player_id, created = find_or_create_player(row)

                # Update the player's current HI as soon as we see the
                # Scores Posted player header, regardless of what happens
                # later with Goodrich/HBH matching or round upserts.
                update_player_handicap_index(player_id, row)

                players_created += int(created)
                players_updated += int(not created)

                # Enrich matching Goodrich hole-by-hole rows, but still
                # insert/update the official Scores Posted round below.
                if is_goodrich(row["courseName"]) and update_goodrich_hbh(
                    player_id, row
                ):
                    goodrich_updated += 1

                if insert_or_update_scores_posted(player_id, row):
                    imported += 1
                else:
                    existing += 1

            except Exception as error:
                rows_failed += 1
                print(
                    f"FAILED ROW {idx}: "
                    f"{row.get('golferName')} {row.get('playedAt')} "
                    f"{row.get('courseName')} — {error}"
                )
                continue

        print(f"=== Finished batch {batch_start + 1}-{batch_end} ===")

    print("\nDone")
    print(f"Rounds imported: {imported}")
    print(f"Existing/updated: {existing}")
    print(f"Goodrich HBH updated: {goodrich_updated}")
    print(f"Players created: {players_created}")
    print(f"Players updated: {players_updated}")
    print(f"Rows failed: {rows_failed}")
    print(f"Invalid rows: {len(invalid)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_scores_posted.py path/to/report.pdf")
        sys.exit(1)

    import_file(sys.argv[1])