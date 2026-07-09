import os
import re
import sys
import time
import pdfplumber
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env.local")

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

SOURCE = "GHIN_HBH_PDF"

KNOWN_TEES = {"Blue", "Gold", "Red", "White"}
KNOWN_GENDERS = {"Male", "Female"}
SCORE_TYPES = {"H", "A", "C", "CH"}

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "1000"))
START_AT = int(os.environ.get("START_AT", "1"))


def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


supabase = get_client()


def to_number(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def to_int(value):
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def pdf_to_text(path):
    parts = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            parts.append(page.extract_text() or "")
    return "\n".join(parts)


def is_date(value):
    return bool(value and re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", value))


def parse_us_date(value):
    month, day, year = value.split("/")
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"


def clean_name(value):
    value = re.sub(r"\b([A-Z])\s+([a-z]{2,})\b", r"\1\2", value)
    value = re.sub(r"\bJef\s+frey\b", "Jeffrey", value)
    return re.sub(r"\s+", " ", value).strip()


def normalize_pdf_text(text):
    text = text.replace("\r", " ").replace("\n", " ")
    text = text.replace("T OT AL", "TOTAL")
    text = text.replace("T otal", "Total")
    text = text.replace("Date/T ime", "Date/Time")
    text = text.replace("T ee", "Tee")
    text = text.replace("T ype", "Type")
    text = text.replace("H o l e b y H o l e", "Hole by Hole")
    text = re.sub(r'[",\[\]]', " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text):
    return [t for t in normalize_pdf_text(text).split(" ") if t]


def is_integer_token(value):
    return bool(value and re.match(r"^-?\d+$", value))


def is_number_token(value):
    return bool(value and re.match(r"^[+-]?\d+(\.\d+)?$", value))


def find_date_within(tokens, start, max_lookahead=8):
    for i in range(start, min(len(tokens), start + max_lookahead + 1)):
        if is_date(tokens[i]):
            return i
    return -1


def is_likely_ghin_start(tokens, index):
    token = tokens[index] if index < len(tokens) else None
    if not token or not re.match(r"^\d{3,}$", token):
        return False

    date_index = find_date_within(tokens, index + 1, 8)
    if date_index == -1:
        return False

    name_tokens = tokens[index + 1 : date_index]
    if len(name_tokens) < 2 or len(name_tokens) > 6:
        return False

    bad_words = {
        "Page",
        "Report",
        "Execution",
        "Date",
        "Time",
        "GHIN",
        "Golfer",
        "Name",
        "TOTAL",
        "Total",
        "Scores",
    }

    return not any(t in bad_words for t in name_tokens)


def parse_scores(tokens, start):
    raw = tokens[start : start + 21]

    if len(raw) != 21 or any(not is_integer_token(t) for t in raw):
        return None

    nums = list(map(int, raw))
    holes = nums[:9] + nums[10:19]
    out_score = nums[9]
    in_score = nums[19]
    total_score = nums[20]

    if sum(holes[:9]) != out_score:
        return None
    if sum(holes[9:]) != in_score:
        return None
    if sum(holes) != total_score:
        return None

    return {
        "holes": holes,
        "outScore": out_score,
        "inScore": in_score,
        "totalScore": total_score,
        "nextIndex": start + 21,
    }


def create_import_key(round_row):
    return "|".join(
        str(x if x is not None else "")
        for x in [
            round_row["ghinNumber"],
            round_row["golferName"],
            round_row["playedAt"],
            round_row["scoreType"],
            round_row["teeName"],
            round_row["teeGender"],
            round_row["courseRating"],
            round_row["slopeRating"],
            round_row["totalScore"],
            "-".join(map(str, round_row["holes"])),
        ]
    )


def parse_round_at(tokens, date_index, golfer):
    raw_date = tokens[date_index]
    played_at = parse_us_date(raw_date)

    i = date_index + 1

    raw_handicap_index = tokens[i] if i < len(tokens) else None
    if not is_number_token(raw_handicap_index):
        return None
    i += 1

    course_handicap = None
    if i + 1 < len(tokens) and is_number_token(tokens[i]) and tokens[i + 1] in SCORE_TYPES:
        course_handicap = to_int(tokens[i])
        i += 1

    score_type = tokens[i] if i < len(tokens) else None
    if score_type not in SCORE_TYPES:
        return None
    i += 1

    tee_name = golfer["teeName"]
    tee_gender = golfer["teeGender"]
    course_rating = golfer["courseRating"]
    slope_rating = golfer["slopeRating"]

    if (
        i + 3 < len(tokens)
        and tokens[i] in KNOWN_TEES
        and tokens[i + 1] in KNOWN_GENDERS
        and is_number_token(tokens[i + 2])
        and is_integer_token(tokens[i + 3])
    ):
        tee_name = tokens[i]
        tee_gender = tokens[i + 1]
        course_rating = to_number(tokens[i + 2])
        slope_rating = to_int(tokens[i + 3])
        i += 4

    scores = parse_scores(tokens, i)
    if not scores:
        return None

    round_row = {
        "ghinNumber": golfer["ghinNumber"],
        "golferName": golfer["golferName"],
        "playedAt": played_at,
        "handicapIndex": to_number(raw_handicap_index),
        "courseHandicap": course_handicap,
        "scoreType": score_type,
        "teeName": tee_name,
        "teeGender": tee_gender,
        "courseRating": course_rating,
        "slopeRating": slope_rating,
        "holes": scores["holes"],
        "outScore": scores["outScore"],
        "inScore": scores["inScore"],
        "totalScore": scores["totalScore"],
    }

    round_row["importKey"] = create_import_key(round_row)

    return round_row, scores["nextIndex"]


def parse_hole_by_hole_text(text):
    tokens = tokenize(text)
    valid = []
    invalid = []

    current_golfer = None
    i = 0

    while i < len(tokens):
        if is_likely_ghin_start(tokens, i):
            date_index = find_date_within(tokens, i + 1, 8)

            current_golfer = {
                "ghinNumber": tokens[i],
                "golferName": clean_name(" ".join(tokens[i + 1 : date_index])),
                "teeName": None,
                "teeGender": None,
                "courseRating": None,
                "slopeRating": None,
            }

            parsed = parse_round_at(tokens, date_index, current_golfer)

            if parsed:
                row, i = parsed
                valid.append(row)

                current_golfer.update(
                    {
                        "teeName": row["teeName"],
                        "teeGender": row["teeGender"],
                        "courseRating": row["courseRating"],
                        "slopeRating": row["slopeRating"],
                    }
                )
                continue

            invalid.append(" ".join(tokens[i : i + 40]))
            i = date_index + 1
            continue

        if current_golfer and is_date(tokens[i]):
            parsed = parse_round_at(tokens, i, current_golfer)

            if parsed:
                row, i = parsed
                valid.append(row)

                current_golfer.update(
                    {
                        "teeName": row["teeName"],
                        "teeGender": row["teeGender"],
                        "courseRating": row["courseRating"],
                        "slopeRating": row["slopeRating"],
                    }
                )
                continue

            invalid.append(" ".join(tokens[i : i + 40]))

        i += 1

    seen = set()
    deduped = []

    for row in valid:
        if row["importKey"] not in seen:
            seen.add(row["importKey"])
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


def find_or_create_player(row):
    global supabase

    first, last = split_name(row["golferName"])

    match = (
        supabase.table("players")
        .select("id, full_name, ghin_number")
        .eq("ghin_number", row["ghinNumber"])
        .limit(1)
        .execute()
        .data
    )

    if match:
        player_id = match[0]["id"]

        supabase.table("players").update(
            {
                "first_name": first,
                "last_name": last,
                "current_index": row["handicapIndex"],
                "is_active": True,
            }
        ).eq("id", player_id).execute()

        return player_id, False

    players = supabase.table("players").select("id, full_name, ghin_number").execute().data or []

    name_match = next(
        (
            p
            for p in players
            if normalize_name(p.get("full_name")) == normalize_name(row["golferName"])
        ),
        None,
    )

    if name_match and is_temp_ghin(name_match.get("ghin_number")):
        player_id = name_match["id"]

        supabase.table("players").update(
            {
                "first_name": first,
                "last_name": last,
                "ghin_number": row["ghinNumber"],
                "current_index": row["handicapIndex"],
                "is_active": True,
            }
        ).eq("id", player_id).execute()

        return player_id, False

    created = (
        supabase.table("players")
        .insert(
            {
                "first_name": first,
                "last_name": last,
                "ghin_number": row["ghinNumber"],
                "current_index": row["handicapIndex"],
                "is_active": True,
                "sync_enabled": True,
            }
        )
        .execute()
        .data
    )

    return created[0]["id"], True


def get_course_holes(tee_name):
    global supabase

    rows = (
        supabase.table("course_holes")
        .select("hole_number, par, handicap")
        .eq("course_name", "Goodrich")
        .eq("tee_name", tee_name or "")
        .execute()
        .data
        or []
    )

    return {
        int(row["hole_number"]): {
            "par": to_int(row.get("par")),
            "handicap": to_int(row.get("handicap")),
        }
        for row in rows
    }


def build_external_key(player_id, row):
    return "|".join(
        str(x if x is not None else "")
        for x in [
            player_id,
            row["playedAt"],
            row["scoreType"],
            row["teeName"],
            row["courseRating"],
            row["slopeRating"],
            row["totalScore"],
            "-".join(map(str, row["holes"])),
        ]
    )


def upsert_round(player_id, row):
    global supabase

    external_key = build_external_key(player_id, row)

    existing = (
        supabase.table("rounds")
        .select("id")
        .eq("external_round_key", external_key)
        .limit(1)
        .execute()
        .data
    )

    if not existing:
        existing = (
            supabase.table("rounds")
            .select("id")
            .eq("player_id", player_id)
            .eq("played_at", row["playedAt"])
            .eq("gross_score", row["totalScore"])
            .eq("tee_name", row["teeName"])
            .eq("source", SOURCE)
            .limit(1)
            .execute()
            .data
        )

    score_type = row["scoreType"] or ""

    # Hole-by-hole reports do NOT contain the official GHIN differential.
    # Do not include differential, PCC, ESR, or net score differential in the
    # update payload, or a re-import will wipe values previously loaded from
    # the Scores Posted report.
    update_payload = {
        "gross_score": to_int(row["totalScore"]),
        "adjusted_gross_score": to_int(row["totalScore"]),
        "course_rating": row["courseRating"],
        "slope_rating": to_int(row["slopeRating"]),
        "score_type": score_type or None,
        "tee_name": row["teeName"],
        "course_name": "Goodrich",
        "handicap_index_used": row["handicapIndex"],
        "score_handicap_index": row["handicapIndex"],
        "is_home": "H" in score_type,
        "is_away": "A" in score_type,
        "is_competition": "C" in score_type,
        "ghin_number": row["ghinNumber"],
        "source": SOURCE,
        "external_round_key": external_key,
    }

    insert_payload = {
        "player_id": player_id,
        "played_at": row["playedAt"],
        **update_payload,
        # New HBH-only rounds start without an official differential. The
        # Scores Posted importer will fill this later when available.
        "differential": None,
    }

    if existing:
        round_id = existing[0]["id"]
        supabase.table("rounds").update(update_payload).eq("id", round_id).execute()
        return round_id, False

    created = supabase.table("rounds").insert(insert_payload).execute().data
    return created[0]["id"], True

def replace_hole_scores(round_id, player_id, row):
    global supabase

    supabase.table("hole_scores").delete().eq("round_id", round_id).execute()

    course_holes = get_course_holes(row["teeName"])
    holes = []

    for idx, score in enumerate(row["holes"], start=1):
        hole_info = course_holes.get(idx, {})
        par = to_int(hole_info.get("par"))
        stroke_index = to_int(hole_info.get("handicap"))
        gross_score = to_int(score)

        holes.append(
            {
                "round_id": round_id,
                "player_id": player_id,
                "played_at": row["playedAt"],
                "score_type": row["scoreType"],
                "tee_name": row["teeName"],
                "tee_gender": row["teeGender"],
                "course_rating": row["courseRating"],
                "slope_rating": to_int(row["slopeRating"]),
                "course_handicap": to_int(row["courseHandicap"]),
                "handicap_index_used": row["handicapIndex"],
                "source": SOURCE,
                "hole_number": idx,
                "gross_score": gross_score,
                "par": par,
                "score_to_par": None if par is None else gross_score - par,
                "stroke_index": stroke_index,
            }
        )

    supabase.table("hole_scores").insert(holes).execute()

    return len(holes)


def import_file(path):
    global supabase

    text = pdf_to_text(path)
    rounds, invalid = parse_hole_by_hole_text(text)

    print(f"Parsed {len(rounds)} valid rounds, {len(invalid)} invalid rows.")
    print(f"START_AT={START_AT}, BATCH_SIZE={BATCH_SIZE}")

    imported = 0
    existing = 0
    holes_imported = 0
    players_created = 0
    players_updated = 0

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
                f"{row['golferName']} {row['playedAt']} {row['teeName']} {row['totalScore']} "
                f"| ETA {eta/60:.1f}m"
            )

            player_id, created = find_or_create_player(row)

            players_created += int(created)
            players_updated += int(not created)

            round_id, was_imported = upsert_round(player_id, row)

            imported += int(was_imported)
            existing += int(not was_imported)

            holes_imported += replace_hole_scores(round_id, player_id, row)

        print(f"=== Finished batch {batch_start + 1}-{batch_end} ===")

    print("\nDone")
    print(f"Rounds imported: {imported}")
    print(f"Existing/updated rounds: {existing}")
    print(f"Holes imported: {holes_imported}")
    print(f"Players created: {players_created}")
    print(f"Players updated: {players_updated}")
    print(f"Invalid rows: {len(invalid)}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_hole_by_hole.py path/to/report.pdf")
        sys.exit(1)

    import_file(sys.argv[1])