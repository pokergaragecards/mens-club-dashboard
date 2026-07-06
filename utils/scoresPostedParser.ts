export type ScoresPostedRound = {
  ghinNumber: string;
  golferName: string;
  golferStatus: string;
  handicapIndex: number | null;
  roundCount: number | null;

  scoreType: string;
  playedAt: string;
  adjustedGrossScore: number | null;
  courseRating: number | null;
  slopeRating: number | null;
  differential: number | null;
  scoreHandicapIndex: number | null;
  netScoreDifferential: number | null;
  courseName: string;
  pcc: number | null;

  externalKey: string;
};

export type ScoresPostedParseResult = {
  rowsFound: number;
  validRounds: ScoresPostedRound[];
  invalidRows: string[];
  sampleRounds: ScoresPostedRound[];
};

const STATUSES = new Set(["Active", "Inactive"]);
const SCORE_TYPES = new Set([
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
]);

function normalizeText(text: string) {
  return text
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/[",[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string) {
  return normalizeText(text).split(" ").filter(Boolean);
}

function isDate(value: string | undefined) {
  return !!value && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value);
}

function parseDate(value: string) {
  const [month, day, year] = value.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const clean = value.replace(/,/g, "");
  const n = Number(clean);
  return Number.isNaN(n) ? null : n;
}

// GHIN shows plus handicaps/differentials as +0.2.
// Store those as negative numbers.
function parseGhinNumber(value: string | undefined) {
  if (!value) return null;
  if (value.startsWith("+")) {
    const n = Number(value.slice(1));
    return Number.isNaN(n) ? null : -n;
  }

  return parseNumber(value);
}

function isInteger(value: string | undefined) {
  return !!value && /^\d+$/.test(value);
}

function isNumberLike(value: string | undefined) {
  return !!value && /^[+-]?\d+(\.\d+)?$/.test(value);
}

function isScoreType(value: string | undefined) {
  return !!value && SCORE_TYPES.has(value);
}

function cleanName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseUsgaCourseName(tokens: string[]) {
  if (!tokens.length) return { courseName: "", pcc: null };

  const last = tokens[tokens.length - 1];

  if (/^[+-]\d+$/.test(last)) {
    return {
      courseName: tokens.slice(0, -1).join(" ").trim(),
      pcc: Number(last),
    };
  }

  return {
    courseName: tokens.join(" ").trim(),
    pcc: null,
  };
}

function isPlayerStart(tokens: string[], index: number) {
  if (!/^\d{3,}$/.test(tokens[index] ?? "")) return false;

  for (let i = index + 1; i <= Math.min(index + 8, tokens.length - 1); i++) {
    if (!STATUSES.has(tokens[i])) continue;

    return (
      isNumberLike(tokens[i + 1]) &&
      isInteger(tokens[i + 2]) &&
      isScoreType(tokens[i + 3]) &&
      isDate(tokens[i + 4])
    );
  }

  return false;
}

function findNextBoundary(tokens: string[], start: number) {
  for (let i = start; i < tokens.length; i++) {
    if (isPlayerStart(tokens, i)) return i;
    if (isScoreType(tokens[i]) && isDate(tokens[i + 1])) return i;
  }

  return tokens.length;
}

function createExternalKey(round: Omit<ScoresPostedRound, "externalKey">) {
  return [
    "SCORES_POSTED",
    round.ghinNumber,
    round.playedAt,
    round.scoreType,
    round.adjustedGrossScore ?? "",
    round.courseRating ?? "",
    round.slopeRating ?? "",
    round.differential ?? "",
    round.courseName,
  ].join("|");
}

type CurrentPlayer = {
  ghinNumber: string;
  golferName: string;
  golferStatus: string;
  handicapIndex: number | null;
  roundCount: number | null;
};

function parseRoundAt(
  tokens: string[],
  start: number,
  player: CurrentPlayer
): { round: ScoresPostedRound; nextIndex: number } | null {
  const scoreType = tokens[start];
  const rawDate = tokens[start + 1];

  if (!isScoreType(scoreType) || !isDate(rawDate)) return null;

  const adjustedGrossScore = parseNumber(tokens[start + 2]);
  const courseRating = parseNumber(tokens[start + 3]);
  const slopeRating = parseNumber(tokens[start + 4]);
  const differential = parseGhinNumber(tokens[start + 5]);
  const scoreHandicapIndex = parseGhinNumber(tokens[start + 6]);
  const netScoreDifferential = parseNumber(tokens[start + 7]);

  if (
    adjustedGrossScore == null ||
    courseRating == null ||
    slopeRating == null ||
    differential == null ||
    scoreHandicapIndex == null ||
    netScoreDifferential == null
  ) {
    return null;
  }

  const courseStart = start + 8;
  const nextIndex = findNextBoundary(tokens, courseStart);
  const { courseName, pcc } = parseUsgaCourseName(
    tokens.slice(courseStart, nextIndex)
  );

  if (!courseName) return null;

  const roundWithoutKey = {
    ghinNumber: player.ghinNumber,
    golferName: player.golferName,
    golferStatus: player.golferStatus,
    handicapIndex: player.handicapIndex,
    roundCount: player.roundCount,

    scoreType,
    playedAt: parseDate(rawDate),
    adjustedGrossScore,
    courseRating,
    slopeRating,
    differential,
    scoreHandicapIndex,
    netScoreDifferential,
    courseName,
    pcc,
  };

  return {
    round: {
      ...roundWithoutKey,
      externalKey: createExternalKey(roundWithoutKey),
    },
    nextIndex,
  };
}

export function parseScoresPostedText(text: string): ScoresPostedParseResult {
  const tokens = tokenize(text);

  const validRounds: ScoresPostedRound[] = [];
  const invalidRows: string[] = [];

  let currentPlayer: CurrentPlayer | null = null;
  let i = 0;

  while (i < tokens.length) {
    if (isPlayerStart(tokens, i)) {
      const ghinNumber = tokens[i];

      let statusIndex = -1;

      for (let j = i + 1; j <= Math.min(i + 8, tokens.length - 1); j++) {
        if (STATUSES.has(tokens[j])) {
          statusIndex = j;
          break;
        }
      }

      if (statusIndex === -1) {
        i++;
        continue;
      }

      currentPlayer = {
        ghinNumber,
        golferName: cleanName(tokens.slice(i + 1, statusIndex).join(" ")),
        golferStatus: tokens[statusIndex],
        handicapIndex: parseGhinNumber(tokens[statusIndex + 1]),
        roundCount: parseNumber(tokens[statusIndex + 2]),
      };

      const parsed = parseRoundAt(tokens, statusIndex + 3, currentPlayer);

      if (parsed) {
        validRounds.push(parsed.round);
        i = parsed.nextIndex;
        continue;
      }

      invalidRows.push(tokens.slice(i, i + 35).join(" "));
      i++;
      continue;
    }

    if (currentPlayer && isScoreType(tokens[i]) && isDate(tokens[i + 1])) {
      const parsed = parseRoundAt(tokens, i, currentPlayer);

      if (parsed) {
        validRounds.push(parsed.round);
        i = parsed.nextIndex;
        continue;
      }

      invalidRows.push(tokens.slice(i, i + 35).join(" "));
    }

    i++;
  }

  const seen = new Set<string>();

  const deduped = validRounds.filter((round) => {
    if (seen.has(round.externalKey)) return false;
    seen.add(round.externalKey);
    return true;
  });

  return {
    rowsFound: validRounds.length + invalidRows.length,
    validRounds: deduped,
    invalidRows: invalidRows.slice(0, 25),
    sampleRounds: deduped.slice(0, 5),
  };
}