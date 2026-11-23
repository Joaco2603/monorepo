/**
 * Payment dispute UI logic — issue #902.
 *
 * Pure helpers backing the dispute filing / tracking / admin screens:
 *   - the status timeline (Filed → Under Review → Resolved/Rejected) with
 *     per-step state and timestamps (reusable shape for the lease flow too)
 *   - filing guards (one pending dispute per payment), description and
 *     evidence validation, and the resolve-requires-text rule
 *   - evidence file kind detection for inline-vs-download rendering
 *
 * Mirrors the backend `paymentDispute` schema (status/reason enums, 10–1000
 * char description, max 5 evidence files).
 */

export type DisputeStatus = "pending" | "under_review" | "resolved" | "rejected";

export type DisputeReason =
  | "amount_discrepancy"
  | "duplicate_charge"
  | "service_not_received"
  | "early_termination"
  | "property_issue"
  | "other";

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  amount_discrepancy: "Amount discrepancy",
  duplicate_charge: "Duplicate charge",
  service_not_received: "Service not received",
  early_termination: "Early termination",
  property_issue: "Property issue",
  other: "Other",
};

export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 1000;
export const MAX_EVIDENCE_FILES = 5;

const ALLOWED_EVIDENCE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];

// ---- Status timeline ------------------------------------------------------

export type TimelineStepState = "complete" | "current" | "upcoming";

export interface TimelineStep {
  status: DisputeStatus;
  label: string;
  state: TimelineStepState;
  timestamp: string | null;
}

const STATUS_LABELS: Record<DisputeStatus, string> = {
  pending: "Filed",
  under_review: "Under Review",
  resolved: "Resolved",
  rejected: "Rejected",
};

/**
 * Build the status timeline for a dispute. The terminal step reflects the
 * actual outcome (Resolved or Rejected). Steps before the current status are
 * `complete`, the current status is `current`, and the rest are `upcoming`.
 *
 * @param timestamps optional ISO timestamps keyed by status, for past transitions
 */
export function buildStatusTimeline(
  currentStatus: DisputeStatus,
  timestamps: Partial<Record<DisputeStatus, string>> = {},
): TimelineStep[] {
  const terminal: DisputeStatus = currentStatus === "rejected" ? "rejected" : "resolved";
  const sequence: DisputeStatus[] = ["pending", "under_review", terminal];
  const currentIndex = sequence.indexOf(currentStatus);

  return sequence.map((status, index) => {
    let state: TimelineStepState;
    if (index < currentIndex) state = "complete";
    else if (index === currentIndex) state = "current";
    else state = "upcoming";
    return {
      status,
      label: STATUS_LABELS[status],
      state,
      timestamp: timestamps[status] ?? null,
    };
  });
}

// ---- Filing guards & validation -------------------------------------------

/**
 * A tenant may not have two open (pending) disputes for the same payment. The
 * backend enforces this; this surfaces the same rule in the UI.
 */
export function canFileDispute(
  existing: Array<{ paymentId: string; status: DisputeStatus }>,
  paymentId: string,
): boolean {
  return !existing.some((d) => d.paymentId === paymentId && d.status === "pending");
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDescription(value: string): ValidationResult {
  const len = value.trim().length;
  if (len < DESCRIPTION_MIN) {
    return { valid: false, error: `Description must be at least ${DESCRIPTION_MIN} characters.` };
  }
  if (value.length > DESCRIPTION_MAX) {
    return { valid: false, error: `Description must be at most ${DESCRIPTION_MAX} characters.` };
  }
  return { valid: true };
}

/** Remaining characters for the description counter (can go negative if over). */
export function descriptionCharsRemaining(value: string): number {
  return DESCRIPTION_MAX - value.length;
}

export function validateEvidenceFiles(
  files: Array<{ type: string }>,
): ValidationResult {
  if (files.length > MAX_EVIDENCE_FILES) {
    return { valid: false, error: `You can upload at most ${MAX_EVIDENCE_FILES} files.` };
  }
  const bad = files.find((f) => !ALLOWED_EVIDENCE_TYPES.includes(f.type));
  if (bad) {
    return { valid: false, error: `Unsupported file type: ${bad.type}` };
  }
  return { valid: true };
}

/** Resolving a dispute requires a non-empty resolution text. */
export function validateResolutionText(text: string): ValidationResult {
  if (text.trim().length === 0) {
    return { valid: false, error: "Resolution text is required." };
  }
  return { valid: true };
}

// ---- Evidence rendering ---------------------------------------------------

export type EvidenceKind = "image" | "pdf" | "other";

/** Classify an evidence file by its key/extension so the UI can inline images. */
export function evidenceKind(keyOrName: string): EvidenceKind {
  const lower = keyOrName.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/.test(lower)) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  return "other";
}
