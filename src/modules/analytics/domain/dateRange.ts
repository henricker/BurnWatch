import type { DateRangeKey } from "./types";

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export interface DateRangeResult {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

export function resolveDateRange(range: DateRangeKey, now: Date = new Date()): DateRangeResult {
  const today = startOfDayUTC(now);
  let start: Date;
  const end: Date = today;

  if (range === "MTD") {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  } else if (range === "7D") {
    start = addDays(today, -6);
  } else {
    start = addDays(today, -29);
  }

  const numDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -numDays + 1);

  return { start, end, previousStart, previousEnd };
}
