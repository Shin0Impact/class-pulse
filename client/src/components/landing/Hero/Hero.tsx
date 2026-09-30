import { Link } from "react-router-dom";
import { usePreferences } from "../../../context/PreferencesContext";
import "./Hero.css";

export default function Hero() {
  const { language } = usePreferences();
  const ar = language === "ar";
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero__glow hero__glow--one" />
      <div className="hero__glow hero__glow--two" />
      <div className="hero__content">
        <p className="eyebrow">
          <span className="eyebrow__dot" />
          {ar
            ? "تعليم يفهم الطالب لحظة بلحظة"
            : "Understand learning, moment by moment"}
        </p>
        <h1 id="hero-title">
          {ar ? "لا تنتظر نهاية الحصة" : "Don’t wait until class ends"}
          <br />
          <span>{ar ? "لتعرف مين فهم." : "to know who understood."}</span>
        </h1>
        <p className="hero__lead">
          {ar
            ? "نبض الصف يحوّل فهم الطلاب إلى إشارة حيّة للمعلم — ويكشف فجوات الفهم قبل أن تتحول إلى فجوات تعلم."
            : "Class Pulse turns student understanding into a live signal for the teacher — revealing comprehension gaps before they become learning gaps."}
        </p>
        <div className="hero__actions">
          <Link className="hero__cta" to="/teacher">
            {ar ? "ابدأ كمعلم" : "Start teaching"}
          </Link>
          <Link className="hero__secondary" to="/join">
            {ar ? "دخول طالب" : "Student join"}
          </Link>
        </div>
        <ul
          className="hero__proof"
          aria-label={ar ? "فوائد سريعة" : "Quick benefits"}
        >
          <li>✓ {ar ? "بدون تسجيل للطالب" : "No student signup"}</li>
          <li>✓ {ar ? "لحظي" : "Real-time"}</li>
          <li>✓ {ar ? "يحمي المشاركة الهادئة" : "Quiet participation"}</li>
        </ul>
      </div>
      <aside
        className="hero__visual"
        aria-label={
          ar ? "معاينة لوحة نبض الصف" : "Class Pulse dashboard preview"
        }
      >
        <div className="demo-card">
          <header className="demo-card__head">
            <div>
              <small>{ar ? "رياضيات · الصف العاشر" : "Math · Grade 10"}</small>
              <strong>{ar ? "النبض الآن" : "Pulse now"}</strong>
            </div>
            <span className="live">
              <i />
              {ar ? "مباشر" : "LIVE"}
            </span>
          </header>
          <div className="demo-card__score">
            <div className="score-ring">
              <strong>76%</strong>
              <span>{ar ? "فاهمين" : "following"}</span>
            </div>
            <div className="score-copy">
              <strong>
                {ar ? "معظم الصف معك" : "Most of the class is with you"}
              </strong>
              <p>
                {ar
                  ? "لكن 6 طلاب بدأوا يفقدوا الفكرة عند الخطوة الأخيرة."
                  : "But 6 students started losing the thread at the last step."}
              </p>
            </div>
          </div>
          <div className="pulse-bars">
            <span className="pulse-bars__green" style={{ width: "76%" }} />
            <span className="pulse-bars__yellow" style={{ width: "16%" }} />
            <span className="pulse-bars__red" style={{ width: "8%" }} />
          </div>
          <ul className="legend">
            <li>
              <i className="green" /> {ar ? "فاهم" : "Got it"} <b>19</b>
            </li>
            <li>
              <i className="yellow" /> {ar ? "مش متأكد" : "Unsure"} <b>4</b>
            </li>
            <li>
              <i className="red" /> {ar ? "ضايع" : "Lost"} <b>2</b>
            </li>
          </ul>
          <div className="insight">
            <span aria-hidden="true">✦</span>
            <p>
              <strong>{ar ? "ملاحظة ذكية" : "Smart insight"}</strong>
              {ar
                ? "الارتباك بدأ بعد الانتقال من المثال إلى التطبيق. جرّب مثالًا ثانيًا قبل المتابعة."
                : "Confusion rose after moving from example to application. Try one more example before continuing."}
            </p>
          </div>
        </div>
      </aside>
    </section>
  );
}
