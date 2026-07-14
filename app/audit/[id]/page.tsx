Sun, Jun 28 at 10:29 AM
this is an example of what the scores look like, ""
Pasted text(15).txt
Document
just shows text, ""
this key? 
the button text still dark ""
Hole by Hole Scores Report-6-28-2026.pdf
PDF
here is the hole by hole report
Thought for 4s

Yes — this is exactly the kind of file we need next.

The PDF is a Hole by Hole Scores Report for Goodrich Golf Course, Men’s: All Tees, covering scores played 1/1/2026–6/28/2026. It has 1,188 total scores and includes each golfer’s GHIN, name, date, handicap index, course handicap, score type, tee, rating/slope, holes 1–18, OUT/IN/TOTAL.

Next steps:

Add database columns/tables for hole scores
We already have hole_scores, but we should expand it slightly for source tracking.
Build a PDF parser/importer
This report is PDF, not Excel, so we’ll parse rows from the PDF text.
It has some duplicate adjusted/unadjusted score rows, so we’ll need duplicate detection.
Match players by GHIN number
If the golfer is not in players, we can auto-create them.
If they exist, attach the hole-by-hole round to that player.
Store every hole
One round creates 18 hole_scores rows.
Add hole analytics
Best/worst holes
Avg score by hole
Double bogey rate
Par/birdie/bogey percentages
Goodrich hole difficulty by player

Next I’d start with the SQL cleanup for hole_scores and then build a utils/holeByHoleParser.ts file.

no second box, ""
now the score import doesnt locate the proper golfer name for me, these all are importing for dale, the naming convention looks like this
It looks like this through edge browser, 
didnt work, but when I turned it off, the downloads look better
teh only good one was with the program closed 
Mon, Jun 29 at 9:02 PM
ScottLarsenScores_20260630_HaAfyn.xlsx
Spreadsheet
Some imports failed, like the attached shows "	invalid input syntax for type integer: "0.5""
ChuckKueflerScores_20260630_WIirJT.xlsx
Spreadsheet
I get one last erro on import for "duplicate key value violates unique constraint "rounds_external_round_key_unique_constraint"" for the attached
some players show up twice,I believe its because the PDF has their name parsed oddly 
still showing review for people missing comp scores         
Tue, Jun 30 at 3:23 PM
and the actual page shows this 
Missing many rounds 
Hole by Hole Scores Report-6-30-2026.pdf
PDF
there was one round on 5/15/2026 where Andy Brunn showed an 80 and an 8 on hole #1, is that true?

I checked the uploaded GHIN Hole-by-Hole report.

I do not see an Andy Brunn round on 5/15/2026. His 2026 entries around that date are:

5/10/2026 (Competition, White) — 80, with 5 on hole #1.
5/2/2026 (Competition, White) — 74, with 6 on hole #1.
5/1/2026 (Home) — 77, with 5 on hole #1.

I did find a 5/15/2026 score of 80, but it belongs to Nolan Brunn, not Andy:

5/15/2026 (Competition) — 80
Hole #1 = 5 (not 8)

So based on the GHIN report:

❌ Andy Brunn did not have a 5/15/2026 round.
❌ I do not see an 80 with an 8 on hole #1 for Andy.
The only nearby 80 is Andy's 5/10/2026 round, and hole #1 was 5.
The 5/15/2026 score of 80 belongs to Nolan Brunn, whose hole #1 was 5.

This makes me suspect your importer may have shifted dates or assigned one player's round to another. If you want, we can compare the imported database row for Andy against the PDF to pinpoint exactly where the mismatch occurred.

He had this one for sure 
missign hole #1
its still not red 
Pasted code(10).ts
TypeScript
help me rewrite this ""
Thu, Jul 2 at 9:33 AM
Pasted code(11).ts
TypeScript
Your right, app/players/[id]/page.tsx is 
The differentials are missing now from the view when we deduped them , i attached old and new
my numbers are off 
this is the only 67 I found 
Pasted text(18).txt
Document
Scors look better, but my handicap is off 
none of these show a 1.7 though
I tmight have came from here, since we fixed the other logic, can I now have this updatge my handicap?
Now I want to improve my audit at http://localhost:3000/audit.  I'd like to have 10 points for every stroke that casual rounds are above competitive rounds and I would like to have the same for goodrich versus non-goodrich rounds.  I'm also showing no goodrich scores for this link
This is still missin goodrich details 
Fri, Jul 3 at 6:24 AM
Fri, Jul 3 at 1:36 PM
Pasted code(12).ts
TypeScript
Sun, Jul 5 at 7:45 PM
this sint updated, "rewrite it"
why is this tghe same? 
Us this and talk about both sections in teh email and the people worth discussing 
teh current selectd button is hard to see 
There is also one last report we can download weekly to keep everything updated and it includes all rounds. Help me import that one
Scores Posted Report-7-5-2026.pdf
PDF

