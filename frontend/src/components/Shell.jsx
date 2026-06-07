import { BarChart3, BookOpen, Bot, ClipboardList, Home, LogOut, Settings, Library, Briefcase, FileCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function Shell() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">AI LMS Tutor</div>
        <nav>
          <NavLink to="/dashboard"><Home size={18} />Dashboard</NavLink>
          {(user?.role === "faculty" || user?.role === "admin") && <NavLink to="/courses"><BookOpen size={18} />Courses</NavLink>}
          <NavLink to="/tutor"><Bot size={18} />AI Tutor</NavLink>
          <NavLink to="/quiz"><ClipboardList size={18} />Quiz Center</NavLink>
          <NavLink to="/study-materials"><Library size={18} />Study Materials</NavLink>
          <NavLink to="/mock-interview"><Briefcase size={18} />Mock Interview</NavLink>
          <NavLink to="/resume-tailor"><FileCheck size={18} />Resume Tailor</NavLink>
          <NavLink to="/reports"><BarChart3 size={18} />Reports</NavLink>
          <NavLink to="/settings"><Settings size={18} />Settings</NavLink>
        </nav>
        <button className="ghost-button" onClick={logout}><LogOut size={18} /> Logout</button>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{user?.role}</p>
            <h1>Welcome, {user?.name}</h1>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
