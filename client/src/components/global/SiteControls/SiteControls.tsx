import { usePreferences } from "../../../context/PreferencesContext";
import "./SiteControls.css";

export default function SiteControls() {
  const { language, theme, toggleLanguage, toggleTheme } = usePreferences();

  return (
    <aside
      className="site-controls"
      aria-label={language === "ar" ? "إعدادات الموقع" : "Site settings"}
    >
      <button
        type="button"
        className="site-control"
        onClick={toggleLanguage}
        aria-label={
          language === "ar" ? "Switch to English" : "التبديل إلى العربية"
        }
      >
        <span aria-hidden="true">文</span>
        <strong>{language === "ar" ? "EN" : "ع"}</strong>
      </button>
      <button
        type="button"
        className="site-control site-control--icon"
        onClick={toggleTheme}
        aria-label={theme === "light" ? "Dark mode" : "Light mode"}
      >
        <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
      </button>
    </aside>
  );
}