This is actually better than I expected. It gives us almost everything we need for a complete GHIN synchronization. The report contains, for every posted score:

GHIN Number
Player Name
Current Handicap Index
Round Count
Score Type (H, A, CH, CA, ECH, etc.)
Date Played
Adjusted Gross Score (AGS)
Course Rating
Slope Rating
Handicap Differential
Handicap Index after the round (Score H.I.)
Net Score Differential (NSD)
Course Name
PCC adjustment (when present)
I'd actually replace most of our current import process

Instead of relying on:

GHIN Excel exports
Hole-by-hole PDFs

I'd make this the weekly master import.

New workflow
Import Weekly Scores Posted Report

        ↓

Creates players automatically
        ↓

Updates current Handicap Index
        ↓

Imports every posted round
        ↓

Updates differentials
        ↓

Updates course ratings/slope
        ↓

Leaves hole-by-hole data untouched

Then the Hole-by-Hole PDF becomes an enhancement that attaches hole details onto rounds we've already imported.

I'd also improve the database

I'd expand rounds to include:

ghin_number
score_type
adjusted_gross_score
course_rating
slope_rating
handicap_differential
score_handicap_index
net_score_differential
pcc
golfer_status
round_count
source = "Scores Posted Report"

Once those exist, almost every statistic page becomes more accurate.

Even better...

This report has the GHIN Number for everyone.

Instead of matching by name:

Marcus Boog

we can permanently identify players by

GHIN #12342950

That completely eliminates problems with duplicate names or spelling changes.

I would add a new import page
Imports
 ├── Weekly Scores Posted Report ⭐
 ├── Hole-by-Hole PDF
 └── GHIN Excel (legacy)

The weekly report becomes the one you use every Sunday after scores are posted.

We can also automate it

Once this parser exists, the dashboard can automatically:

Update every player's current handicap
Import new rounds only (skip duplicates)
Update the audit page
Update player pages
Update league standings
Recalculate sandbag statistics
Recalculate trends

with a single PDF upload.

My recommendation

I would retire the Excel GHIN import entirely.

Use:

Weekly Scores Posted Report → master source for all rounds and handicap data.
Hole-by-Hole PDF → enriches those rounds with per-hole statistics.

That gives you one authoritative GHIN-based data source for virtually everything, while the hole-by-hole import provides the detailed analytics that GHIN's report doesn't include. It will make the dashboard simpler, more reliable, and much easier to maintain.

Monday 6:19 AM
Monday 4:21 PM
I have 2 tom hafners 
Monday 8:25 PM
Tuesday 5:54 AM
Some hole to hole scores are not working like this one 
blue tees are missing from the table course_holes
Failed to run sql query: ERROR:  42703: column "course_rating" of relation "course_holes" does not exist
LINE 8:   course_rating,
Tuesday 11:22 AM
for player d46ad8fe-83ae-4bd6-8430-ec07a05c163b, I show some duplicates and I also show no tee bozxs, 
Pasted text(19).txt
Document
Since we only need SCORES_POSTED_REPORT for differentials and GHIN_HBH_PDF is only for Goodrich, can we instead just insert it for non-goodrich and update teh differentials for goodrich? 
I still see dups , is there a query I can run ?
Pasted text(20).txt
Document
select
  player_id,
  played_at,
  gross_score,
  adjusted_gross_score,
  differential,
  count(*) as duplicate_count,
  string_agg(id::text, ', ') as round_ids,
  string_agg(coalesce(source, '-'), ' | ') as sources
from rounds
group by
  player_id,
  played_at,
  gross_score,
  adjusted_gross_score,
  differential
