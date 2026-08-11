import re

import pdfplumber


SCORE_TYPES = {
    "H",
    "A",
    "C",
    "CH",
    "CA",
    "EA",
    "EH",
    "ECH",
    "NA",
    "NH",
    "NCA",
    "NCH",
}

# Column boundaries expressed as fractions of the GHIN report page width. This
# keeps the reconstruction stable if the PDF is emitted at a different scale.
_COLUMN_BOUNDARIES = (
    0.0,
    100 / 1134,
    235 / 1134,
    320 / 1134,
    390 / 1134,
    440 / 1134,
    490 / 1134,
    565 / 1134,
    600 / 1134,
    650 / 1134,
    700 / 1134,
    770 / 1134,
    833 / 1134,
    865 / 1134,
    1090 / 1134,
    1.001,
)
_DATE_PATTERN = re.compile(r"^\d{1,2}/\d{1,2}/\d{4}$")
_BLANK_COLUMN = "__BLANK__"


def _horizontal_position(word):
    return (float(word["x0"]) + float(word["x1"])) / 2


def _column_text(words, page_width, left_fraction, right_fraction, top, bottom):
    selected = [
        word
        for word in words
        if left_fraction * page_width
        <= _horizontal_position(word)
        < right_fraction * page_width
        and top <= float(word["top"]) < bottom
    ]
    selected.sort(key=lambda word: (round(float(word["top"]), 1), float(word["x0"])))
    return " ".join(word["text"] for word in selected).strip()


def _round_anchors(words, page_width):
    type_left = _COLUMN_BOUNDARIES[5] * page_width
    type_right = _COLUMN_BOUNDARIES[6] * page_width
    date_left = _COLUMN_BOUNDARIES[6] * page_width
    date_right = _COLUMN_BOUNDARIES[7] * page_width

    date_words = [
        word
        for word in words
        if date_left <= _horizontal_position(word) < date_right
        and _DATE_PATTERN.fullmatch(word["text"])
    ]
    anchors = {
        float(word["top"])
        for word in words
        if type_left <= _horizontal_position(word) < type_right
        and word["text"] in SCORE_TYPES
        and any(abs(float(date["top"]) - float(word["top"])) <= 2 for date in date_words)
    }
    return sorted(anchors)


def reconstruct_scores_posted_page(words, page_width, page_height):
    """Rebuild logical report rows by using each PDF column's coordinates."""
    anchors = _round_anchors(words, page_width)
    if not anchors:
        return []

    course_left = _COLUMN_BOUNDARIES[13] * page_width
    course_right = _COLUMN_BOUNDARIES[14] * page_width
    table_header_tops = []
    for course_word in words:
        if (
            course_word["text"] == "Course"
            and course_left <= _horizontal_position(course_word) < course_right
        ):
            has_played = any(
                played_word["text"] == "Played"
                and course_left
                <= _horizontal_position(played_word)
                < course_right
                and abs(float(played_word["top"]) - float(course_word["top"])) <= 2
                for played_word in words
            )
            if has_played:
                table_header_tops.append(float(course_word["top"]))
    footer_tops = []
    for total_word in words:
        if total_word["text"] != "Total":
            continue
        has_scores = any(
            scores_word["text"].startswith("Scores:")
            and abs(float(scores_word["top"]) - float(total_word["top"])) <= 2
            for scores_word in words
        )
        if has_scores:
            footer_tops.append(float(total_word["top"]))

    rows = []
    for index, anchor in enumerate(anchors):
        if index == 0:
            preceding_headers = [top for top in table_header_tops if top < anchor]
            if preceding_headers:
                top = (max(preceding_headers) + anchor) / 2
            else:
                next_gap = anchors[1] - anchor if len(anchors) > 1 else page_height * 0.05
                top = anchor - next_gap / 2
        else:
            top = (anchors[index - 1] + anchor) / 2
        if index == len(anchors) - 1:
            following_footers = [footer for footer in footer_tops if footer > anchor]
            bottom = (
                (anchor + min(following_footers)) / 2
                if following_footers
                else page_height - (20 / 612.95996 * page_height)
            )
        else:
            bottom = (anchor + anchors[index + 1]) / 2
        columns = [
            _column_text(
                words,
                page_width,
                _COLUMN_BOUNDARIES[column],
                _COLUMN_BOUNDARIES[column + 1],
                top,
                bottom,
            )
            for column in range(len(_COLUMN_BOUNDARIES) - 1)
        ]
        # Preserve the eight fixed round columns even when GHIN displays a
        # blank Score H.I./NSD value. Parenthetical text after AGS describes
        # the partial-hole context; the numeric AGS remains the stored score.
        if columns[7]:
            columns[7] = columns[7].split()[0]
        player_columns = [column for column in columns[:5] if column]
        round_columns = [
            column or _BLANK_COLUMN for column in columns[5:13]
        ]
        trailing_columns = [column for column in columns[13:] if column]
        row = " ".join(player_columns + round_columns + trailing_columns).strip()
        if row:
            rows.append(row)

    return rows


def pdf_to_coordinate_text(path):
    """Extract Scores Posted rows without flattening wrapped course cells."""
    rows = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            words = page.extract_words(x_tolerance=1, y_tolerance=1) or []
            rows.extend(
                reconstruct_scores_posted_page(words, page.width, page.height)
            )
    return "\n".join(rows)
