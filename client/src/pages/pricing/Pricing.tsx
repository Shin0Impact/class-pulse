import { useState } from "react";
import { Link } from "react-router-dom";
import { usePreferences } from "../../context/PreferencesContext";
import "./Pricing.css";

const plans = [
  {
    key: "free",
    price: 0,
    students: "20",
    sessions: "10",
    duration: "45 min",
    history: "5",
    popular: false,
  },
  {
    key: "pro",
    price: 9.99,
    students: "60",
    sessions: "100",
    duration: "4 h",
    history: "Full",
    popular: true,
  },
  {
    key: "school",
    price: 19.99,
    students: "∞",
    sessions: "∞",
    duration: "∞",
    history: "Full",
    popular: false,
  },
];

export default function Pricing() {
  const { language } = usePreferences();
  const ar = language === "ar";
  const [yearly, setYearly] = useState(true);

  return (
    <main className="pricing-page">
      <header>
        <Link to="/">← {ar ? "الرئيسية" : "Home"}</Link>

        <span>
          {ar ? "خطط بسيطة، قيمة كاملة" : "SIMPLE PLANS · FULL VALUE"}
        </span>

        <h1>
          {ar
            ? "جرّب القيمة أولًا. ادفع عندما تحتاج مساحة أكبر."
            : "Experience the value first. Upgrade when you need more room."}
        </h1>

        <p>
          {ar
            ? "كل الخطط تحافظ على جوهر نبض الصف. الفرق في السعة، التاريخ، التحليلات والتعاون."
            : "Every plan keeps the core Class Pulse experience. You upgrade for capacity, history, analytics and collaboration."}
        </p>

        <div className="billing-toggle">
          <button
            className={!yearly ? "active" : ""}
            onClick={() => setYearly(false)}
          >
            {ar ? "شهري" : "Monthly"}
          </button>

          <button
            className={yearly ? "active" : ""}
            onClick={() => setYearly(true)}
          >
            {ar ? "سنوي" : "Yearly"} <em>-10%</em>
          </button>
        </div>
      </header>

      <section className="plan-grid">
        {plans.map((p) => {
          const price = yearly ? p.price * 0.9 : p.price;

          return (
            <article
              className={`plan ${p.popular ? "plan--popular" : ""}`}
              key={p.key}
            >
              {p.popular && (
                <b className="popular">
                  {ar ? "الأكثر اختيارًا" : "MOST POPULAR"}
                </b>
              )}

              <h2>
                {p.key === "free" ? "Free" : p.key === "pro" ? "Pro" : "School"}
              </h2>

              <p className="plan-for">
                {p.key === "free"
                  ? ar
                    ? "للتجربة الحقيقية"
                    : "Try the full learning loop"
                  : p.key === "pro"
                    ? ar
                      ? "للمعلم الذي يستخدمه أسبوعيًا"
                      : "For active teachers"
                    : ar
                      ? "للفرق والمدارس"
                      : "For teams & schools"}
              </p>

              <div className="price">
                <strong>${price.toFixed(price ? 2 : 0)}</strong>

                <span>{p.price ? `/${ar ? "شهر" : "mo"}` : ""}</span>
              </div>

              {yearly && p.price > 0 && (
                <small>
                  {ar ? "يُدفع سنويًا · خصم 10%" : "Billed yearly · save 10%"}
                </small>
              )}

              <Link
                to={
                  p.key === "free"
                    ? "/signup"
                    : `/checkout?plan=${p.key}&billing=${yearly ? "yearly" : "monthly"}`
                }
                className="plan-cta"
              >
                {p.key === "free"
                  ? ar
                    ? "ابدأ مجانًا"
                    : "Start free"
                  : ar
                    ? "اختر الخطة"
                    : "Choose plan"}
              </Link>

              <ul>
                <li>
                  ✓ {p.sessions} {ar ? "حصة / شهر" : "sessions / month"}
                </li>

                <li>
                  ✓ {p.students} {ar ? "طالب / حصة" : "students / class"}
                </li>

                <li>
                  ✓ {p.duration} {ar ? "مدة الحصة" : "session duration"}
                </li>

                <li>✓ {ar ? "رفع PDF + أسئلة AI" : "PDF + AI questions"}</li>

                <li>
                  ✓{" "}
                  {ar
                    ? "Blindspot + Confidence + Recheck"
                    : "Blindspot + Confidence + Recheck"}
                </li>

                <li>✓ {ar ? "تقييم الحصة والـFeedback" : "Class feedback"}</li>

                <li>
                  ✓{" "}
                  {p.history === "Full"
                    ? ar
                      ? "سجل كامل للطالب"
                      : "Full student history"
                    : ar
                      ? `آخر ${p.history} حصص`
                      : `Last ${p.history} sessions`}
                </li>

                {p.key !== "free" && (
                  <li>
                    ✓{" "}
                    {ar
                      ? "تتبع التقدم والتنبيهات الذكية"
                      : "Progress + smart alerts"}
                  </li>
                )}

                {p.key === "school" && (
                  <>
                    <li>
                      ✓{" "}
                      {ar
                        ? "مساحة مدرسة وصلاحيات"
                        : "School workspace & permissions"}
                    </li>

                    <li>
                      ✓{" "}
                      {ar ? "ملاحظات مشتركة للمعلمين" : "Shared teacher notes"}
                    </li>
                  </>
                )}
              </ul>
            </article>
          );
        })}
      </section>

      <p className="pricing-note">
        {ar
          ? "حساب الطالب مجاني دائمًا ولا يحتاج اشتراكًا."
          : "Student accounts are always free and never require a subscription."}
      </p>
    </main>
  );
}
