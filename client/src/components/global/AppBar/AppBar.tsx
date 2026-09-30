import { Link, useLocation } from "react-router-dom";
import { usePreferences } from "../../../context/PreferencesContext";
import SiteControls from "../SiteControls/SiteControls.tsx";
import "./AppBar.css";

// The slim top bar on every page except the landing page (which has its own navbar) and the
// Present / Screen windows (which need the whole screen): logo on one side, account / language /
// theme on the other.
export default function AppBar() {
  const { language } = usePreferences();
  const { pathname } = useLocation();
  if (pathname === "/" || /\/(present|screen)$/.test(pathname) || pathname.startsWith("/play/")) return null;
  const ar = language === "ar";
  return (
    <header className="app-bar">
      <Link className="app-bar__brand" to="/" aria-label={ar ? "نبض الصف - الرئيسية" : "Class Pulse - Home"}>
        <span className="app-bar__mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <strong>{ar ? "نبض الصف" : "Class Pulse"}</strong>
      </Link>
      <SiteControls />
    </header>
  );
}
