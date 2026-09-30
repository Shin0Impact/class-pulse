import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePreferences } from "../../context/PreferencesContext";
import "./Checkout.css";

type PlanKey = "pro" | "school";
type Billing = "monthly" | "yearly";

const PLAN_PRICES: Record<PlanKey, number> = {
  pro: 9.99,
  school: 19.99,
};

export default function Checkout() {
  const { language } = usePreferences();
  const ar = language === "ar";

  const [searchParams] = useSearchParams();

  const requestedPlan = searchParams.get("plan");
  const requestedBilling = searchParams.get("billing");

  const plan: PlanKey = requestedPlan === "school" ? "school" : "pro";

  const billing: Billing =
    requestedBilling === "monthly" ? "monthly" : "yearly";

  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
  const [completed, setCompleted] = useState(false);

  const pricing = useMemo(() => {
    const monthlyBase = PLAN_PRICES[plan];
    const monthlyPrice = billing === "yearly" ? monthlyBase * 0.9 : monthlyBase;

    const total = billing === "yearly" ? monthlyPrice * 12 : monthlyPrice;

    return {
      monthlyPrice,
      total,
    };
  }, [plan, billing]);

  const planName = plan === "pro" ? "Pro" : "School";

  function handleDemoPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompleted(true);
  }

  if (completed) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <div className="checkout-success__icon">✓</div>

          <span className="checkout-kicker">
            {ar ? "عرض تجريبي" : "DEMO CHECKOUT"}
          </span>

          <h1>{ar ? "كل شيء جاهز!" : "You're all set!"}</h1>

          <p>
            {ar
              ? `تمت محاكاة تفعيل خطة ${planName} بنجاح.`
              : `Your ${planName} plan activation was successfully simulated.`}
          </p>

          <div className="checkout-success__plan">
            <strong>{planName}</strong>
            <span>
              ${pricing.monthlyPrice.toFixed(2)} / {ar ? "شهر" : "month"}
            </span>
          </div>

          <p className="checkout-demo-note">
            {ar
              ? "هذه عملية دفع تجريبية للعرض فقط، ولا يتم خصم أي مبلغ."
              : "This is a demo checkout for presentation purposes. No payment is processed."}
          </p>

          <Link className="checkout-primary-link" to="/teacher">
            {ar ? "الانتقال إلى لوحة المعلم" : "Continue to teacher dashboard"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-shell">
        <section className="checkout-main">
          <div className="checkout-topbar">
            <Link to="/pricing">
              {ar ? "→ العودة إلى الخطط" : "← Back to pricing"}
            </Link>

            <span className="checkout-demo-badge">
              {ar ? "وضع تجريبي" : "DEMO MODE"}
            </span>
          </div>

          <div className="checkout-heading">
            <span className="checkout-kicker">
              {ar ? "إتمام الاشتراك" : "SECURE CHECKOUT"}
            </span>

            <h1>
              {ar ? "فعّل خطتك وابدأ." : "Activate your plan and get started."}
            </h1>

            <p>
              {ar
                ? "واجهة دفع تجريبية جاهزة لعرض تجربة الاشتراك الكاملة."
                : "A demo payment experience showing the complete subscription flow."}
            </p>
          </div>

          <form className="checkout-form" onSubmit={handleDemoPayment}>
            <div className="checkout-section">
              <div className="checkout-section__heading">
                <span>1</span>
                <div>
                  <strong>{ar ? "معلومات الحساب" : "Account details"}</strong>
                  <small>
                    {ar
                      ? "سيتم ربط الاشتراك بحساب المعلم."
                      : "Your subscription will be linked to your teacher account."}
                  </small>
                </div>
              </div>

              <div className="checkout-fields checkout-fields--two">
                <label>
                  <span>{ar ? "الاسم الكامل" : "Full name"}</span>
                  <input
                    type="text"
                    placeholder={ar ? "اسمك" : "your name"}
                    required
                  />
                </label>

                <label>
                  <span>{ar ? "البريد الإلكتروني" : "Email address"}</span>
                  <input
                    type="email"
                    placeholder="teacher@classpulse.app"
                    required
                  />
                </label>
              </div>
            </div>

            <div className="checkout-section">
              <div className="checkout-section__heading">
                <span>2</span>
                <div>
                  <strong>{ar ? "طريقة الدفع" : "Payment method"}</strong>
                  <small>
                    {ar
                      ? "اختر طريقة الدفع المناسبة."
                      : "Choose how you'd like to pay."}
                  </small>
                </div>
              </div>

              <div className="payment-methods">
                <button
                  type="button"
                  className={paymentMethod === "card" ? "active" : ""}
                  onClick={() => setPaymentMethod("card")}
                >
                  <span>💳</span>
                  {ar ? "بطاقة" : "Card"}
                </button>

                <button
                  type="button"
                  className={paymentMethod === "paypal" ? "active" : ""}
                  onClick={() => setPaymentMethod("paypal")}
                >
                  <span>Pay</span>
                  PayPal
                </button>
              </div>

              {paymentMethod === "card" ? (
                <div className="checkout-fields">
                  <label>
                    <span>{ar ? "رقم البطاقة" : "Card number"}</span>
                    <div className="card-input">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="4242 4242 4242 4242"
                        required
                      />
                      <span>VISA</span>
                    </div>
                  </label>

                  <div className="checkout-fields checkout-fields--two">
                    <label>
                      <span>{ar ? "تاريخ الانتهاء" : "Expiry date"}</span>
                      <input type="text" placeholder="MM / YY" required />
                    </label>

                    <label>
                      <span>CVC</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="123"
                        required
                      />
                    </label>
                  </div>

                  <label>
                    <span>{ar ? "الاسم على البطاقة" : "Name on card"}</span>
                    <input
                      type="text"
                      placeholder={
                        ar
                          ? "ادخل اسم صاحب البطاقة"
                          : "Enter the cardholder’s name"
                      }
                      required
                    />
                  </label>
                </div>
              ) : (
                <div className="paypal-demo">
                  <strong>PayPal</strong>
                  <p>
                    {ar
                      ? "في النسخة الفعلية سيتم تحويل المستخدم إلى PayPal لإتمام الدفع."
                      : "In production, the user would be redirected to PayPal to complete payment."}
                  </p>
                </div>
              )}
            </div>

            <div className="checkout-security">
              <span>🔒</span>
              <p>
                <strong>
                  {ar ? "عرض آمن بدون دفع حقيقي" : "Safe demo — no real charge"}
                </strong>
                <small>
                  {ar
                    ? "لا يتم إرسال أو معالجة بيانات الدفع في هذا العرض."
                    : "Payment information is not sent or processed in this demo."}
                </small>
              </p>
            </div>

            <button className="checkout-pay-button" type="submit">
              {ar ? `تجربة تفعيل خطة ${planName}` : `Demo activate ${planName}`}
              <span>→</span>
            </button>
          </form>
        </section>

        <aside className="checkout-summary">
          <span className="checkout-kicker">
            {ar ? "ملخص الطلب" : "ORDER SUMMARY"}
          </span>

          <div className="checkout-plan-name">
            <div>
              <span>CP</span>
            </div>

            <section>
              <strong>Class Pulse {planName}</strong>
              <small>
                {billing === "yearly"
                  ? ar
                    ? "اشتراك سنوي"
                    : "Yearly subscription"
                  : ar
                    ? "اشتراك شهري"
                    : "Monthly subscription"}
              </small>
            </section>
          </div>

          <div className="checkout-summary-row">
            <span>{ar ? "الخطة" : "Plan"}</span>
            <strong>{planName}</strong>
          </div>

          <div className="checkout-summary-row">
            <span>{ar ? "الدفع" : "Billing"}</span>
            <strong>
              {billing === "yearly"
                ? ar
                  ? "سنوي"
                  : "Yearly"
                : ar
                  ? "شهري"
                  : "Monthly"}
            </strong>
          </div>

          {billing === "yearly" && (
            <div className="checkout-summary-row checkout-summary-row--saving">
              <span>{ar ? "خصم سنوي" : "Yearly saving"}</span>
              <strong>10%</strong>
            </div>
          )}

          <hr />

          <div className="checkout-total">
            <span>
              {billing === "yearly"
                ? ar
                  ? "الإجمالي السنوي"
                  : "Yearly total"
                : ar
                  ? "الإجمالي اليوم"
                  : "Total today"}
            </span>

            <strong>${pricing.total.toFixed(2)}</strong>
          </div>

          {billing === "yearly" && (
            <small className="checkout-monthly-equivalent">
              ${pricing.monthlyPrice.toFixed(2)} / {ar ? "شهر" : "month"}
            </small>
          )}

          <div className="checkout-includes">
            <strong>{ar ? "تشمل خطتك" : "Your plan includes"}</strong>

            <ul>
              <li>
                ✓{" "}
                {ar ? "أسئلة مدعومة بالذكاء الاصطناعي" : "AI-powered questions"}
              </li>
              <li>✓ Blindspot + Confidence</li>
              <li>✓ {ar ? "تقييمات الحصة" : "Class feedback"}</li>
              <li>✓ {ar ? "سجل تقدم الطلاب" : "Student progress history"}</li>
            </ul>
          </div>

          <p className="checkout-demo-note">
            {ar
              ? "للعرض التجريبي فقط — لا تتم معالجة أي دفعة."
              : "Demo only — no payment will be processed."}
          </p>
        </aside>
      </div>
    </main>
  );
}
