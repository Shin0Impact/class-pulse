import type { Calibration } from "@shared/types.ts";
import type { TranslationKey } from "../../i18n/translations.ts";

export const CALIBRATION_KEY: Record<Calibration, TranslationKey> = {
  "well-calibrated": "calWell",
  overconfident: "calOver",
  underconfident: "calUnder",
  "no-data": "calNoData",
};

export const pctText = (value: number | null) => (value === null ? "–" : `${value}%`);

export function dateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}
