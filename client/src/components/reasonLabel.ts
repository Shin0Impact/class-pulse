import { OTHER_REASON_ID, customReasonText, isCustomReason } from "@shared/events.ts";
import type { TranslationKey } from "../i18n/translations.ts";

// One place that turns a stored reason into text in the teacher's/student's language.
// Presets and the aggregated "Other" bar are translated; a student's own words are shown as typed.
// Returns null for an unknown id so callers can fall back to the server's label.
const KEYS: Record<string, TranslationKey> = {
  "too-fast": "reasonTooFast",
  "unclear-steps": "reasonUnclearSteps",
  "need-example": "reasonNeedExample",
  "missing-basics": "reasonMissingBasics",
  [OTHER_REASON_ID]: "reasonOther",
};

export function reasonLabel(
  reason: string | null | undefined,
  t: (key: TranslationKey) => string,
): string | null {
  if (!reason) return null;
  if (isCustomReason(reason)) return customReasonText(reason) || null;
  const key = KEYS[reason];
  return key ? t(key) : null;
}
