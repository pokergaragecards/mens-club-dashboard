export type HoleByHoleRound = {
  ghinNumber: string;
  golferName: string;
  playedAt: string;
  handicapIndex: number | null;
  courseHandicap: number | null;
  scoreType: string | null;
  teeName: string | null;
  teeGender: string | null;
  courseRating: number | null;
  slopeRating: number | null;
  holes: number[];
  outScore: number | null;
  inScore: number | null;
  totalScore: number | null;
  importKey: string;
};

export type HoleByHoleParseResult = {
  rowsFound: number;
  validRounds: HoleByHoleRound[];
  invalidRows: string[];
  sampleRounds: HoleByHoleRound[];
};

const KNOWN_TEES = new Set(["Blue", "Gold", "Red", "White"]);
const KNOWN_GENDERS = new Set(["Male", "Female"]);
const SCORE_TYPES = new Set(["H", "A", "C", "CH"]);

function toNumber(value: string | undefined | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function isDate(value: string | undefined) {
  return !!value && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value);
}

function parseUsDate(value: string): string | null {
  const parts = value.split("/");
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function cleanName(value: string) {
  return value
    .replace(/\b([A-Z])\s+([a-z]{2,})\b/g, "$1$2")
    .replace(/\bJef\s+frey\b/g, "Jeffrey")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/T OT AL/g, "TOTAL")
    .replace(/T otal/g, "Total")
    .replace(/Date\/T ime/g, "Date/Time")
    .replace(/T ee/g, "Tee")
    .replace(/T ype/g, "Type")
    .replace(/H o l e b y H o l e/g, "Hole by Hole")
    .replace(/[",[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string) {
  return normalizePdfText(text).split(" ").filter(Boolean);
}

function createImportKey(round: Omit<HoleByHoleRound, "importKey">) {
  return [
    round.ghinNumber,
    round.golferName,
    round.playedAt,
    round.scoreType ?? "",
    round.teeName ?? "",
    round.teeGender ?? "",
    round.courseRating ?? "",
    round.slopeRating ?? "",
    round.totalScore ?? "",
    round.holes.join("-"),
  ].join("|");
}

type CurrentGolfer = {
  ghinNumber: string;
  golferName: string;
  teeName: string | null;
  teeGender: string | null;
  courseRating: number | null;
  slopeRating: number | null;
};

function isIntegerToken(value: string | undefined) {
  return !!value && /^-?\d+$/.test(value);
}

function isNumberToken(value: string | undefined) {
  return !!value && /^[+-]?\d+(\.\d+)?$/.test(value);
}

function findDateWithin(tokens: string[], start: number, maxLookahead = 8) {
  for (let i = start; i <= Math.min(tokens.length - 1, start + maxLookahead); i++) {
    if (isDate(tokens[i])) return i;
  }
  return -1;
}

function isLikelyGhinStart(tokens: string[], index: number) {
  const token = tokens[index];

  if (!/^\d{3,}$/.test(token ?? "")) return false;

  const dateIndex = findDateWithin(tokens, index + 1, 8);
  if (dateIndex === -1) return false;

  const nameTokens = tokens.slice(index + 1, dateIndex);
  if (nameTokens.length < 2 || nameTokens.length > 6) return false;

  const badWords = new Set([
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
  ]);

  return !nameTokens.some((token) => badWords.has(token));
}

function parseScores(tokens: string[], start: number) {
  const raw = tokens.slice(start, start + 21);

  if (raw.length !== 21 || raw.some((token) => !isIntegerToken(token))) {
    return null;
  }

  const nums = raw.map(Number);
  const holes = [...nums.slice(0, 9), ...nums.slice(10, 19)];
  const outScore = nums[9];
  const inScore = nums[19];
  const totalScore = nums[20];

  const frontTotal = holes.slice(0, 9).reduce((sum, score) => sum + score, 0);
  const backTotal = holes.slice(9).reduce((sum, score) => sum + score, 0);
  const calculatedTotal = frontTotal + backTotal;

  if (frontTotal !== outScore) return null;
  if (backTotal !== inScore) return null;
  if (calculatedTotal !== totalScore) return null;

  return {
    holes,
    outScore,
    inScore,
    totalScore,
    nextIndex: start + 21,
  };
}

function parseRoundAt(
  tokens: string[],
  dateIndex: number,
  golfer: CurrentGolfer
): { round: HoleByHoleRound; nextIndex: number } | null {
  const rawDate = tokens[dateIndex];
  const playedAt = parseUsDate(rawDate);

  if (!playedAt) return null;

  let i = dateIndex + 1;

  const rawHandicapIndex = tokens[i++];
  if (!isNumberToken(rawHandicapIndex)) return null;

  let courseHandicap: number | null = null;

  if (isNumberToken(tokens[i]) && SCORE_TYPES.has(tokens[i + 1])) {
    courseHandicap = toNumber(tokens[i]);
    i++;
  }

  const scoreType = tokens[i++];
  if (!SCORE_TYPES.has(scoreType)) return null;

  let teeName = golfer.teeName;
  let teeGender = golfer.teeGender;
  let courseRating = golfer.courseRating;
  let slopeRating = golfer.slopeRating;

  if (
    KNOWN_TEES.has(tokens[i]) &&
    KNOWN_GENDERS.has(tokens[i + 1]) &&
    isNumberToken(tokens[i + 2]) &&
    isIntegerToken(tokens[i + 3])
  ) {
    teeName = tokens[i];
    teeGender = tokens[i + 1];
    courseRating = toNumber(tokens[i + 2]);
    slopeRating = toNumber(tokens[i + 3]);
    i += 4;
  }

  const scores = parseScores(tokens, i);
  if (!scores) return null;

  const roundWithoutKey = {
    ghinNumber: golfer.ghinNumber,
    golferName: golfer.golferName,
    playedAt,
    handicapIndex: toNumber(rawHandicapIndex),
    courseHandicap,
    scoreType,
    teeName,
    teeGender,
    courseRating,
    slopeRating,
    holes: scores.holes,
    outScore: scores.outScore,
    inScore: scores.inScore,
    totalScore: scores.totalScore,
  };

  return {
    round: {
      ...roundWithoutKey,
      importKey: createImportKey(roundWithoutKey),
    },
    nextIndex: scores.nextIndex,
  };
}

function validateRounds(rounds: HoleByHoleRound[]) {
  console.log("\n========== HBH PARSE LOW ROUND CHECK ==========\n");

  const lowRounds = rounds.filter(
    (round) => round.totalScore != null && round.totalScore < 72
  );

  if (!lowRounds.length) {
    console.log("No rounds under 72 found.");
  }

  for (const round of lowRounds) {
    console.warn(
      `LOW ROUND: ${round.playedAt} | ${round.golferName} | ${round.totalScore} | ${round.holes.join("-")}`
    );
  }

  console.log(
    `Parsed ${rounds.length} rounds for ${
      new Set(rounds.map((round) => round.golferName)).size
    } golfers.`
  );
}

export function parseHoleByHoleText(text: string): HoleByHoleParseResult {
  const tokens = tokenize(text);

  const validRounds: HoleByHoleRound[] = [];
  const invalidRows: string[] = [];

  let currentGolfer: CurrentGolfer | null = null;
  let i = 0;

  while (i < tokens.length) {
    if (isLikelyGhinStart(tokens, i)) {
      const dateIndex = findDateWithin(tokens, i + 1, 8);
      const ghinNumber = tokens[i];
      const golferName = cleanName(tokens.slice(i + 1, dateIndex).join(" "));

      currentGolfer = {
        ghinNumber,
        golferName,
        teeName: null,
        teeGender: null,
        courseRating: null,
        slopeRating: null,
      };

      const parsed = parseRoundAt(tokens, dateIndex, currentGolfer);

      if (parsed) {
        validRounds.push(parsed.round);

        currentGolfer = {
          ...currentGolfer,
          teeName: parsed.round.teeName,
          teeGender: parsed.round.teeGender,
          courseRating: parsed.round.courseRating,
          slopeRating: parsed.round.slopeRating,
        };

        i = parsed.nextIndex;
        continue;
      }

      invalidRows.push(tokens.slice(i, Math.min(i + 40, tokens.length)).join(" "));
      i = dateIndex + 1;
      continue;
    }

    if (currentGolfer && isDate(tokens[i])) {
      const parsed = parseRoundAt(tokens, i, currentGolfer);

      if (parsed) {
        validRounds.push(parsed.round);

        currentGolfer = {
          ...currentGolfer,
          teeName: parsed.round.teeName,
          teeGender: parsed.round.teeGender,
          courseRating: parsed.round.courseRating,
          slopeRating: parsed.round.slopeRating,
        };

        i = parsed.nextIndex;
        continue;
      }

      invalidRows.push(tokens.slice(i, Math.min(i + 40, tokens.length)).join(" "));
    }

    i++;
  }

  const seen = new Set<string>();

  const dedupedRounds = validRounds.filter((round) => {
    if (seen.has(round.importKey)) return false;
    seen.add(round.importKey);
    return true;
  });

  validateRounds(dedupedRounds);

  return {
    rowsFound: validRounds.length + invalidRows.length,
    validRounds: dedupedRounds,
    invalidRows: invalidRows.slice(0, 25),
    sampleRounds: dedupedRounds.slice(0, 5),
  };
}