/**
 * Property comparison tool logic — issue #900.
 *
 * Pure helpers backing the compare tray and comparison page:
 *   - tray state transitions (add/remove, max 3, adding a 4th is an error)
 *   - sessionStorage persistence (session-intent, not bookmarks)
 *   - shareable URL `ids` param encode/decode
 *   - amenity diff for highlighting per-property availability
 *
 * Keeping this pure makes the tray reducer and comparison page trivially
 * testable and avoids scattering the max-3 rule across components.
 */

export const MAX_COMPARE = 3;
export const MIN_COMPARE = 2;
export const COMPARE_STORAGE_KEY = "compare:ids";

export interface AddResult {
  ids: string[];
  added: boolean;
  /** Present when the add was rejected. */
  error?: "full" | "duplicate";
}

/**
 * Add a listing to the compare set. Adding beyond MAX_COMPARE is rejected with
 * an explicit `full` error (the UI shows a tooltip rather than silently
 * replacing). Duplicates are a no-op `duplicate` error.
 */
export function addToCompare(ids: string[], id: string): AddResult {
  if (ids.includes(id)) {
    return { ids, added: false, error: "duplicate" };
  }
  if (ids.length >= MAX_COMPARE) {
    return { ids, added: false, error: "full" };
  }
  return { ids: [...ids, id], added: true };
}

export function removeFromCompare(ids: string[], id: string): string[] {
  return ids.filter((existing) => existing !== id);
}

export function isCompareFull(ids: string[]): boolean {
  return ids.length >= MAX_COMPARE;
}

/** A comparison needs at least MIN_COMPARE listings to be meaningful. */
export function canCompare(ids: string[]): boolean {
  return ids.length >= MIN_COMPARE;
}

// ---- URL sharing ----------------------------------------------------------

/** Encode the compare set into a `ids=a,b,c` query value (capped at MAX_COMPARE). */
export function encodeCompareIds(ids: string[]): string {
  return dedupe(ids).slice(0, MAX_COMPARE).join(",");
}

/** Parse a shared `ids` query value back into a clean, capped, de-duplicated list. */
export function parseCompareIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return dedupe(parsed).slice(0, MAX_COMPARE);
}

// ---- sessionStorage persistence ------------------------------------------

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getSessionStorage(): StorageLike | null {
  try {
    if (typeof globalThis !== "undefined" && (globalThis as { sessionStorage?: StorageLike }).sessionStorage) {
      return (globalThis as { sessionStorage: StorageLike }).sessionStorage;
    }
  } catch {
    // Access can throw in sandboxed/SSR contexts.
  }
  return null;
}

export function loadCompareIds(storage: StorageLike | null = getSessionStorage()): string[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return dedupe(parsed.filter((x): x is string => typeof x === "string")).slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

export function saveCompareIds(ids: string[], storage: StorageLike | null = getSessionStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(dedupe(ids).slice(0, MAX_COMPARE)));
  } catch {
    // Ignore quota / availability errors — comparison is best-effort.
  }
}

// ---- Amenity diff ---------------------------------------------------------

export interface AmenityRow {
  amenity: string;
  /** Availability per listing, in the same order as the provided ids. */
  availability: boolean[];
  /** True when listings disagree (some have it, some don't) — UI highlights these. */
  differs: boolean;
}

/**
 * Build amenity comparison rows across listings. Each row reports per-listing
 * availability and whether the listings differ on that amenity.
 *
 * @param listings  ordered listings, each with the amenities it offers
 */
export function buildAmenityDiff(
  listings: Array<{ amenities: string[] }>,
): AmenityRow[] {
  const all = dedupe(listings.flatMap((l) => l.amenities)).sort((a, b) => a.localeCompare(b));
  return all.map((amenity) => {
    const availability = listings.map((l) => l.amenities.includes(amenity));
    const differs = availability.some((v) => v) && availability.some((v) => !v);
    return { amenity, availability, differs };
  });
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}
