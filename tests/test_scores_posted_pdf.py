import unittest

from scripts.utils.parser_utils import (
    clean_course_name,
    split_scores_posted_course_and_pcc,
)
from scripts.utils.scores_posted_pdf import reconstruct_scores_posted_page


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


if __name__ == "__main__":
    unittest.main()
