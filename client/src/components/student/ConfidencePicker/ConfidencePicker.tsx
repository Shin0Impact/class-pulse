import { usePreferences } from "../../../context/PreferencesContext.tsx";
import type { Confidence } from "@shared/types.ts";
import type { TranslationKey } from "../../../i18n/translations.ts";

import "./ConfidencePicker.css";

type ConfidencePickerProps = {
  value: Confidence | null;
  onSelect: (confidence: Confidence) => void;
};

type ConfidenceOption = {
  id: Confidence;
  label: TranslationKey;
  hint: TranslationKey;
  symbol: string;
};

const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  {
    id: "guess",
    label: "guessing",
    hint: "guessingHint",
    symbol: "?",
  },
  {
    id: "fairly-sure",
    label: "fairlySure",
    hint: "fairlySureHint",
    symbol: "~",
  },
  {
    id: "certain",
    label: "certain",
    hint: "certainHint",
    symbol: "✓",
  },
];

export default function ConfidencePicker({
  value,
  onSelect,
}: ConfidencePickerProps) {
  const { t } = usePreferences();

  return (
    <section className="confidence-picker" aria-labelledby="confidence-title">
      <header className="confidence-picker__header">
        <span className="confidence-picker__eyebrow">{t("oneMoreThing")}</span>

        <h2 id="confidence-title">{t("howSure")}</h2>

        <p>{t("confidenceHint")}</p>
      </header>

      <div
        className="confidence-picker__options"
        role="radiogroup"
        aria-label={t("howSure")}
      >
        {CONFIDENCE_OPTIONS.map((option) => {
          const selected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`confidence-picker__option ${
                selected ? "confidence-picker__option--selected" : ""
              }`}
              onClick={() => onSelect(option.id)}
            >
              <span className="confidence-picker__symbol" aria-hidden="true">
                {option.symbol}
              </span>

              <span className="confidence-picker__copy">
                <strong>{t(option.label)}</strong>
                <span>{t(option.hint)}</span>
              </span>

              <span className="confidence-picker__indicator" aria-hidden="true">
                <span />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
