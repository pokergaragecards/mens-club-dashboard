import re

_HEADER_MARKERS = (
    "Total Scores:",
    "Report Execution Date",
    "Handicap Round Score",
    "GHIN Number",
    "Golfer Name",
    "Golfer Status",
    "Course Played",
    "Score H.I.",
    "Score HI",
    "Score H.I",
    "Page ",
)

_BAD_EXACT_COURSE_NAMES = {
    "course",
    "played",
    "course played",
    "pine",
}


def normalize_whitespace(text):
    if not text:
        return ""

    return re.sub(r"\s+", " ", str(text)).strip()


def clean_course_name(course_name):
    cleaned = normalize_whitespace(course_name)

    if not cleaned:
        return ""

    for marker in _HEADER_MARKERS:
        idx = cleaned.find(marker)
        if idx >= 0:
            cleaned = cleaned[:idx]
            break

    cleaned = normalize_whitespace(cleaned)

    if cleaned.lower() in _BAD_EXACT_COURSE_NAMES:
        return ""

    # Scores Posted can bleed the next row after Goodrich Golf Course.
    # Keep the valid course name and discard the appended row text.
    if cleaned.lower().startswith("goodrich golf course "):
        return "Goodrich Golf Course"

    return cleaned


def normalize_course_name(course_name):
    cleaned = clean_course_name(course_name).lower()

    cleaned = re.sub(r"\bgolf course\b", "", cleaned)
    cleaned = re.sub(r"\bgolf club\b", "", cleaned)
    cleaned = re.sub(r"\bgc\b", "", cleaned)
    cleaned = re.sub(r"\band country club\b", "", cleaned)

    return normalize_whitespace(cleaned)