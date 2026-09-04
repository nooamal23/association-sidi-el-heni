import { useMemo, useState } from "react";

/** Arabic-aware normalization for comparison only (does not mutate data). */
export function normalizeArabic(s: unknown): string {
  if (s == null) return "";
  let str = String(s);
  // Strip tashkeel (harakat) and tatweel
  str = str.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
  // Normalize alef forms → ا
  str = str.replace(/[\u0622\u0623\u0625]/g, "\u0627");
  // Normalize alef maksura ى → ي
  str = str.replace(/\u0649/g, "\u064A");
  // Normalize ta marbuta ة → ه
  str = str.replace(/\u0629/g, "\u0647");
  // Lowercase Latin
  str = str.toLowerCase();
  // Collapse whitespace
  str = str.replace(/\s+/g, " ").trim();
  return str;
}

export function matchesQuery(value: unknown, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return normalizeArabic(value).includes(normalizedQuery);
}

/**
 * Client-side live search hook.
 * @param items list to filter
 * @param fields accessor functions returning searchable strings for each item
 */
export function useLiveSearch<T>(
  items: T[],
  fields: Array<(item: T) => unknown>,
) {
  const [query, setQuery] = useState("");
  const normalized = useMemo(() => normalizeArabic(query), [query]);
  const filtered = useMemo(() => {
    if (!normalized) return items;
    return items.filter((it) =>
      fields.some((f) => matchesQuery(f(it), normalized)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, normalized]);
  return { query, setQuery, filtered };
}
