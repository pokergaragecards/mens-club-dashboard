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

_NEW_RICHMOND_CANONICAL = "New Richmond GC - Old"
_NEW_RICHMOND_FULL = re.compile(
    r"^New Richmond GC\s*-\s*New Richmond GC\s*-\s*Old$",
    re.IGNORECASE,
)
_NEW_RICHMOND_OLD_FRAGMENT = re.compile(
    r"^(?:[+-]\d+\s+)?-\s*Old(?:\s+New Richmond GC\s*-\s*New Richmond GC\s*-?)?$",
    re.IGNORECASE,
)
_NEW_RICHMOND_LEAKED_SUFFIX = re.compile(
    r"\s+New Richmond GC\s*-\s*New Richmond GC\s*-?$",
    re.IGNORECASE,
)


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

    if _NEW_RICHMOND_FULL.fullmatch(cleaned):
        return _NEW_RICHMOND_CANONICAL

    if _NEW_RICHMOND_OLD_FRAGMENT.fullmatch(cleaned):
        return _NEW_RICHMOND_CANONICAL

    # A wrapped New Richmond course can be emitted above the row it belongs to
    # and appended to the preceding course. Preserve that preceding course.
    without_leaked_suffix = _NEW_RICHMOND_LEAKED_SUFFIX.sub("", cleaned).strip(" -")
    if without_leaked_suffix != cleaned.strip(" -") and without_leaked_suffix:
        cleaned = without_leaked_suffix

    # Scores Posted can bleed the next row after Goodrich Golf Course.
    # Keep the valid course name and discard the appended row text.
    if cleaned.lower().startswith("goodrich golf course "):
        return "Goodrich Golf Course"

    return cleaned


def split_scores_posted_course_and_pcc(course_name, pcc=None):
    """Normalize a course and recover a PCC displaced before '- Old'."""
    cleaned = normalize_whitespace(course_name)
    displaced_pcc = re.match(r"^([+-]\d+)\s+(-\s*Old\b.*)$", cleaned, re.IGNORECASE)
    if displaced_pcc:
        if pcc is None:
            pcc = int(displaced_pcc.group(1))
        cleaned = displaced_pcc.group(2)

    return clean_course_name(cleaned), pcc


def normalize_course_name(course_name):
    cleaned = clean_course_name(course_name).lower()

    cleaned = re.sub(r"\bgolf course\b", "", cleaned)
    cleaned = re.sub(r"\bgolf club\b", "", cleaned)
    cleaned = re.sub(r"\bgc\b", "", cleaned)
    cleaned = re.sub(r"\band country club\b", "", cleaned)

    return normalize_whitespace(cleaned)
