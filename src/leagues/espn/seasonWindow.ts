function parseYmd(s: string): Date {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6)) - 1;
  const d = Number(s.slice(6, 8));
  return new Date(Date.UTC(y, m, d));
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// Soccer seasons run Aug–May; represent one by its starting calendar year.
export function seasonWindow(year: number): { start: string; end: string } {
  return {
    start: ymd(new Date(Date.UTC(year, 7, 1))), // Aug 1
    end: ymd(new Date(Date.UTC(year + 1, 5, 30))), // Jun 30 next year
  };
}

// Split an inclusive YYYYMMDD range into per-calendar-month ranges. The ESPN
// scoreboard hard-caps at 100 events per response; a month of one league is well
// under that, so month-sized chunks are safe.
export function monthlyChunks(
  startYmd: string,
  endYmd: string,
): { start: string; end: string }[] {
  const end = parseYmd(endYmd);
  const chunks: { start: string; end: string }[] = [];
  let cursor = parseYmd(startYmd);
  while (cursor.getTime() <= end.getTime()) {
    const monthEnd = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
    );
    const chunkEnd = monthEnd.getTime() < end.getTime() ? monthEnd : end;
    chunks.push({ start: ymd(cursor), end: ymd(chunkEnd) });
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }
  return chunks;
}

// Reasoned in UTC (consistent with seasonWindow/monthlyChunks). Only used as a
// fallback when ESPN omits season.year, so the once-a-year Jun30/Jul1 boundary
// where a local-time viewer might resolve a few hours early is immaterial.
export function currentSoccerSeasonYear(now: Date): number {
  const y = now.getUTCFullYear();
  return now.getUTCMonth() >= 6 ? y : y - 1; // Jul(6)+ → this year, else prior
}
