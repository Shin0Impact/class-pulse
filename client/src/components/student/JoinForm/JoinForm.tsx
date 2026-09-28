import type { FormEvent } from "react";
import { usePreferences } from "../../../context/PreferencesContext";
import "./JoinForm.css";

type JoinFormProps = {
  name: string;
  code: string;
  busy: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function JoinForm({
  name,
  code,
  busy,
  error,
  onNameChange,
  onCodeChange,
  onSubmit,
}: JoinFormProps) {
  const { t } = usePreferences();

  return (
    <section className="student-join-form" aria-labelledby="student-join-title">
      <header className="student-join-form__header">
        <p className="student-join-form__eyebrow">CLASS PULSE</p>

        <h1 id="student-join-title">{t("joinTitle")}</h1>

        <p className="student-join-form__description">{t("joinDescription")}</p>
      </header>

      <form className="student-join-form__fields" onSubmit={onSubmit}>
        <label className="student-join-form__field">
          <span>{t("yourName")}</span>

          <input
            type="text"
            dir="auto"
            maxLength={24}
            autoComplete="name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder={t("namePlaceholder")}
            required
          />
        </label>

        <label className="student-join-form__field">
          <span>{t("classCode")}</span>

          <input
            className="student-join-form__code"
            type="text"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            value={code}
            onChange={(event) =>
              onCodeChange(event.target.value.replace(/\D/g, ""))
            }
            placeholder="0000"
            required
          />
        </label>

        {error && (
          <p className="student-join-form__error" role="alert">
            {error}
          </p>
        )}

        <button
          className="student-join-form__submit"
          type="submit"
          disabled={busy || code.length !== 4 || !name.trim()}
        >
          <span>{busy ? t("joining") : t("join")}</span>

          {!busy && (
            <span className="student-join-form__arrow" aria-hidden="true">
              ←
            </span>
          )}
        </button>
      </form>

      <footer className="student-join-form__status">
        <span className="student-join-form__status-dot" aria-hidden="true" />

        <span>{t("joinReady")}</span>
      </footer>
    </section>
  );
}