having count(*) > 1
order by played_at desc;  still shshows 
Pasted text(21).txt
Document
looks like some people entered their scores twice into GHIN 
Tuesday 6:09 PM
Tuesday 7:10 PM
Tuesday 8:22 PM
and also rewrite all of the needed files afterwards
Pasted code(13).ts
TypeScript
Wednesday 6:13 AM
Dont do that yet, for now we're missing many of the dates and other details, it looks like its only accounting for the details along the first line and nota ll of the following ones
Wednesday 9:28 AM
Pasted code(7).py
Python
I dont want every round, i want it deduped, I want the count in the table with all players to show All Rounds 
/players doesnt show all rounds available to view 
A golf handicap (HI) is calculated by the followng 
last 20 comp and last 20 mo are blank 
just use course rating, it looks like some show the 18 hole slope 
i still see 9 hole rounds 
Now I want to create a handicap audit page from all of the people from here that say invesigate or review and populate teh suggeted changes to start then go into each of these players just like their [id] page
Now using the base of https://mens-club-dashboard.vercel.app/audit/committee, please talk about the different options now available on the site and make sure to call out the current handicap auditing and the current suggestions for handicap changes whci I attached , this is for an email to the handicap committee chairman and other handicap committee members,  call out my diret suggestions to look through for the edits I would like to add for this weekend. ceate that email
back to porgramming, make the table header here use full words and make it always hsow on top even if we scroll
Thursday 12:12 PM
after the hole imports (python scripts/import_hole_by_hole.py "C:\Users\marcu\mens-club-dashboard\scripts\Downloads\Hole by Hole Scores Report.pdf"), the differentials were wiped for all of those holes i atached a before and after screenshot
Pasted code(8).py
Python
whats the sql to compare this? 
Pasted text(22).txt
Document
why do they not match? 
Pasted text(23).txt
Document
here are the columns 
Pasted text(24).txt
Document
the only other ones are 9 hole scores 
Pasted code(14).ts
TypeScript
audit/page included
Pasted code(15).ts
TypeScript
here is app/audit/[id]/page 
I changed it to const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/players", label: "Players" },
  { href: "/import", label: "Import" },
  { href: "/audit", label: " Handicap Audit" },
  { href: "/compare", label: "Compare" },
  { href: "/holes", label: "Hole Stats" },
];  I also noticed tghe newest handicaps are not entered when we insert the hole-by-hole-summary e.g. Every name should change their HI to the whatever this document says 
Pasted code(9).py
Python
import_scores_posted.py  
it doesnt matter if its goodrich, i just want to update the HI as soon as I see an index 
Friday 6:43 AM
The last posted scores audit has now brought in duplicates again 
Pasted text(25).txt
Document
Pasted text (2)(2).txt
Document
inspection attached: , and here is true duplicates 
still some dups 
Pasted text(26).txt
Document
select
    played_at,
    course_name,
    coalesce(adjusted_gross_score, gross_score) as score
from rounds
where player_id = '8fef47ed-5da9-4e43-9791-6bb40b90c08c'
order by played_at desc, created_at desc;    
Pasted code(10).py
Python
Pasted code (2)(1).py
Python
Pasted code(11).py
Python
Pasted code (2)(2).py
Python
help me rewrite them
Pasted code(12).py
Python
parsing error 
more examples 
Today 5:49 PM
Is there a SQL query I can sho why https://mens-club-dashboard.vercel.app/compare?p1=2bc4ed37-f465-467e-852a-852bf5501f9e&p2=458acfc1-68dd-47bb-a466-77472f04306c&holes=all&tee=common doesnt show any comparisons for holes 15-18?
Today 7:18 PM
Pasted text(27).txt
Document
Pasted code(16).ts
TypeScript
compareService.ts is ""
Why is holes/8fef47ed-5da9-4e43-9791-6bb40b90c08c showing less rounds than his /player link?  
Pasted code(17).ts
TypeScript
still only one line under /audit/[id]/page
Pasted code(18).ts
TypeScript

Updated as requested:

Higher differentials appear at the top.
Lower differentials appear at the bottom.
Competition remains green; general play remains gray.
A shaded band shows the gap between competition and general-play averages.
Dashed average lines label both category averages.
A clear callout states how many differential strokes lower competition play is.

AuditTrendChart_reversed_gap.tsx

Replace:

components/audit/AuditTrendChart.tsx

Your current app/audit/[id]/page.tsx does not need another change. 

for the competition line show the competition handicap

I like that idea. It's actually more useful than plotting the raw competition differentials.

I'd change the green line to represent the competition handicap index over time, not the individual competition differentials.

