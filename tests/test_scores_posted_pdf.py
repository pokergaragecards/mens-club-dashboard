import sys
import types
import unittest
from pathlib import Path

from scripts.utils.parser_utils import (
    clean_course_name,
    split_scores_posted_course_and_pcc,
)
from scripts.utils.scores_posted_pdf import reconstruct_scores_posted_page


if "dotenv" not in sys.modules:
    dotenv = types.ModuleType("dotenv")
    dotenv.load_dotenv = lambda *args, **kwargs: None
    sys.modules["dotenv"] = dotenv
if "supabase" not in sys.modules:
    supabase = types.ModuleType("supabase")
    supabase.create_client = lambda *args, **kwargs: None
    sys.modules["supabase"] = supabase

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from repair_scores_posted_course_names import (  # noqa: E402
    build_repair_plan,
    parsed_natural_key,
)


def word(text, x0, x1, top):
    return {"text": text, "x0": x0, "x1": x1, "top": top}


class ScoresPostedPdfTests(unittest.TestCase):
    def test_reconstructs_wrapped_course_inside_its_visual_row(self):
        words = [
            word("CH", 457, 474, 81.3),
            word("7/11/2026", 499, 552, 81.3),
            word("83", 572, 585, 79.0),
            word("65.7", 610, 634, 81.3),
            word("113", 665, 685, 81.3),
            word("17.3", 723, 747, 81.3),
            word("19.8", 805, 828, 81.3),
            word("-2.5", 839, 860, 81.3),
            word("Goodrich", 866, 914, 81.3),
            word("Golf", 918, 940, 81.3),
            word("Course", 943, 982, 81.3),
            word("New", 866, 890, 102.3),
            word("Richmond", 893, 947, 102.3),
            word("GC", 950, 968, 102.3),
            word("-", 972, 976, 102.3),
            word("New", 979, 1003, 102.3),
            word("Richmond", 1006, 1060, 102.3),
            word("GC", 1064, 1082, 102.3),
            word("11733617", 42, 95, 109.0),
            word("Wyatt", 101, 132, 109.0),
            word("Sommers", 135, 187, 109.0),
            word("Active", 237, 270, 109.0),
            word("17.1", 353, 377, 109.0),
            word("3", 408, 415, 109.0),
            word("H", 461, 470, 109.0),
            word("8/2/2026", 502, 549, 109.0),
            word("100", 569, 589, 107.5),
            word("71.1", 610, 634, 109.0),
            word("125", 665, 685, 109.0),
            word("26.1", 723, 747, 109.0),
            word("17.1", 805, 828, 109.0),
            word("9.0", 843, 860, 109.0),
            word("-", 866, 870, 115.8),
            word("Old", 873, 892, 115.8),
            word("H", 461, 470, 142.0),
            word("8/1/2026", 502, 549, 142.0),
            word("90", 572, 585, 140.5),
            word("71.1", 610, 634, 142.0),
            word("125", 665, 685, 142.0),
            word("17.1", 723, 747, 142.0),
            word("17.5", 805, 828, 142.0),
            word("-0.4", 839, 860, 142.0),
            word("New", 866, 890, 135.3),
            word("Richmond", 893, 947, 135.3),
            word("GC", 950, 968, 135.3),
            word("-", 972, 976, 135.3),
            word("New", 979, 1003, 135.3),
            word("Richmond", 1006, 1060, 135.3),
            word("GC", 1064, 1082, 135.3),
            word("-", 866, 870, 148.8),
            word("Old", 873, 892, 148.8),
        ]

        rows = reconstruct_scores_posted_page(words, 1134, 612.95996)

        self.assertIn("Goodrich Golf Course", rows[0])
        self.assertNotIn("Richmond", rows[0])
        self.assertIn("New Richmond GC - New Richmond GC - Old", rows[1])
        self.assertIn("New Richmond GC - New Richmond GC - Old", rows[2])

    def test_normalizes_new_richmond_and_preserves_preceding_course(self):
        self.assertEqual(
            clean_course_name("New Richmond GC - New Richmond GC - Old"),
            "New Richmond GC - Old",
        )
        self.assertEqual(
            clean_course_name("- Old New Richmond GC - New Richmond GC"),
            "New Richmond GC - Old",
        )
        self.assertEqual(
            clean_course_name(
                "Monticello Country Club New Richmond GC - New Richmond GC -"
            ),
            "Monticello Country Club",
        )

    def test_recovers_displaced_pcc(self):
        self.assertEqual(
            split_scores_posted_course_and_pcc("+1 - Old"),
            ("New Richmond GC - Old", 1),
        )

    def test_coordinate_rows_strip_parenthetical_ags_and_keep_blank_columns(self):
        words = [
            word("11733617", 42, 95, 109.0),
            word("Wyatt", 101, 132, 109.0),
            word("Sommers", 135, 187, 109.0),
            word("Active", 237, 270, 109.0),
            word("17.1", 353, 377, 109.0),
            word("3", 408, 415, 109.0),
            word("NCH", 457, 480, 109.0),
            word("8/1/2026", 502, 549, 109.0),
            word("45", 569, 581, 107.5),
            word("(11)", 582, 597, 107.5),
            word("34.4", 610, 634, 109.0),
            word("121", 665, 685, 109.0),
            word("15.0", 723, 747, 109.0),
            word("NH", 780, 800, 109.0),
            word("Goodrich", 866, 914, 109.0),
            word("Golf", 918, 940, 109.0),
            word("Course", 943, 982, 109.0),
        ]

        rows = reconstruct_scores_posted_page(words, 1134, 612.95996)

        self.assertEqual(len(rows), 1)
        self.assertIn("NCH 8/1/2026 45 34.4 121 15.0 NH __BLANK__", rows[0])
        self.assertNotIn("(11)", rows[0])

    def test_repair_plan_updates_courses_and_inserts_only_missing_nca(self):
        existing_source = {
            "ghinNumber": "11733617",
            "golferName": "Wyatt Sommers",
            "golferStatus": "Active",
            "handicapIndex": 17.1,
            "roundCount": 3,
            "scoreType": "H",
            "playedAt": "2026-05-22",
            "adjustedGrossScore": 109,
            "courseRating": 71.1,
            "slopeRating": 125,
            "differential": 34.3,
            "scoreHandicapIndex": 17.1,
            "netScoreDifferential": 17.2,
            "courseName": "New Richmond GC - Old",
            "pcc": None,
            "externalKey": "correct-existing-key",
        }
        missing_nca = {
            **existing_source,
            "scoreType": "NCA",
            "playedAt": "2026-05-17",
            "adjustedGrossScore": 42,
            "courseRating": 34.4,
            "slopeRating": 121,
            "differential": 15.0,
            "scoreHandicapIndex": 12.8,
            "netScoreDifferential": 2.2,
            "courseName": "Monticello Country Club",
            "externalKey": "missing-nca-key",
        }
        authoritative = {
            parsed_natural_key(existing_source): existing_source,
            parsed_natural_key(missing_nca): missing_nca,
        }
        database_rounds = [
            {
                "id": "round-1",
                "ghin_number": "11733617",
                "played_at": "2026-05-22",
                "score_type": "H",
                "adjusted_gross_score": 109,
                "course_rating": 71.1,
                "slope_rating": 125,
                "differential": 34.3,
                "course_name": (
                    "New Richmond GC - New Richmond GC - Old "
                    "NCA 5/17/2026 42 34.4 121 15.0 12.8 2.2 "
                    "Monticello Country Club"
                ),
                "pcc": None,
                "external_round_key": "damaged-existing-key",
            }
        ]

        plan = build_repair_plan(
            authoritative,
            database_rounds,
            [{"id": "player-1", "ghin_number": "11733617"}],
        )

        self.assertEqual(len(plan["updates"]), 1)
        self.assertEqual(
            plan["updates"][0]["payload"]["course_name"],
            "New Richmond GC - Old",
        )
        self.assertEqual(len(plan["inserts"]), 1)
        self.assertEqual(plan["inserts"][0]["score_type"], "NCA")
        self.assertTrue(plan["inserts"][0]["payload"]["is_away"])
        self.assertTrue(plan["inserts"][0]["payload"]["is_competition"])
        self.assertFalse(plan["inserts"][0]["payload"]["is_home"])
        self.assertEqual(plan["unresolved"], [])


if __name__ == "__main__":
    unittest.main()
