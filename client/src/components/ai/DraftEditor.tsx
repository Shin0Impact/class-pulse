import { usePreferences } from "../../context/PreferencesContext.tsx";
import type { QuestionDraft } from "@shared/types.ts";
import { newId } from "../../utils/id.ts";
import "./ai.css";

const IDS = ["a", "b", "c", "d", "e", "f"];

// A question the teacher checks before it goes to the class: an AI draft, or one they write.
// Controlled: every edit goes through onChange.
export default function DraftEditor({
  draft,
  onChange,
}: {
  draft: QuestionDraft;
  onChange: (next: QuestionDraft) => void;
}) {
  const { t } = usePreferences();
  const set = (patch: Partial<QuestionDraft>) => onChange({ ...draft, ...patch });

  function setOption(id: string, text: string) {
    set({ options: draft.options.map((o) => (o.id === id ? { ...o, text } : o)) });
  }

  function removeOption(id: string) {
    const options = draft.options.filter((o) => o.id !== id);
    const { [id]: _removed, ...optionNotes } = draft.optionNotes;
    set({
      options,
      optionNotes,
      correctOptionId: draft.correctOptionId === id ? (options[0]?.id ?? "") : draft.correctOptionId,
    });
  }

  function addOption() {
    const id = IDS.find((x) => !draft.options.some((o) => o.id === x));
    if (id) set({ options: [...draft.options, { id, text: "" }] });
  }

  return (
    <div className="ai-draft">
      <label>
        <span>{t("questionWord")}</span>
        <textarea dir="auto" maxLength={400} value={draft.prompt} onChange={(e) => set({ prompt: e.target.value })} />
      </label>

      {draft.kind === "mcq" ? (
        <fieldset className="ai-draft__options">
          <legend>{t("optionsMarkCorrect")}</legend>
          {draft.options.map((o, i) => (
            <div key={o.id} className="ai-option">
              <button
                type="button"
                className="ai-option__correct"
                aria-pressed={draft.correctOptionId === o.id}
                aria-label={`${t("markCorrect")} ${String.fromCharCode(65 + i)}`}
                onClick={() => set({ correctOptionId: o.id })}
              >
                {draft.correctOptionId === o.id ? "✓" : String.fromCharCode(65 + i)}
              </button>
              <input
                type="text"
                dir="auto"
                maxLength={150}
                value={o.text}
                aria-label={`${t("optionWord")} ${String.fromCharCode(65 + i)}`}
                onChange={(e) => setOption(o.id, e.target.value)}
              />
              {draft.options.length > 2 ? (
                <button type="button" className="ai-option__remove" aria-label={t("removeOption")} onClick={() => removeOption(o.id)}>
                  ×
                </button>
              ) : (
                <span />
              )}
              {draft.optionNotes[o.id] && draft.correctOptionId !== o.id && (
                <p className="ai-option__note" dir="auto">
                  {t("misconceptionWord")}: {draft.optionNotes[o.id]}
                </p>
              )}
            </div>
          ))}
          {draft.options.length < IDS.length && (
            <button type="button" className="ai-draft__add" onClick={addOption}>
              + {t("addOption")}
            </button>
          )}
        </fieldset>
      ) : (
        <label>
          <span>{t("modelAnswer")}</span>
          <textarea dir="auto" maxLength={600} value={draft.modelAnswer} onChange={(e) => set({ modelAnswer: e.target.value })} />
          <p className="ai-draft__hint">{t("modelAnswerHint")}</p>
        </label>
      )}

      <label>
        <span>{t("topicLabel")}</span>
        <input type="text" dir="auto" maxLength={80} value={draft.topic} onChange={(e) => set({ topic: e.target.value })} />
      </label>
    </div>
  );
}

// What's wrong with a draft, if anything (shown instead of launching).
export function draftProblem(draft: QuestionDraft): "needPrompt" | "needOptions" | "needCorrect" | null {
  if (!draft.prompt.trim()) return "needPrompt";
  if (draft.kind === "open") return null;
  const filled = draft.options.filter((o) => o.text.trim());
  if (filled.length < 2 || filled.length !== draft.options.length) return "needOptions";
  if (!filled.some((o) => o.id === draft.correctOptionId)) return "needCorrect";
  return null;
}

export function emptyDraft(kind: QuestionDraft["kind"]): QuestionDraft {
  return {
    id: `t-${newId()}`,
    kind,
    topic: "",
    prompt: "",
    options: kind === "mcq" ? IDS.slice(0, 4).map((id) => ({ id, text: "" })) : [],
    correctOptionId: kind === "mcq" ? "a" : "",
    optionNotes: {},
    modelAnswer: "",
    source: "teacher",
  };
}

// The launch payload: trimmed text. An AI draft's rubric comes along; it's keyword-based, so it
// still scores students' explanations sensibly after light edits to the wording.
export function draftToQuestion(draft: QuestionDraft) {
  return {
    id: draft.id,
    kind: draft.kind,
    topic: draft.topic.trim(),
    prompt: draft.prompt.trim(),
    options: draft.options.map((o) => ({ id: o.id, text: o.text.trim() })),
    correctOptionId: draft.correctOptionId,
    rubric: draft.rubric,
    modelAnswer: draft.modelAnswer.trim() || undefined,
    source: draft.source,
  };
}
