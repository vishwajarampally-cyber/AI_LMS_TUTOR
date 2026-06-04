import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import FacultyDashboard from "./pages/FacultyDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Tutor from "./pages/Tutor.jsx";
import Courses from "./pages/Courses.jsx";
import QuizCenter from "./pages/QuizCenter.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import StudyMaterials from "./pages/StudyMaterials.jsx";
import { useAuth } from "./state/AuthContext.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute><Shell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<RoleDashboard />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/tutor" element={<Tutor />} />
        <Route path="/quiz" element={<QuizCenter />} />
        <Route path="/study-materials" element={<StudyMaterials />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function RoleDashboard() {
  const { user } = useAuth();
  const role = user?.role;
  if (role === "faculty") return <FacultyDashboard />;
  if (role === "admin") return <AdminDashboard />;
  return <StudentDashboard />;
}
