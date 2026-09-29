import { Link } from "react-router-dom";
import { usePreferences } from "../../../context/PreferencesContext";
import "./Navbar.css";

export default function Navbar() {
  const { language } = usePreferences();
  const ar = language === "ar";
  return (
    <header className="landing-nav">
      <nav
        className="landing-nav__inner"
        aria-label={ar ? "التنقل الرئيسي" : "Main navigation"}
      >
        <Link
          className="brand"
          to="/"
          aria-label={ar ? "نبض الصف - الرئيسية" : "Class Pulse - Home"}
        >
          <span className="brand__mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="brand__copy">
            <strong>{ar ? "نبض الصف" : "Class Pulse"}</strong>
            <small>{ar ? "CLASS PULSE" : "نبض الصف"}</small>
          </span>
        </Link>
        <ul className="landing-nav__links">
          <li>
            <a href="#how">{ar ? "كيف يعمل؟" : "How it works"}</a>
          </li>

          <li>
            <a href="#features">{ar ? "المميزات" : "Features"}</a>
          </li>

          <li>
            <Link to="/pricing">{ar ? "الخطط" : "Pricing"}</Link>
          </li>

          <li>
            <a href="#pulse">{ar ? "نبض مباشر" : "Live pulse"}</a>
          </li>
        </ul>
        <div className="landing-nav__actions">
          <Link className="button button--ghost" to="/join">
            {ar ? "دخول طالب" : "Student join"}
          </Link>
          <Link className="button button--primary" to="/teacher">
            {ar ? "ابدأ كمعلم" : "Start teaching"}{" "}
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
