import type {
  AnswerReveal as AnswerRevealData,
  CalibrationCard,
} from "@shared/types.ts";

import { usePreferences } from "../../../context/PreferencesContext.tsx";

import "./AnswerReveal.css";

type Props = {
  result: AnswerRevealData;
  calibrationCard?: CalibrationCard | null;
  onContinue: () => void;
};

export default function AnswerReveal({
  result,
  calibrationCard,
  onContinue,
}: Props) {
  const { t } = usePreferences();

  /*
    S4 / S5 special moment:
    Student was certain, but the answer was wrong.
  */
  const isSurprise = !result.correct && result.confidence === "certain";

  /*
    Fallback calibration message.

    This keeps S4 working even if CALIBRATION_CARD
    has not arrived yet.
  */
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

  /*
    When the real CALIBRATION_CARD event arrives,
    prefer the server's calibration classification.

    If it has not arrived yet, use the original
    S4 result + confidence logic.
  */
  function getServerCalibrationMessage() {
    if (!calibrationCard) {
      return getCalibrationMessage();
    }

    switch (calibrationCard.calibration) {
      case "overconfident":
        return t("calibrationWrongCertain");

      case "underconfident":
        return t("calibrationCorrectFairly");

      case "well-calibrated":
        return result.correct
          ? t("calibrationCorrectCertain")
          : getCalibrationMessage();

      case "no-data":
      default:
        return getCalibrationMessage();
    }
  }

  const calibrationMessage = getServerCalibrationMessage();

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
      {/* RESULT HEADER */}

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

      {/* ANSWER COMPARISON */}

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

      {/* REAL CALIBRATION */}

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

          {calibrationCard && calibrationCard.accuracy !== null && (
            <p className="answer-reveal__calibration-data">
              Accuracy: {calibrationCard.accuracy}%
              {calibrationCard.avgConfidence !== null &&
                ` · Confidence: ${calibrationCard.avgConfidence}%`}
            </p>
          )}
        </div>
      </section>

      {/* SURPRISE EXPLANATION */}

      {isSurprise && (
        <aside className="answer-reveal__why">
          <span className="answer-reveal__why-icon" aria-hidden="true">
            ✦
          </span>

          <p>{t("surpriseWhyItMatters")}</p>
        </aside>
      )}

      {/* CONTINUE */}

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
