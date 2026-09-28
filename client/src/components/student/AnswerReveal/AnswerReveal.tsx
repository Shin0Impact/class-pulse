import type { AnswerReveal as AnswerRevealData } from "@shared/types.ts";
import { usePreferences } from "../../../context/PreferencesContext.tsx";

import "./AnswerReveal.css";

type Props = {
  result: AnswerRevealData;
  onContinue: () => void;
};

export default function AnswerReveal({ result, onContinue }: Props) {
  const { t } = usePreferences();

  // S4's special moment:
  // the student felt certain, but their answer was wrong.
  const isSurprise = !result.correct && result.confidence === "certain";

  function getCalibrationMessage() {
    if (result.correct) {
      if (result.confidence === "certain") {
        return t("calibrationCorrectCertain");
      }

      if (result.confidence === "fairly-sure") {
        return t("calibrationCorrectFairly");
      }

      return t("calibrationCorrectGuess");
    }

    if (result.confidence === "certain") {
      return t("calibrationWrongCertain");
    }

    if (result.confidence === "fairly-sure") {
      return t("calibrationWrongFairly");
    }

    return t("calibrationWrongGuess");
  }

  const calibrationMessage = getCalibrationMessage();

  return (
    <section
      className={[
        "answer-reveal",
        result.correct ? "answer-reveal--correct" : "answer-reveal--wrong",
        isSurprise ? "answer-reveal--surprise" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
    >
      {/* Result header */}

      <header className="answer-reveal__hero">
        <span className="answer-reveal__eyebrow">
          {isSurprise ? t("surpriseMoment") : t("answerReveal")}
        </span>

        <div className="answer-reveal__symbol" aria-hidden="true">
          {isSurprise ? "!" : result.correct ? "✓" : "×"}
        </div>

        <h1 className="answer-reveal__title">
          {isSurprise
            ? t("surpriseTitle")
            : result.correct
              ? t("answerCorrect")
              : t("answerWrong")}
        </h1>

        {isSurprise && (
          <p className="answer-reveal__lead">{t("surpriseLead")}</p>
        )}
      </header>

      {/* Student answer vs correct answer */}

      <div className="answer-reveal__answers">
        <article className="answer-reveal__answer">
          <span className="answer-reveal__answer-label">{t("yourAnswer")}</span>

          <strong className="answer-reveal__answer-text" dir="auto">
            {result.selectedOptionText}
          </strong>
        </article>

        <article className="answer-reveal__answer answer-reveal__answer--correct">
          <span className="answer-reveal__answer-label">
            {t("correctAnswer")}
          </span>

          <strong className="answer-reveal__answer-text" dir="auto">
            {result.correctOptionText}
          </strong>
        </article>
      </div>

      {/* Plain-language calibration */}

      <section className="answer-reveal__calibration">
        <div className="answer-reveal__calibration-icon" aria-hidden="true">
          ↗
        </div>

        <div className="answer-reveal__calibration-content">
          <span className="answer-reveal__calibration-label">
            {t("calibrationLabel")}
          </span>

          <h2 className="answer-reveal__calibration-message">
            {calibrationMessage}
          </h2>
        </div>
      </section>

      {/* Extra explanation for confident-wrong answers */}

      {isSurprise && (
        <aside className="answer-reveal__why">
          <span className="answer-reveal__why-icon" aria-hidden="true">
            ✦
          </span>

          <p>{t("surpriseWhyItMatters")}</p>
        </aside>
      )}

      {/* Continue */}

      <button
        type="button"
        className="answer-reveal__continue"
        onClick={onContinue}
      >
        <span>{t("continueLearning")}</span>

        <span className="answer-reveal__continue-arrow" aria-hidden="true">
          →
        </span>
      </button>
    </section>
  );
}
