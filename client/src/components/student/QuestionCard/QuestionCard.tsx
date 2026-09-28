import { usePreferences } from "../../../context/PreferencesContext.tsx";
import "./QuestionCard.css";

type QuestionOption = {
  id: string;
  text: string;
};

type QuestionCardProps = {
  topic?: string;
  prompt: string;
  options: QuestionOption[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default function QuestionCard({
  topic,
  prompt,
  options,
  selectedOptionId,
  onSelect,
  disabled = false,
}: QuestionCardProps) {
  const { t } = usePreferences();

  return (
    <section
      className="question-card"
      aria-labelledby="student-question-title"
    >
      <header className="question-card__header">
        <div className="question-card__meta">
          <span className="question-card__eyebrow">
            {t("question")}
          </span>

          {topic && (
            <span className="question-card__topic" dir="auto">
              {topic}
            </span>
          )}
        </div>

        <span className="question-card__number" aria-hidden="true">
          01
        </span>
      </header>

      <h1
        id="student-question-title"
        className="question-card__prompt"
        dir="auto"
      >
        {prompt}
      </h1>

      <div
        className="question-card__options"
        role="radiogroup"
        aria-label={t("question")}
      >
        {options.map((option, index) => {
          const selected = selectedOptionId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={`question-card__option ${
                selected ? "question-card__option--selected" : ""
              }`}
              onClick={() => onSelect(option.id)}
            >
              <span
                className="question-card__option-letter"
                aria-hidden="true"
              >
                {OPTION_LETTERS[index] ?? index + 1}
              </span>

              <span
                className="question-card__option-text"
                dir="auto"
              >
                {option.text}
              </span>

              <span
                className="question-card__option-indicator"
                aria-hidden="true"
              >
                <span />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}