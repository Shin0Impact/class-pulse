import { usePreferences } from "../../../context/PreferencesContext";
import "./Features.css";
export default function Features() {
  const { language } = usePreferences();
  const ar = language === "ar";
  const items = ar
    ? [
        ["◎", "فجوات الفهم", "اعرف أين بدأ الارتباك، وليس فقط من أجاب خطأ."],
        [
          "↯",
          "تفاعل لحظي",
          "نبض الصف يتغير أثناء الشرح ويعطي المعلم إشارة واضحة للتدخل.",
        ],
        [
          "◫",
          "أسئلة عادلة ومختلفة",
          "نفس المهارة، لكن بصيغ وأرقام مختلفة لتقليل النقل بين الطلاب.",
        ],
        [
          "◇",
          "مساحة آمنة للطالب",
          "الطالب يعبّر عن عدم الفهم بدون إحراج أمام زملائه.",
        ],
        [
          "⌁",
          "من الحفظ إلى الفهم",
          "الشرح والتبرير يكشفان إذا كان الطالب يفهم الفكرة فعلًا.",
        ],
        [
          "✦",
          "قرار أسرع للمعلم",
          "إشارة واضحة تساعدك تختار: أكمل، أبطئ، أو أعد الشرح.",
        ],
      ]
    : [
        [
          "◎",
          "Find comprehension gaps",
          "See where confusion started, not only who answered incorrectly.",
        ],
        [
          "↯",
          "Real-time feedback",
          "The class pulse changes as you teach and signals when to intervene.",
        ],
        [
          "◫",
          "Fair, varied questions",
          "Same skill, different numbers or forms to reduce copying.",
        ],
        [
          "◇",
          "A safer student voice",
          "Students can signal confusion without public embarrassment.",
        ],
        [
          "⌁",
          "Beyond memorization",
          "Explanation and reasoning reveal whether the idea is truly understood.",
        ],
        [
          "✦",
          "Faster teacher decisions",
          "A clear signal helps you continue, slow down, or reteach.",
        ],
      ];
  return (
    <section
      className="features"
      id="features"
      aria-labelledby="features-title"
    >
      <header className="section-heading">
        <span>{ar ? "مصمم للحصة الحقيقية" : "BUILT FOR REAL CLASSROOMS"}</span>
        <h2 id="features-title">
          {ar
            ? "مش لوحة بيانات إضافية. أداة قرار."
            : "Not another dashboard. A decision tool."}
        </h2>
        <p>
          {ar
            ? "نبض الصف يركز على اللحظة التي يحتاج فيها المعلم معلومة قابلة للتصرف."
            : "Class Pulse focuses on the moment a teacher needs information they can act on."}
        </p>
      </header>
      <div className="features__grid">
        {items.map(([icon, title, body]) => (
          <article className="feature-card" key={title}>
            <span aria-hidden="true">{icon}</span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
