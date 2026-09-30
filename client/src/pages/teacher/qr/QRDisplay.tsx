import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { usePreferences } from "../../../context/PreferencesContext.tsx";
import "./QRDisplay.css";

export default function QRDisplay() {
  const { code = "" } = useParams();
  const { language } = usePreferences();
  const ar = language === "ar";

  const joinUrl = `${window.location.origin}/join?code=${code}`;

  return (
    <main className="qr-display">
      <Link to={`/teacher/${code}`} className="qr-display__back">
        {ar ? "→ العودة للحصة" : "← Back to class"}
      </Link>

      <section className="qr-display__content">
        <p className="qr-display__eyebrow">
          CLASS PULSE · {ar ? "دخول الطلاب" : "STUDENT JOIN"}
        </p>

        <h1>{ar ? "امسح للدخول إلى الحصة" : "Scan to join the class"}</h1>

        <p className="qr-display__description">
          {ar
            ? "وجّه كاميرا هاتفك نحو رمز QR، وسيتم إدخال كود الحصة تلقائيًا."
            : "Point your phone camera at the QR code. Your class code will be filled in automatically."}
        </p>

        <div className="qr-display__qr">
          <QRCodeSVG
            value={joinUrl}
            size={310}
            level="M"
            marginSize={2}
            title={ar ? `الدخول إلى الحصة ${code}` : `Join class ${code}`}
          />
        </div>

        <p className="qr-display__or">
          {ar ? "أو أدخل كود الحصة" : "OR ENTER CLASS CODE"}
        </p>

        <strong className="qr-display__code">{code}</strong>

        <p className="qr-display__hint">
          {ar
            ? "لا يحتاج الطالب إلى إنشاء حساب"
            : "No student account required"}
        </p>
      </section>
    </main>
  );
}
