import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.tsx';
import CreateSession from './pages/teacher/CreateSession.tsx';
import Dashboard from './pages/teacher/Dashboard.tsx';
import Join from './pages/student/Join.tsx';
import Play from './pages/student/Play.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/teacher" element={<CreateSession />} />
      <Route path="/teacher/:code" element={<Dashboard />} />
      <Route path="/join" element={<Join />} />
      <Route path="/play/:code" element={<Play />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
