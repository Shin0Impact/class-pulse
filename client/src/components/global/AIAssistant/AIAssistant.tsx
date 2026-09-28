import { useState, type FormEvent } from "react";
import { usePreferences } from "../../../context/PreferencesContext";
import "./AIAssistant.css";
type Message = { id: number; role: "assistant" | "user"; text: string };
function answer(input: string, ar: boolean) {
  const q = input.toLowerCase();
  if (/join|code|كود|طالب|انضم/.test(q))
    return ar
      ? "للدخول كطالب اضغط «دخول طالب»، ثم اكتب كود الحصة الذي يعرضه المعلم."
      : "Choose “Student join”, then enter the class code shown by your teacher.";
  if (/teacher|معلم|استاذ|أستاذ|حصة|session/.test(q))
    return ar
      ? "اضغط «ابدأ كمعلم» لإنشاء حصة والحصول على كود مشاركة للطلاب."
      : "Choose “Start teaching” to create a session and get a join code for students.";
  if (/نبض|pulse|green|yellow|red|اخضر|أخضر|اصفر|أصفر|احمر|أحمر/.test(q))
    return ar
      ? "النبض هو إشارة فهم سريعة: أخضر = فاهم، أصفر = مش متأكد، أحمر = محتاج توضيح. المعلم يشوف الصورة لحظيًا."
      : "The pulse is a quick understanding signal: green = following, yellow = unsure, red = needs clarification. The teacher sees the class picture live.";
  if (/لغة|language|english|عربي/.test(q))
    return ar
      ? "تقدر تغيّر اللغة من زر اللغة الثابت أعلى الصفحة. اختيارك يُحفظ تلقائيًا."
      : "Use the fixed language control at the top of the page. Your choice is saved automatically.";
  if (/dark|light|ثيم|داكن|الوضع/.test(q))
    return ar
      ? "زر القمر أو الشمس أعلى الصفحة يبدّل بين الوضع الفاتح والداكن، ويُحفظ اختيارك."
      : "Use the moon/sun control at the top to switch between light and dark mode. Your choice is saved.";
  return ar
    ? "أنا مساعد نبض الصف. اسألني عن دخول الطالب، بدء حصة للمعلم، معنى ألوان النبض، اللغة أو الثيم."
    : "I’m the Class Pulse assistant. Ask me about student joining, starting a teacher session, pulse colors, language, or theme.";
}
export default function AIAssistant() {
  const { language } = usePreferences();
  const ar = language === "ar";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: ar
        ? "أهلًا! أنا مساعد نبض الصف. كيف أقدر أساعدك؟"
        : "Hi! I’m the Class Pulse assistant. How can I help?",
    },
  ]);
  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setMessages((m) => [
      ...m,
      { id: Date.now(), role: "user", text: clean },
      { id: Date.now() + 1, role: "assistant", text: answer(clean, ar) },
    ]);
    setText("");
  }
  return (
    <aside
      className="ai-assistant"
      aria-label={ar ? "مساعد نبض الصف" : "Class Pulse assistant"}
    >
      {open && (
        <section className="ai-panel">
          <header>
            <span className="ai-avatar">✦</span>
            <div>
              <strong>{ar ? "مساعد نبض الصف" : "Pulse Assistant"}</strong>
              <small>
                <i />
                {ar ? "متاح الآن" : "Online"}
              </small>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={ar ? "إغلاق" : "Close"}
            >
              ×
            </button>
          </header>
          <div className="ai-messages" aria-live="polite">
            {messages.map((m) => (
              <p key={m.id} className={`ai-message ai-message--${m.role}`}>
                {m.text}
              </p>
            ))}
          </div>
          <form onSubmit={submit}>
            <label className="sr-only" htmlFor="ai-question">
              {ar ? "اكتب سؤالك" : "Type your question"}
            </label>
            <input
              id="ai-question"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={ar ? "اسأل عن نبض الصف…" : "Ask about Class Pulse…"}
            />
            <button type="submit" aria-label={ar ? "إرسال" : "Send"}>
              ↑
            </button>
          </form>
          <small className="ai-note">
            {ar
              ? "مساعد تجريبي لشرح المنصة"
              : "Demo assistant for platform guidance"}
          </small>
        </section>
      )}
      <button
        className="ai-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span aria-hidden="true">✦</span>
        <b>{ar ? "اسأل نبض" : "Ask Pulse"}</b>
      </button>
    </aside>
  );
}
