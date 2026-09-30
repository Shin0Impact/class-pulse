import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePreferences } from "../../../context/PreferencesContext";
import { useAuth } from "../../../auth/AuthContext.tsx";
import SiteControls from "../../global/SiteControls/SiteControls.tsx";
import "./Navbar.css";

export default function Navbar() {
  const { language } = usePreferences();
  const ar = language === "ar";
  const { profile } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);
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
          <SiteControls hideAccount />
          {profile ? (
            // Signed in: the button goes straight to the account page.
            <Link
              to="/me"
              className="landing-profile__trigger landing-profile__trigger--user"
              aria-label={ar ? "الملف الشخصي" : "Profile"}
              title={profile.displayName}
            >
              <span className="landing-profile__avatar" aria-hidden="true">
                {profile.displayName.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="landing-profile__name">{profile.displayName}</span>
            </Link>
          ) : (
            <div className="landing-profile" ref={profileRef}>
              <button
                type="button"
                className="landing-profile__trigger"
                aria-expanded={profileOpen}
                aria-controls="landing-profile-links"
                aria-label={ar ? "الملف الشخصي" : "Profile"}
                onClick={() => setProfileOpen((open) => !open)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2" strokeLinecap="round" />
                </svg>
                <span>{ar ? "الملف الشخصي" : "Profile"}</span>
              </button>
              {profileOpen && (
                <div className="landing-profile__links" id="landing-profile-links">
                  <Link to="/login" onClick={() => setProfileOpen(false)}>
                    <strong>{ar ? "تسجيل الدخول" : "Log in"}</strong>
                    <small>{ar ? "دخول أو إنشاء حساب" : "Sign in or register"}</small>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