For each competition round:

Take the player's last 20 competition rounds ending at that round.
Calculate the WHS handicap index (best 8 of 20, or the appropriate 5–19 round rules).
Plot that handicap index.

Then:

Green line = Competition Handicap Index (rolling)
Gray line = General Play Handicap Index (rolling)
Blue dashed line = Current GHIN Handicap Index

That tells the committee exactly what they care about:

"If we only considered competition rounds, his handicap would be 7.3. If we only considered general play, it would be 11.9."

That's much more actionable than comparing raw round-to-round differentials.

I'd also add three cards above the chart
Current GHIN HI      10.8

Competition HI        7.2

General Play HI      11.6

and a fourth:

Difference
4.4 strokes
The graph would become
14 ───────────────────────── General Play HI
13        ●──────●─────●
12

11  - - - - - Current GHIN - - - -

10

 9

 8      ●──────●──────●
 7 ───────────────────────── Competition HI

      Apr      May      Jun      Jul

One glance tells the story.

I would go one step further and make this the centerpiece of the audit page:

Rolling Competition HI (green)
Rolling General Play HI (gray)
Current GHIN HI (blue dashed)
Hover shows:
Date
New Competition HI after that round
New General Play HI after that round
Round score
Differential
Course

I think this would be one of the strongest features in your entire dashboard because it directly answers the question your handicap committee is trying to evaluate: "What handicap would this player have if we only used competition rounds versus only general-play rounds?"

lets do it

Updated both files so the green line now shows the rolling competition Handicap Index, while the gray line shows the rolling general-play Handicap Index.

AuditTrendChart_rolling_hi.tsx

audit_id_page_rolling_hi.tsx

Replace:

components/audit/AuditTrendChart.tsx
app/audit/[id]/page.tsx

The chart now includes:

Rolling category HI using up to the previous 20 rounds in that category
Latest 10 calculated competition and general-play HI points
Current GHIN HI as a dashed blue line
Competition HI, general-play HI, and their gap in summary cards
Hover details showing the calculated category HI, score, round differential, course, and date
Higher handicap values at the top and lower values at the bottom 

audit_id_page_rolling_hi.tsx
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  AuditTrendChart,
  type AuditHandicapTrendPoint,
} from "@/components/audit/AuditTrendChart";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RoundRow = {
  id: string;
  played_at: string;
  gross_score: number | null;
  adjusted_gross_score: number | null;
  differential: number | null;
  score_type: string | null;
  course_name: string | null;
  tee_name: string | null;
  counts_for_hi: boolean | null;
};

type RoundWithDiff = RoundRow & {
  diff: number;
  score: number | null;
};

type AuditGroup = {
  label: string;
  rounds: RoundWithDiff[];
  hi: number | null;
  avgDiff: number | null;
  usedCount: number;
};

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";

  const number = Number(value);
  return Number.isNaN(number) ? "-" : number.toFixed(decimals);
}

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH", "CA", "ECH"].includes(scoreType ?? "");
}

