const ORDINAL = /^(\d+)(?:st|nd|rd|th)\s+in\s+(.+)$/i;

export function parseStandingSummary(text: string): {
  divisionRank?: number;
  divisionName?: string;
} {
  const m = text.trim().match(ORDINAL);
  if (!m) return {};
  const divisionName = m[2].replace(/\s+Division$/i, "").trim();
  return { divisionRank: Number(m[1]), divisionName };
}
