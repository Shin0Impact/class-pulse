import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.tsx";
import { usePreferences } from "../../context/PreferencesContext.tsx";
import TeacherHome from "./TeacherHome.tsx";
import StudentProgressPage from "./StudentProgressPage.tsx";
import "./Account.css";

// /me: the signed-in account's home. Teachers get their classes, students their progress.
export default function Account() {
  const { ready, profile } = useAuth();
  const { t } = usePreferences();

  if (!ready) return <main className="account account--center">{t("loading")}</main>;
  if (!profile) return <Navigate to="/login?next=/me" replace />;
  return profile.role === "teacher" ? <TeacherHome /> : <StudentProgressPage />;
}