function scoreTypeLabel(scoreType: string | null | undefined) {
  switch (scoreType) {
    case "H":
      return "Home";
    case "A":
      return "Away";
    case "C":
      return "Competition";
    case "CH":
      return "Competition Home";
    case "CA":
      return "Competition Away";
    case "ECH":
      return "Exceptional Competition Home";
    case "EA":
      return "Exceptional Away";
    case "EH":
      return "Exceptional Home";
    case "NA":
      return "Nine-Hole Away";
    case "NH":
      return "Nine-Hole Home";
    default:
      return scoreType ?? "-";
  }
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function whsUsedCount(roundCount: number) {
  if (roundCount < 5) return 0;
  if (roundCount === 5) return 1;
  if (roundCount <= 8) return 2;
  if (roundCount <= 11) return 3;
  if (roundCount <= 14) return 4;
  if (roundCount <= 16) return 5;
  if (roundCount <= 18) return 6;
  if (roundCount === 19) return 7;
  return 8;
}

function calculateCategoryHi(rounds: RoundRow[]) {
  const differentials = rounds
    .map((round) => Number(round.differential))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const usedCount = whsUsedCount(differentials.length);

  if (!usedCount) return null;

  const used = differentials.slice(0, usedCount);
  const adjustment = differentials.length === 6 ? -1 : 0;
  const result = average(used);

  return result == null ? null : result + adjustment;
}

function whsHi(rounds: RoundWithDiff[]) {
  const usedCount = whsUsedCount(rounds.length);

  if (!usedCount) return null;

  const usedDiffs = rounds
    .slice(0, usedCount)
    .map((round) => round.diff);

  const adjustment = rounds.length === 6 ? -1 : 0;
  const hi = average(usedDiffs);

  return hi == null ? null : hi + adjustment;
}

function buildGroup(label: string, rounds: RoundWithDiff[]): AuditGroup {
  const sorted = [...rounds].sort((a, b) => a.diff - b.diff);

  return {
    label,
    rounds: sorted,
    hi: whsHi(sorted),
    avgDiff: average(sorted.map((round) => round.diff)),
    usedCount: whsUsedCount(sorted.length),
  };
}

function buildAuditGroups(rounds: RoundRow[]): AuditGroup[] {
  const eligible = rounds
    .filter(
      (round) =>
        round.counts_for_hi === true &&
        round.differential != null
    )
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() -
        new Date(a.played_at).getTime()
    )
    .map((round) => ({
      ...round,
      diff: Number(round.differential),
      score:
        round.adjusted_gross_score != null
          ? Number(round.adjusted_gross_score)
          : round.gross_score != null
            ? Number(round.gross_score)
            : null,
    }));

  const overall = eligible.slice(0, 20);

  const competition = eligible
    .filter((round) => isCompetition(round.score_type))
    .slice(0, 20);

  const general = eligible
    .filter((round) => !isCompetition(round.score_type))
    .slice(0, 20);

  return [
    buildGroup("Overall Handicap Rounds", overall),
    buildGroup("Competition Handicap Rounds", competition),
    buildGroup("General Play Handicap Rounds", general),
  ];
}

function buildRollingHandicapTrend(
  rounds: RoundRow[],
  category: "Competition" | "General Play"
): AuditHandicapTrendPoint[] {
  const chronological = [...rounds].sort(
    (a, b) =>
      new Date(a.played_at).getTime() -
      new Date(b.played_at).getTime()
  );

  const points: AuditHandicapTrendPoint[] = [];

  chronological.forEach((round, index) => {
    const history = chronological
      .slice(Math.max(0, index - 19), index + 1)
      .filter((item) => item.differential != null);

    const handicapIndex = calculateCategoryHi(history);

    if (handicapIndex == null || round.differential == null) return;

    points.push({
      id: round.id,
      date: round.played_at,
      course: round.course_name,
      score:
        round.adjusted_gross_score != null
          ? Number(round.adjusted_gross_score)
          : round.gross_score != null
            ? Number(round.gross_score)
            : null,
      differential: Number(round.differential),
      handicapIndex,
      category,
    });
  });

  return points.slice(-10);
}

function NumberList({
  group,
  field,
}: {
  group: AuditGroup;
  field: "score" | "diff";
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {group.rounds.map((round, index) => {
        const isUsed = index < group.usedCount;

        const value =
          field === "score"
            ? round.score ?? "-"
            : formatNumber(round.diff);

        const className =
          field === "score"
            ? isCompetition(round.score_type)
              ? "font-bold text-green-700"
              : "font-medium text-gray-900"
            : isUsed
              ? "font-black text-gray-950"
              : "text-gray-700";

        return (
          <span
            key={`${field}-${round.id}`}
            className={className}
          >
            {value}
          </span>
        );
      })}
    </div>
  );
}

