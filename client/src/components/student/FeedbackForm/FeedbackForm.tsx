import { useState } from "react";
import { EVENTS } from "@shared/events.ts";
import { emitAck } from "../../../socket/socket.ts";
import { usePreferences } from "../../../context/PreferencesContext.tsx";
import "./FeedbackForm.css";

type Props = {
  onSubmitted?: () => void;
};

export default function FeedbackForm({ onSubmitted }: Props) {
  const { t } = usePreferences();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submitFeedback() {
    if (rating < 1 || rating > 5) {
      setError(t("feedbackChooseRating"));
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await emitAck(EVENTS.STUDENT_SUBMIT_FEEDBACK, {
        rating,
        comment,
        anonymous,
      });

      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feedbackSendError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="feedback-form feedback-form--thanks">
        <div className="feedback-form__thanks-icon">✓</div>

        <h1>{t("feedbackThanks")}</h1>

        <p>{t("feedbackSuccess")}</p>
      </section>
    );
  }

  return (
    <section className="feedback-form">
      <header className="feedback-form__header">
        <span className="feedback-form__eyebrow">{t("feedbackEyebrow")}</span>

        <h1>{t("feedbackTitle")}</h1>

        <p>{t("feedbackDescription")}</p>
      </header>

      <div className="feedback-form__rating">
        <span className="feedback-form__label">{t("feedbackRate")}</span>

        <div
          className="feedback-form__stars"
          role="radiogroup"
          aria-label={t("feedbackRate")}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={
                star <= rating
                  ? "feedback-form__star feedback-form__star--active"
                  : "feedback-form__star"
              }
              onClick={() => {
                setRating(star);
                setError("");
              }}
              aria-label={`${star} ${t("feedbackStars")}`}
              aria-pressed={rating === star}
            >
              ★
            </button>
          ))}
        </div>

        {rating > 0 && (
          <strong className="feedback-form__rating-value">{rating} / 5</strong>
        )}
      </div>

      <div className="feedback-form__comment">
        <label htmlFor="class-feedback">
          {t("feedbackTellMore")}
          <span> {t("feedbackOptional")}</span>
        </label>

        <textarea
          id="class-feedback"
          value={comment}
          maxLength={500}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("feedbackPlaceholder")}
          rows={5}
        />

        <span className="feedback-form__counter">{comment.length}/500</span>
      </div>

      <div className="feedback-form__privacy">
        <div>
          <strong>
            {anonymous ? t("feedbackAnonymous") : t("feedbackShowName")}
          </strong>

          <span>
            {anonymous ? t("feedbackAnonymousHint") : t("feedbackNameHint")}
          </span>
        </div>

        <button
          type="button"
          className={`feedback-form__switch ${
            anonymous ? "feedback-form__switch--active" : ""
          }`}
          onClick={() => setAnonymous((current) => !current)}
          aria-pressed={anonymous}
        >
          <span />
        </button>
      </div>

      {error && (
        <p className="feedback-form__error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="feedback-form__submit"
        disabled={submitting || rating === 0}
        onClick={submitFeedback}
      >
        {submitting ? t("feedbackSending") : t("feedbackSend")}
      </button>

      <p className="feedback-form__privacy-note">
        {anonymous ? t("feedbackAnonymousNote") : t("feedbackNameNote")}
      </p>
    </section>
  );
}
