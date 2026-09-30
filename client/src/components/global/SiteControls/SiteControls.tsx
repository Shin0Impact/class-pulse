import { Link } from "react-router-dom";
import { usePreferences } from "../../../context/PreferencesContext";
import { useAuth } from "../../../auth/AuthContext.tsx";
import "./SiteControls.css";

export default function SiteControls() {
  const { language, theme, toggleLanguage, toggleTheme, t } = usePreferences();
  const { accountsEnabled, profile } = useAuth();

  return (
    <div
      className="site-controls"
      role="group"
      aria-label={language === "ar" ? "إعدادات الموقع" : "Site settings"}
    >
      {profile ? (
        <Link
          to="/me"
          className="site-control site-control--account"
          aria-label={t("myAccount")}
          title={profile.displayName}
        >
          <span className="site-control__avatar" aria-hidden="true">
            {profile.displayName.trim().charAt(0).toUpperCase() || "?"}
          </span>
        </Link>
      ) : (
        accountsEnabled && (
          <>
            <Link to="/login" className="site-control site-control--account">
              <strong>{t("signIn")}</strong>
            </Link>
            <Link to="/signup" className="site-control site-control--signup">
              <strong>{t("createAccount")}</strong>
            </Link>
          </>
        )
      )}
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
    </div>
  );
}