export default async function PlayerAuditPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const [
    { data: player, error: playerError },
    { data: rounds, error: roundsError },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, full_name, ghin_number, current_index")
      .eq("id", id)
      .limit(1),

    supabase
      .from("player_display_rounds")
      .select(
        `
          id,
          played_at,
          gross_score,
          adjusted_gross_score,
          differential,
          score_type,
          course_name,
          tee_name,
          counts_for_hi
        `
      )
      .eq("player_id", id)
      .eq("counts_for_hi", true)
      .not("played_at", "is", null)
      .not("differential", "is", null)
      .order("played_at", { ascending: false }),
  ]);

  if (playerError || roundsError) {
    return (
      <main className="p-8 font-bold text-red-700">
        {playerError?.message ?? roundsError?.message}
      </main>
    );
  }

  const playerRow = player?.[0];

  if (!playerRow) {
    return (
      <main className="p-4 text-gray-900 md:p-8">
        <Link
          href="/audit"
          className="font-bold text-blue-800 hover:underline"
        >
          ← Back to Audit
        </Link>

        <p className="mt-4 font-bold text-red-700">
          Player not found.
        </p>
      </main>
    );
  }

  const hiRoundRows = (rounds ?? []) as RoundRow[];
  const groups = buildAuditGroups(hiRoundRows);

  const competitionRounds = hiRoundRows.filter((round) =>
    isCompetition(round.score_type)
  );

  const generalRounds = hiRoundRows.filter(
    (round) => !isCompetition(round.score_type)
  );

  const competitionTrendPoints = buildRollingHandicapTrend(
    competitionRounds,
    "Competition"
  );

  const generalTrendPoints = buildRollingHandicapTrend(
    generalRounds,
    "General Play"
  );

  return (
    <main className="space-y-6 p-4 text-gray-900 md:p-8">
      <header>
        <Link
          href="/audit"
          className="font-bold text-blue-800 hover:underline"
        >
          ← Back to Audit
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-950">
          {playerRow.full_name} Audit
        </h1>

        <p className="mt-1 text-sm text-gray-700">
          GHIN #{playerRow.ghin_number ?? "-"} • Current Handicap
          Index{" "}
          <span className="font-bold">
            {formatNumber(playerRow.current_index)}
          </span>
        </p>
      </header>

      <AuditTrendChart
        competitionPoints={competitionTrendPoints}
        generalPoints={generalTrendPoints}
        currentHandicap={
          playerRow.current_index == null
            ? null
            : Number(playerRow.current_index)
        }
      />

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Last 20 Official Handicap Round Breakdown
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Scores and differentials are sorted from lowest
          differential to highest. Bold differentials are used in
          the Handicap Index calculation. Competition scores are
          shown in green.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b bg-gray-200 text-gray-950">
              <tr>
                <th className="p-3">Group</th>
                <th className="p-3 text-right">Rounds</th>
                <th className="p-3 text-right">Used</th>
                <th className="p-3 text-right">Calculated HI</th>
                <th className="p-3 text-right">
                  Average Differential
                </th>
                <th className="p-3">Scores</th>
                <th className="p-3">Differentials</th>
              </tr>
            </thead>

            <tbody>
              {groups.map((group) => (
                <tr
                  key={group.label}
                  className="border-b align-top hover:bg-blue-50"
                >
                  <td className="p-3 font-bold">{group.label}</td>
                  <td className="p-3 text-right">
                    {group.rounds.length}
                  </td>
                  <td className="p-3 text-right">
                    {group.usedCount || "-"}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {formatNumber(group.hi)}
                  </td>
                  <td className="p-3 text-right">
                    {formatNumber(group.avgDiff)}
                  </td>
                  <td className="p-3">
                    <NumberList group={group} field="score" />
                  </td>
                  <td className="p-3">
                    <NumberList group={group} field="diff" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Official Handicap Differentials Over Time
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="border-b bg-gray-200 text-gray-950">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Score Type</th>
                <th className="p-3">Course</th>
                <th className="p-3">Tee</th>
                <th className="p-3 text-right">Score</th>
                <th className="p-3 text-right">
                  Differential
                </th>
                <th className="p-3">Category</th>
              </tr>
            </thead>

            <tbody>
              {hiRoundRows.map((round) => {
                const competition = isCompetition(
                  round.score_type
                );

                return (
                  <tr
                    key={round.id}
                    className="border-b hover:bg-blue-50"
                  >
                    <td className="p-3">{round.played_at}</td>
                    <td className="p-3">
                      {scoreTypeLabel(round.score_type)}
                    </td>
                    <td className="p-3">
                      {round.course_name ?? "-"}
                    </td>
                    <td className="p-3">
                      {round.tee_name ?? "-"}
                    </td>
                    <td
                      className={`p-3 text-right ${
                        competition
                          ? "font-bold text-green-700"
                          : "font-medium text-gray-900"
                      }`}
                    >
                      {round.adjusted_gross_score ??
                        round.gross_score ??
                        "-"}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {formatNumber(round.differential)}
                    </td>
                    <td
                      className={
                        competition
                          ? "p-3 font-bold text-green-700"
                          : "p-3 text-gray-900"
                      }
                    >
                      {competition
                        ? "Competition"
                        : "General Play"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}