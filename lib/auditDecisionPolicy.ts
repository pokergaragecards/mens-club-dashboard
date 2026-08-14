export const CONSERVATIVE_REVIEW_ADJUSTMENT_THRESHOLD = 2;

export function conservativeReviewRequiresAdjustment(params: {
  currentHi: number | null;
  conservativeReviewHi: number | null;
}) {
  const { currentHi, conservativeReviewHi } = params;

  if (
    currentHi == null ||
    conservativeReviewHi == null ||
    !Number.isFinite(currentHi) ||
    !Number.isFinite(conservativeReviewHi)
  ) {
    return false;
  }

  const discrepancy = Number(
    (currentHi - conservativeReviewHi).toFixed(1)
  );

  return discrepancy >= CONSERVATIVE_REVIEW_ADJUSTMENT_THRESHOLD;
}
