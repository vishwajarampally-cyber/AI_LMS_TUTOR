import { useEffect, useState } from "react";
import { Activity, FileText, MessageSquare, User } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

const TABS = [
  { id: "profile",  label: "Profile",    icon: User },
  { id: "feedback", label: "Feedback",   icon: MessageSquare },
  { id: "audit",    label: "Audit Logs", icon: Activity, roles: ["admin", "faculty"] },
];

/* ── Audit action badge colours ───────────────────────────── */
const ACTION_COLORS = {
  UPLOAD_MATERIAL:    { bg: "#dbeafe", color: "#1d4ed8" },
  DELETE_MATERIAL:    { bg: "#fee2e2", color: "#b91c1c" },
  CREATE_COURSE:      { bg: "#dcfce7", color: "#166534" },
  GENERATE_QUIZ:      { bg: "#fef9c3", color: "#854d0e" },
  SUBMIT_QUIZ_ATTEMPT:{ bg: "#f3e8ff", color: "#6b21a8" },
};
function actionStyle(action) {
  return ACTION_COLORS[action] || { bg: "#f1f5f9", color: "#475569" };
}

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab]         = useState("profile");
  const [feedback, setFeedback] = useState({ targetType: "chat", score: 5, comment: "" });
  const [saved, setSaved]     = useState(false);
  const [logs, setLogs]       = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError]     = useState("");

  const visibleTabs = TABS.filter((t) => !t.roles || t.roles.includes(user?.role));

  useEffect(() => {
    if (tab === "audit" && (user?.role === "admin" || user?.role === "faculty") && !logs.length) {
      setLogsLoading(true);
      api("/audit-logs")
        .then((data) => setLogs(data.logs || []))
        .catch((err) => setLogsError(err.message))
        .finally(() => setLogsLoading(false));
    }
  }, [tab, user]);


  async function submitFeedback(event) {
    event.preventDefault();
    await api("/feedback", { method: "POST", body: JSON.stringify(feedback) });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section className="settings-page">
      {/* Sidebar tabs */}
      <nav className="settings-nav">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`settings-tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="settings-content">

        {/* ── PROFILE ── */}
        {tab === "profile" && (
          <div className="panel">
            <h2>👤 Profile</h2>
            <div className="profile-card">
              <div className="profile-avatar">{user?.name?.[0]?.toUpperCase() || "?"}</div>
              <div className="profile-info">
                <p className="profile-name">{user?.name}</p>
                <p className="profile-email">{user?.email}</p>
                <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {tab === "feedback" && (
          <form className="panel" onSubmit={submitFeedback}>
            <h2>💬 Submit Feedback</h2>
            <p className="hint">Rate any part of the platform and leave a comment to help us improve.</p>

            <label className="field-label">Feature</label>
            <select
              value={feedback.targetType}
              onChange={(e) => setFeedback({ ...feedback, targetType: e.target.value })}
            >
              <option value="chat">AI Tutor</option>
              <option value="quiz">Quiz</option>
              <option value="evaluation">Evaluation</option>
              <option value="study_plan">Study Plan</option>
            </select>

            <label className="field-label">Rating (1–5)</label>
            <div className="star-row">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`star-btn ${feedback.score >= n ? "filled" : ""}`}
                  onClick={() => setFeedback({ ...feedback, score: n })}
                >★</button>
              ))}
            </div>

            <label className="field-label">Comment</label>
            <textarea
              placeholder="What went well? What could be better?"
              value={feedback.comment}
              rows={4}
              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
            />

            <button className="primary-button" type="submit">Submit Feedback</button>
            {saved && <p className="success">✅ Feedback saved — thank you!</p>}
          </form>
        )}

        {/* ── AUDIT LOGS (admin only) ── */}
        {tab === "audit" && (
          <div className="panel">
            <h2>🔍 Audit Logs</h2>
            <p className="hint">Last 100 system events across all users.</p>

            {logsLoading && <p className="hint">Loading logs…</p>}
            {logsError  && <p className="error">{logsError}</p>}

            {!logsLoading && !logsError && (
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Role</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 && (
                      <tr><td colSpan={4} className="audit-empty">No audit events recorded yet.</td></tr>
                    )}
                    {logs.map((log) => {
                      const { bg, color } = actionStyle(log.action);
                      return (
                        <tr key={log._id}>
                          <td>
                            <span className="audit-badge" style={{ background: bg, color }}>
                              {log.action?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td>{log.actor?.name || "—"}<br /><small>{log.actor?.email}</small></td>
                          <td><span className={`role-badge role-${log.actor?.role}`}>{log.actor?.role}</span></td>
                          <td className="audit-time">{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
