import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing.tsx";
import Pricing from "./pages/pricing/Pricing.tsx";
import CreateSession from "./pages/teacher/CreateSession.tsx";
import Dashboard from "./pages/teacher/Dashboard.tsx";
import Join from "./pages/student/Join.tsx";
import Play from "./pages/student/Play.tsx";
import DemoIndex from "./pages/DemoIndex.tsx";
import Checkout from "./pages/checkout/Checkout.tsx";
import BlindspotDemo from "./pages/BlindspotDemo.tsx";
import AppBar from "./components/global/AppBar/AppBar.tsx";
import { PreferencesProvider } from "./context/PreferencesContext.tsx";
import { AuthProvider } from "./auth/AuthContext.tsx";
import AuthPage from "./pages/auth/AuthPage.tsx";
import Account from "./pages/account/Account.tsx";
import ClassSummary from "./pages/account/ClassSummary.tsx";
import AIAssistant from "./components/global/AIAssistant/AIAssistant.tsx";

// The Present page carries the PDF renderer: only load it when a teacher opens it.
const Present = lazy(() => import("./pages/teacher/present/Present.tsx"));
const Screen = lazy(() => import("./pages/teacher/present/Screen.tsx"));

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <AppBar />
        <AIAssistant />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/teacher" element={<CreateSession />} />
          <Route path="/teacher/:code" element={<Dashboard />} />
          <Route
            path="/teacher/:code/present"
            element={
              <Suspense fallback={null}>
                <Present />
              </Suspense>
            }
          />
          <Route
            path="/teacher/:code/screen"
            element={
              <Suspense fallback={null}>
                <Screen />
              </Suspense>
            }
          />
          <Route path="/join" element={<Join />} />
          <Route path="/play/:code" element={<Play />} />
          <Route path="/demo" element={<DemoIndex />} />
          <Route path="/demo/blindspot" element={<BlindspotDemo />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/me" element={<Account />} />
          <Route path="/me/classes/:id" element={<ClassSummary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </PreferencesProvider>
  );
}
