import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Upload, FileText, Download, CheckCircle, AlertCircle, Copy, History, Sparkles } from "lucide-react";

export default function ResumeTailor() {
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form values
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [targetDescription, setTargetDescription] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  
  // UI Tabs
  const [activeTab, setActiveTab] = useState("upload"); // "upload" | "report" | "history"
  const [reportSubTab, setReportSubTab] = useState("keywords"); // "keywords" | "sections" | "resume"
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await api("/resumes/history");
      setHistory(data.history || []);
    } catch (err) {
      console.warn("Failed to load resume analysis history:", err);
    }
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
      setError("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!targetRole.trim()) {
      setError("Please specify the target job role.");
      return;
    }
    if (!targetDescription.trim()) {
      setError("Please input the target job description.");
      return;
    }
    if (!resumeFile) {
      setError("Please upload a resume file (PDF or DOCX).");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("targetRole", targetRole.trim());
    formData.append("targetDescription", targetDescription.trim());

    try {
      const data = await api("/resumes/analyze", {
        method: "POST",
        body: formData
      });
      setActiveAnalysis(data.analysis);
      setSuccess("ATS Resume analysis completed successfully!");
      setActiveTab("report");
      setReportSubTab("keywords");
      loadHistory();
    } catch (err) {
      setError(err.message || "Failed to analyze resume. Make sure it is a readable PDF or DOCX.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalysisDetail(id) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await api(`/resumes/${id}`);
      setActiveAnalysis(data.analysis);
      setActiveTab("report");
      setReportSubTab("keywords");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function triggerDownload() {
    if (!activeAnalysis) return;
    const downloadUrl = `${import.meta.env.VITE_API_BASE_URL || "/api"}/resumes/${activeAnalysis._id}/download`;
    // open in new tab or trigger native browser file save
    window.open(downloadUrl, "_blank");
  }

  function handleCopyText() {
    if (!activeAnalysis) return;
    navigator.clipboard.writeText(activeAnalysis.improvedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="tool-page resume-tailor-page">
      <div className="panel wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={22} color="#7b3ff2" /> AI Resume Optimizer
          </h2>
          <div className="materials-subtabs" style={{ border: 0, margin: 0, padding: 0 }}>
            <button 
              className={activeTab === "upload" ? "tab-button active" : "tab-button"} 
              onClick={() => {
                if (activeAnalysis && activeTab !== "upload") {
                  setActiveTab("report");
                } else {
                  setActiveTab("upload");
                }
              }}
            >
              Analyze Resume
            </button>
            <button className={activeTab === "history" ? "tab-button active" : "tab-button"} onClick={() => { setActiveTab("history"); loadHistory(); }}>
              Optimization History
            </button>
          </div>
        </div>

        {error && <p className="error panel" style={{ background: "#fef2f2", border: "1px solid #fee2e2" }}>⚠️ {error}</p>}
        {success && <p className="success panel" style={{ background: "#f0fdf4", border: "1px solid #dcfce7" }}>✓ {success}</p>}

        {/* ─── TAB 1: UPLOAD & SETUP FORM ─── */}
        {activeTab === "upload" && (
          <form onSubmit={handleSubmit} className="resume-upload-form" style={{ maxWidth: "800px", margin: "10px auto" }}>
            <p className="hint" style={{ marginBottom: "24px" }}>
              Upload your existing resume. Enter the job role and description you want to apply for. Our AI will grade it, find missing ATS keywords, and rewrite sections.
            </p>

            <div style={{ display: "grid", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }} className="responsive-split">
                <label className="field-label">
                  Target Job Role
                  <input 
                    type="text" 
                    placeholder="e.g. Frontend Engineer, Product Manager..." 
                    value={targetRole} 
                    onChange={(e) => setTargetRole(e.target.value)} 
                    disabled={loading}
                  />
                </label>

                <div className="file-upload-section">
                  <label className="field-label">
                    Upload Current Resume (PDF/DOCX)
                    <div className="file-drop" style={{ background: "#f8fafc", transition: "all 0.2s ease" }}>
                      <input 
                        type="file" 
                        accept=".pdf,.docx" 
                        onChange={handleFileChange} 
                        id="resume-file-input"
                        disabled={loading}
                      />
                      <label htmlFor="resume-file-input" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", padding: "12px" }}>
                        <Upload size={24} color="#7b3ff2" style={{ marginBottom: "4px" }} />
                        {resumeFile ? (
                          <span style={{ fontSize: "0.9rem", color: "#1e293b", fontWeight: "bold" }}>
                            📎 {resumeFile.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.85rem" }}>
                            Drag & drop or <span style={{ color: "#7b3ff2", textDecoration: "underline", fontWeight: "bold" }}>browse files</span>
                          </span>
                        )}
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>Searchable PDF, DOCX (Max 20MB)</span>
                      </label>
                    </div>
                  </label>
                </div>
              </div>

              <label className="field-label">
                Target Job Description / Key Requirements
                <textarea 
                  rows={8} 
                  placeholder="Paste the target job description or core skill requirements here..." 
                  value={targetDescription} 
                  onChange={(e) => setTargetDescription(e.target.value)} 
                  disabled={loading}
                />
              </label>

              <button className="primary-button" type="submit" disabled={loading} style={{ background: "#7b3ff2", width: "100%", height: "48px" }}>
                {loading ? "Parsing & Analyzing Resume (may take 20-30s)..." : "Compare Resume with Job & Improve"}
              </button>
            </div>
          </form>
        )}

        {/* ─── TAB 2: DETAILED ANALYSIS REPORT ─── */}
        {activeTab === "report" && activeAnalysis && (
          <div className="resume-report-viewport" style={{ marginTop: "10px" }}>
            
            {/* Summary card with ATS gauge */}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "24px", background: "#fdfbff", border: "1px solid #f3e8ff", padding: "20px", borderRadius: "12px", marginBottom: "24px", alignItems: "center" }} className="responsive-split">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "conic-gradient(#7b3ff2 0% " + activeAnalysis.atsScore + "%, #e2e8f0 " + activeAnalysis.atsScore + "% 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 900, color: "#7b3ff2" }}>{activeAnalysis.atsScore}</span>
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: "bold" }}>ATS MATCH</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="eyebrow" style={{ color: "#7b3ff2" }}>ATS Tailoring Analysis Report</span>
                <h3 style={{ margin: "4px 0 8px 0", fontSize: "1.35rem" }}>Target Role: {activeAnalysis.targetRole}</h3>
                <p className="hint-text" style={{ margin: 0 }}>
                  Analyzed File: <strong>{activeAnalysis.fileName}</strong> · Evaluation Date: {new Date(activeAnalysis.createdAt).toLocaleDateString()}
                </p>
                <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
                  <button className="primary-button" onClick={triggerDownload} style={{ background: "#7b3ff2", minHeight: "36px", padding: "0 14px", fontSize: "0.85rem" }}>
                    <Download size={14} /> Download Tailored Resume
                  </button>
                </div>
              </div>
            </div>

            {/* Report subtabs */}
            <div className="materials-subtabs" style={{ marginBottom: "16px" }}>
              <button className={reportSubTab === "keywords" ? "tab-button active" : "tab-button"} onClick={() => setReportSubTab("keywords")}>
                <AlertCircle size={14} /> Missing Keywords & Skills
              </button>
              <button className={reportSubTab === "sections" ? "tab-button active" : "tab-button"} onClick={() => setReportSubTab("sections")}>
                <FileText size={14} /> Section Analysis
              </button>
              <button className={reportSubTab === "resume" ? "tab-button active" : "tab-button"} onClick={() => setReportSubTab("resume")}>
                <Sparkles size={14} /> Improved Resume Preview
              </button>
            </div>

            {/* Subtab content 1: Keywords */}
            {reportSubTab === "keywords" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="responsive-split">
                <div className="panel" style={{ background: "#faf5ff", border: "1px solid #f3e8ff", borderRadius: "8px" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#581c87" }}>🔍 Missing Job Keywords</h4>
                  <p className="hint-text" style={{ marginBottom: "14px" }}>Add these terms in your work experience bullet points to pass automated filters.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {activeAnalysis.analysis?.missingKeywords?.map((kw, idx) => (
                      <span key={idx} className="status-pill" style={{ background: "#f3e8ff", color: "#581c87", fontWeight: "bold" }}>
                        + {kw}
                      </span>
                    ))}
                    {activeAnalysis.analysis?.missingKeywords?.length === 0 && <p className="hint-text">No missing keywords identified!</p>}
                  </div>
                </div>

                <div className="panel" style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: "8px" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#166534" }}>🛠️ Missing Skills</h4>
                  <p className="hint-text" style={{ marginBottom: "14px" }}>Add these technical or soft skills inside your skills grid section.</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {activeAnalysis.analysis?.missingSkills?.map((sk, idx) => (
                      <span key={idx} className="status-pill" style={{ background: "#dcfce7", color: "#166534", fontWeight: "bold" }}>
                        + {sk}
                      </span>
                    ))}
                    {activeAnalysis.analysis?.missingSkills?.length === 0 && <p className="hint-text">All key skills matched successfully!</p>}
                  </div>
                </div>

                <div className="panel wide" style={{ background: "white", border: "1px solid #cbd5e1" }}>
                  <h4 style={{ margin: "0 0 12px 0" }}>💡 Overall Tailoring Suggestions</h4>
                  <ul style={{ paddingLeft: "20px", margin: 0, lineHeight: "1.6" }}>
                    {activeAnalysis.analysis?.suggestions?.map((sug, idx) => (
                      <li key={idx} style={{ marginBottom: "6px", color: "#475569" }}>{sug}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Subtab content 2: Sections */}
            {reportSubTab === "sections" && (
              <div style={{ display: "grid", gap: "16px" }}>
                {Object.entries(activeAnalysis.analysis?.sectionFeedback || {}).map(([sectionName, feedback]) => (
                  <div key={sectionName} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", background: "white" }}>
                    <h4 style={{ textTransform: "capitalize", margin: "0 0 8px 0", fontSize: "1.05rem", color: "#1e293b", borderBottom: "1px solid #f1f5f9", paddingBottom: "4px" }}>
                      {sectionName} Section Evaluation
                    </h4>
                    <p style={{ margin: 0, color: "#475569", lineHeight: "1.5" }}>{String(feedback)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Subtab content 3: Improved Resume */}
            {reportSubTab === "resume" && (
              <div className="panel wide" style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={14} color="#7b3ff2" /> Generated ATS Resume Code (Markdown)
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="secondary-button compact-button" onClick={handleCopyText} style={{ margin: 0, minHeight: "32px", padding: "0 10px", fontSize: "0.8rem" }}>
                      <Copy size={12} /> {copied ? "Copied!" : "Copy Code"}
                    </button>
                    <button className="primary-button compact-button" onClick={triggerDownload} style={{ background: "#7b3ff2", margin: 0, minHeight: "32px", padding: "0 10px", fontSize: "0.8rem" }}>
                      <Download size={12} /> Download .md
                    </button>
                  </div>
                </div>
                
                <textarea 
                  rows={20} 
                  readOnly 
                  value={activeAnalysis.improvedResume} 
                  style={{ fontFamily: '"Fira Code", monospace', fontSize: "0.88rem", background: "white", padding: "16px", cursor: "text" }}
                />
              </div>
            )}

          </div>
        )}

        {/* ─── TAB 3: OPTIMIZATION HISTORY ─── */}
        {activeTab === "history" && (
          <div className="resume-history-container" style={{ marginTop: "10px" }}>
            {history.length === 0 && (
              <div className="empty-state" style={{ padding: "40px" }}>
                <History size={48} className="empty-icon" />
                <p>No optimization history found.</p>
                <p className="hint-text">Go to "Analyze Resume" to test ATS scores and improve your profile!</p>
              </div>
            )}

            {history.length > 0 && (
              <div className="material-list">
                {history.map((record) => (
                  <div key={record._id} className="material-row" style={{ border: "1px solid #dce3ee", background: "white", padding: "16px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <strong style={{ fontSize: "1.05rem" }}>Role: {record.targetRole}</strong>
                      <span className="hint-text" style={{ fontSize: "0.8rem" }}>
                        File: {record.fileName} · Date: {new Date(record.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span className="status-pill indexed" style={{ background: "#f3e8ff", color: "#581c87", fontWeight: "bold", fontSize: "0.95rem" }}>
                        ATS match: {record.atsScore}%
                      </span>
                      <button className="primary-button compact-button" onClick={() => loadAnalysisDetail(record._id)} style={{ margin: 0, minHeight: "36px" }}>
                        View Details
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
