// Part 24 §4: a course must live inside its season's date range.
// Pure helpers so the rule can be unit-tested without a database.

function toDay(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Returns an Arabic error message when the course dates fall outside the
 * season range, or null when they are valid (same-day boundaries allowed).
 * `season` may be null/undefined (course not linked to a season) → no rule.
 */
export function findSeasonRangeError({ season, startDate, endDate }) {
  if (!season) return null;
  const seasonFrom = toDay(season.startsOn);
  const seasonTo = toDay(season.endsOn);
  const from = toDay(startDate);
  const to = toDay(endDate);
  const range = `مدة الموسم «${season.name ?? ""}»: ${seasonFrom} — ${seasonTo}.`;
  if (from && seasonFrom && from < seasonFrom) {
    return `تاريخ بداية الدورة يجب أن يكون في نفس يوم بداية الموسم الدراسي أو بعده. ${range}`;
  }
  if (to && seasonTo && to > seasonTo) {
    return `تاريخ نهاية الدورة يجب أن يكون في نفس يوم نهاية الموسم الدراسي أو قبله. ${range}`;
  }
  return null;
}
