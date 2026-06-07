import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Briefcase, Award, CheckCircle2, XCircle, ChevronRight, HelpCircle, ArrowLeft, Plus } from "lucide-react";

export default function MockInterview() {
  const [activeInterview, setActiveInterview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Setup form states
  const [role, setRole] = useState("Software Engineer");
  const [type, setType] = useState("technical");
  const [currentAnswer, setCurrentAnswer] = useState("");
  
  // View states
  const [activeTab, setActiveTab] = useState("setup"); // "setup" | "interview" | "review" | "history"

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoading(true);
    try {
      const data = await api("/interviews/history");
      setHistory(data.interviews || []);
    } catch (err) {
      console.warn("Failed to load interview history:", err);
    } finally {
      setLoading(false);
    }
  }

  async function startInterview() {
    if (!role.trim()) {
      setError("Please specify a target role");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await api("/interviews/start", {
        method: "POST",
        body: JSON.stringify({ role: role.trim(), type })
      });
      setActiveInterview(data.interview);
      setCurrentAnswer("");
      setActiveTab("interview");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!currentAnswer.trim()) {
      setError("Please write an answer before submitting");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const data = await api(`/interviews/${activeInterview._id}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer: currentAnswer.trim() })
      });
      
      setActiveInterview(data.interview);
      setCurrentAnswer("");
      
      if (data.interview.status === "completed") {
        setActiveTab("review");
        loadHistory();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function viewInterviewDetail(id) {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/interviews/${id}`);
      setActiveInterview(data.interview);
      setActiveTab("review");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const currentQuestion = activeInterview?.questions[activeInterview?.currentQuestionIndex];
  const totalQuestions = activeInterview?.questions?.length || 0;
  const progressPercent = activeInterview ? Math.round(((activeInterview.currentQuestionIndex) / totalQuestions) * 100) : 0;

  return (
    <section className="tool-page mock-interview-page">
      <div className="panel wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Briefcase size={22} color="#1264d8" /> AI Mock Interview Center
          </h2>
          <div className="materials-subtabs" style={{ border: 0, margin: 0, padding: 0 }}>
            <button 
              className={activeTab === "setup" || activeTab === "interview" ? "tab-button active" : "tab-button"} 
              onClick={() => {
                if (activeInterview && activeInterview.status === "in_progress") {
                  setActiveTab("interview");
                } else {
                  setActiveInterview(null);
                  setActiveTab("setup");
                }
              }}
            >
              Start Practice
            </button>
            <button className={activeTab === "history" ? "tab-button active" : "tab-button"} onClick={() => { setActiveTab("history"); loadHistory(); }}>
              Practice History
            </button>
          </div>
        </div>

        {error && <p className="error panel" style={{ background: "#fef2f2", border: "1px solid #fee2e2" }}>⚠️ {error}</p>}

        {/* ─── TAB 1: SETUP SCREEN ─── */}
        {activeTab === "setup" && (
          <div className="interview-setup-wizard" style={{ maxWidth: "600px", margin: "20px auto", padding: "10px" }}>
            <h3 style={{ fontSize: "1.3rem", color: "#0f172a", marginBottom: "6px" }}>Configure Mock Session</h3>
            <p className="hint" style={{ marginBottom: "24px" }}>
              Practice technical coding problems or behavioral HR situations. The AI evaluates your logic, formatting, and answers.
            </p>
            
            <div style={{ display: "grid", gap: "16px" }}>
              <label className="field-label">
                Target Job Role
                <input 
                  type="text" 
                  placeholder="e.g. Software Engineer, Data Scientist, UX Designer..."
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                />
              </label>

              <label className="field-label">
                Interview Focus Type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="technical">Technical Interview (Syllabus concepts, coding, design)</option>
                  <option value="hr">HR / Behavioral Interview (STAR method, teamwork, situational)</option>
                </select>
              </label>

              <button className="primary-button" onClick={startInterview} disabled={loading} style={{ marginTop: "12px", width: "100%" }}>
                {loading ? "Generating custom questions..." : "Generate Interview & Start"}
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ACTIVE INTERVIEW WIZARD ─── */}
        {activeTab === "interview" && activeInterview && currentQuestion && (
          <div className="interview-question-wizard" style={{ maxWidth: "800px", margin: "10px auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="eyebrow" style={{ color: "#1264d8" }}>
                Role: {activeInterview.role} ({activeInterview.type.toUpperCase()})
              </span>
              <span className="hint-text">
                Question {activeInterview.currentQuestionIndex + 1} of {totalQuestions}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="interview-progress-container" style={{ height: "6px", width: "100%", background: "#e2e8f0", borderRadius: "3px", marginBottom: "24px" }}>
              <div 
                className="interview-progress-bar" 
                style={{ height: "100%", width: `${progressPercent}%`, background: "#1264d8", borderRadius: "3px", transition: "width 0.3s ease" }}
              />
            </div>

            <div className="interview-question-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", marginBottom: "20px" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", color: "#1e293b", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <HelpCircle size={20} color="#1264d8" style={{ flexShrink: 0, marginTop: "2px" }} />
                {currentQuestion.question}
              </h3>
            </div>

            <label className="field-label">
              Your Answer
              <textarea 
                rows={8} 
                placeholder="Type your detailed response here. (For HR questions, prefer using the STAR method: Situation, Task, Action, Result)..."
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                disabled={submitting}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="primary-button" onClick={submitAnswer} disabled={submitting}>
                {submitting ? "Analyzing answer..." : activeInterview.currentQuestionIndex + 1 === totalQuestions ? "Submit & Evaluate Interview" : "Submit & Next Question"}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB 3: EVALUATION REPORT ─── */}
        {activeTab === "review" && activeInterview && (
          <div className="interview-evaluation-report" style={{ marginTop: "10px" }}>
            <div className="review-summary-card" style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", padding: "24px", borderRadius: "12px", textAlign: "center", marginBottom: "24px" }}>
              <Award size={48} color="#1d4ed8" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ margin: "0 0 6px 0", fontSize: "1.4rem", color: "#1e3a8a" }}>Practice Session Complete!</h3>
              <p style={{ margin: 0, color: "#1e40af" }}>Role: <strong>{activeInterview.role}</strong> ({activeInterview.type.toUpperCase()})</p>
              
              <div className="interview-overall-score" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
                <div style={{ fontSize: "3rem", fontWeight: 900, color: "#1d4ed8", lineHeight: 1 }}>{activeInterview.overallScore}%</div>
                <span className="eyebrow" style={{ marginTop: "4px", fontSize: "0.8rem", color: "#475569" }}>ATS Competency Rating</span>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="strengths-weaknesses" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div className="indicator-box strong" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: "10px" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#166534", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={18} /> Highlighted Strengths
                </h4>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#14532d" }}>
                  {activeInterview.strengths?.map((str, index) => (
                    <li key={index} style={{ marginBottom: "6px" }}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="indicator-box weak" style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "16px", borderRadius: "10px" }}>
                <h4 style={{ margin: "0 0 12px 0", color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <XCircle size={18} /> Identified Weaknesses
                </h4>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#7f1d1d" }}>
                  {activeInterview.weaknesses?.map((wk, index) => (
                    <li key={index} style={{ marginBottom: "6px" }}>{wk}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actionable Improvement areas */}
            {activeInterview.improvementAreas && (
              <div className="panel" style={{ background: "#faf5ff", border: "1px solid #f3e8ff", borderRadius: "10px", padding: "20px", marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.15rem", color: "#581c87" }}>💡 Recommended Action Plan</h3>
                <p style={{ color: "#3b0764", lineHeight: "1.6", margin: 0 }}>{activeInterview.improvementAreas}</p>
              </div>
            )}

            {/* Turn by turn review */}
            <div className="review-questions" style={{ marginTop: "24px" }}>
              <h3 style={{ borderBottom: "2px solid #cbd5e1", paddingBottom: "8px", marginBottom: "16px" }}>Detailed Responses Review</h3>
              
              <div style={{ display: "grid", gap: "16px" }}>
                {activeInterview.questions?.map((q, idx) => (
                  <div key={q._id || idx} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", background: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "12px", borderBottom: "1px dashed #cbd5e1", paddingBottom: "8px" }}>
                      <strong>Question {idx + 1}: {q.question}</strong>
                      <span className="status-pill" style={{ background: q.score >= 80 ? "#dff7e8" : q.score >= 50 ? "#fff4d6" : "#ffe8e5", color: q.score >= 80 ? "#137333" : q.score >= 50 ? "#8a5a00" : "#b42318", fontWeight: 700 }}>
                        Score: {q.score}/100
                      </span>
                    </div>

                    <div style={{ display: "grid", gap: "12px", fontSize: "0.95rem" }}>
                      <div>
                        <span className="eyebrow" style={{ display: "block", fontSize: "0.75rem", marginBottom: "4px", color: "#64748b" }}>Your Answer:</span>
                        <p style={{ margin: 0, padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", color: "#334155", fontStyle: q.userAnswer ? "normal" : "italic" }}>
                          {q.userAnswer || "(No response typed)"}
                        </p>
                      </div>

                      <div>
                        <span className="eyebrow" style={{ display: "block", fontSize: "0.75rem", marginBottom: "4px", color: "#64748b" }}>AI Expert Feedback:</span>
                        <p style={{ margin: 0, color: "#475569", lineHeight: "1.5" }}>{q.feedback}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="primary-button" style={{ marginTop: "24px" }} onClick={() => { setActiveInterview(null); setActiveTab("setup"); }}>
              <Plus size={16} /> Start Another Session
            </button>
          </div>
        )}

        {/* ─── TAB 4: PRACTICE HISTORY ─── */}
        {activeTab === "history" && (
          <div className="practice-history-container" style={{ marginTop: "10px" }}>
            {loading && <p className="hint">Retrieving past interviews...</p>}

            {!loading && history.length === 0 && (
              <div className="empty-state" style={{ padding: "40px" }}>
                <Award size={48} className="empty-icon" />
                <p>No interview practice history found.</p>
                <p className="hint-text">Go to "Start Practice" to run your first session!</p>
              </div>
            )}

            {!loading && history.length > 0 && (
              <div className="material-list">
                {history.map((h) => (
                  <div key={h._id} className="material-row" style={{ border: "1px solid #dce3ee", background: "white", padding: "16px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <strong style={{ fontSize: "1.05rem" }}>{h.role}</strong>
                      <span className="hint-text" style={{ fontSize: "0.8rem" }}>
                        Type: <strong style={{ textTransform: "capitalize" }}>{h.type}</strong> · Started: {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span className="status-pill indexed" style={{ fontSize: "0.95rem", fontWeight: "bold" }}>
                        Score: {h.overallScore}%
                      </span>
                      <button className="primary-button compact-button" onClick={() => viewInterviewDetail(h._id)} style={{ margin: 0, minHeight: "36px" }}>
                        View Report <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
