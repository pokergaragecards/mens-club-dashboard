type AuditGapRow = {
  competitionVsOverallGap: number | null;
  full_name: string;
};

export function compareAuditRowsByStrokeDiscrepancy(
  a: AuditGapRow,
  b: AuditGapRow
) {
  const aGap = a.competitionVsOverallGap ?? Number.NEGATIVE_INFINITY;
  const bGap = b.competitionVsOverallGap ?? Number.NEGATIVE_INFINITY;

  if (aGap !== bGap) return bGap - aGap;
  return a.full_name.localeCompare(b.full_name);
}
