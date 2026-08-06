export function goodrichTeeDisplayName(value: string | null | undefined) {
  if (!value) return "-";
  return value.replace(/\byellow\b/gi, "Gold");
}

export function roundTeeDisplayName(
  courseName: string | null | undefined,
  teeName: string | null | undefined
) {
  if (!teeName) return "-";
  if (!courseName || !/\bgoodrich\b/i.test(courseName)) return teeName;
  return goodrichTeeDisplayName(teeName);
}
