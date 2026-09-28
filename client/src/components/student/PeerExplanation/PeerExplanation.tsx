import type { PairAssigned } from "@shared/types.ts";
import { usePreferences } from "../../../context/PreferencesContext.tsx";
import "./PeerExplanation.css";

type Props = {
  assignment: PairAssigned;
  prompt: string;
  rated: boolean;
  onRate: (rating: 1 | 3 | 5) => void;
};

export default function PeerExplanation({
  assignment,
  prompt,
  rated,
  onRate,
}: Props) {
  const { t } = usePreferences();
  const isExplainer = assignment.role === "explainer";

  return (
    <section className="peer" aria-labelledby="peer-title">
      <header className="peer__header">
        <p className="peer__kicker">
          <span aria-hidden="true">02</span>
          {t("peerMoment")}
        </p>
        <div className="peer__identity">
          <div className="peer__avatar" aria-hidden="true">
            {assignment.partner.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span>{t("yourPartner")}</span>
            <h1 id="peer-title" dir="auto">
              {assignment.partner.name}
            </h1>
          </div>
        </div>
        <div className={`peer__role peer__role--${assignment.role}`}>
          <span>{t("yourRole")}</span>
          <strong>{isExplainer ? t("explainRole") : t("listenRole")}</strong>
        </div>
      </header>

      <article className="peer__prompt">
        <span className="peer__prompt-index" aria-hidden="true">
          ⌁
        </span>
        <div>
          <p>
            {isExplainer ? t("explainPromptLabel") : t("listenPromptLabel")}
          </p>
          <h2 dir="auto">{isExplainer ? prompt : t("listenInstruction")}</h2>
        </div>
      </article>

      {isExplainer ? (
        <aside className="peer__coach">
          <span aria-hidden="true">✦</span>
          <p>
            <strong>{t("explainTipTitle")}</strong>
            {t("explainTip")}
          </p>
        </aside>
      ) : rated ? (
        <section className="peer__rated" aria-live="polite">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>{t("clarityRecorded")}</strong>
            <p>{t("clarityRecordedHint")}</p>
          </div>
        </section>
      ) : (
        <fieldset className="peer__clarity">
          <legend>{t("didItMakeSense")}</legend>
          <p>{t("clarityHint")}</p>
          <div className="peer__clarity-grid">
            <button
              type="button"
              className="peer__rating peer__rating--yes"
              onClick={() => onRate(5)}
            >
              <span aria-hidden="true">✓</span>
              <strong>{t("clarityYes")}</strong>
            </button>
            <button
              type="button"
              className="peer__rating peer__rating--partly"
              onClick={() => onRate(3)}
            >
              <span aria-hidden="true">≈</span>
              <strong>{t("clarityPartly")}</strong>
            </button>
            <button
              type="button"
              className="peer__rating peer__rating--no"
              onClick={() => onRate(1)}
            >
              <span aria-hidden="true">×</span>
              <strong>{t("clarityNo")}</strong>
            </button>
          </div>
        </fieldset>
      )}
    </section>
  );
}
