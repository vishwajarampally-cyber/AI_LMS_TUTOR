import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { BookOpen, FileText, Calendar, Plus, Trash2, CheckSquare, Square, AlertCircle, CheckCircle } from "lucide-react";

function parseBold(text) {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    // Check list structure
    const isListItem = trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ");
    
    if (isListItem) {
      const content = trimmed.replace(/^[-*•]\s+/, "");
      elements.push(
        <li key={idx} className="md-li" dangerouslySetInnerHTML={{ __html: parseBold(content) }} />
      );
    } else {
      if (trimmed.startsWith("# ")) {
        elements.push(<h2 key={idx} className="md-h1">{trimmed.replace("# ", "")}</h2>);
      } else if (trimmed.startsWith("## ")) {
        elements.push(<h3 key={idx} className="md-h2">{trimmed.replace("## ", "")}</h3>);
      } else if (trimmed.startsWith("### ")) {
        elements.push(<h4 key={idx} className="md-h3">{trimmed.replace("### ", "")}</h4>);
      } else if (trimmed === "") {
        elements.push(<div key={idx} className="md-spacing" style={{ height: "8px" }} />);
      } else {
        elements.push(
          <p key={idx} className="md-p" dangerouslySetInnerHTML={{ __html: parseBold(line) }} />
        );
      }
    }
  });

  return <div className="md-container">{elements}</div>;
}

export default function StudyMaterials() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [topic, setTopic] = useState("all");
  const [activeTab, setActiveTab] = useState("notes"); // "notes" | "qa" | "planner"
  const [guides, setGuides] = useState([]);
  const [guidesLoading, setGuidesLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [uploadedMaterials, setUploadedMaterials] = useState([]);
  
  // Study Planner states
  const [studyPlan, setStudyPlan] = useState(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerGenerating, setPlannerGenerating] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState({});

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedCourse = courses.find((c) => c._id === courseId);
  const topics = ["all", ...(selectedCourse?.topics || [])];

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (courseId) {
      loadGuides();
      loadLatestStudyPlan();
      loadUploadedMaterials();
    } else {
      setGuides([]);
      setStudyPlan(null);
      setSelectedGuide(null);
      setUploadedMaterials([]);
    }
  }, [courseId]);

  async function loadUploadedMaterials() {
    try {
      const data = await api(`/materials/course/${courseId}`);
      setUploadedMaterials(data.materials || []);
    } catch (err) {
      console.warn("Failed to load uploaded course materials:", err);
    }
  }

  async function loadCourses() {
    try {
      const data = await api("/courses");
      setCourses(data.courses);
      if (data.courses.length > 0) {
        setCourseId(data.courses[0]._id);
      }
    } catch (err) {
      setError("Failed to load subjects.");
    }
  }

  async function loadGuides() {
    setGuidesLoading(true);
    setError("");
    try {
      const data = await api(`/study-materials/course/${courseId}`);
      setGuides(data.guides);
      if (data.guides.length > 0) {
        // Automatically select the first guide matching the active tab type
        const match = data.guides.find((g) => g.type === activeTab);
        setSelectedGuide(match || null);
      } else {
        setSelectedGuide(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuidesLoading(false);
    }
  }

  // Update selected guide when activeTab changes
  useEffect(() => {
    if (guides.length > 0) {
      const match = guides.find((g) => g.type === activeTab);
      setSelectedGuide(match || null);
    } else {
      setSelectedGuide(null);
    }
  }, [activeTab]);

  async function generateGuide(type) {
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const data = await api("/study-materials/generate", {
        method: "POST",
        body: JSON.stringify({ courseId, topic, type })
      });
      setGuides([data.guide, ...guides]);
      setSelectedGuide(data.guide);
      setMessage(`AI generated your ${type === "notes" ? "study notes" : "practice guide"}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteGuide(id, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this study guide?")) return;
    try {
      await api(`/study-materials/${id}`, { method: "DELETE" });
      const updated = guides.filter((g) => g._id !== id);
      setGuides(updated);
      if (selectedGuide?._id === id) {
        const match = updated.find((g) => g.type === activeTab);
        setSelectedGuide(match || null);
      }
      setMessage("Study guide deleted.");
    } catch (err) {
      setError(err.message);
    }
  }

  // Planner Functions
  async function loadLatestStudyPlan() {
    setPlannerLoading(true);
    try {
      const data = await api("/study-plans/latest");
      if (data.studyPlan && data.studyPlan.course === courseId) {
        setStudyPlan(data.studyPlan);
      } else {
        setStudyPlan(null);
      }
    } catch (err) {
      console.warn("No active study plan found.");
    } finally {
      setPlannerLoading(false);
    }
  }

  async function generateStudyPlan() {
    setPlannerGenerating(true);
    setError("");
    setMessage("");
    try {
      const data = await api("/study-plans", {
        method: "POST",
        body: JSON.stringify({ courseId })
      });
      setStudyPlan(data.studyPlan);
      setMessage("AI generated your personalized exam preparation plan!");
    } catch (err) {
      setError(err.message);
    } finally {
      setPlannerGenerating(false);
    }
  }

  function toggleTask(section, taskText) {
    const key = `${courseId}-${section}-${taskText}`;
    setCheckedTasks((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function isTaskCompleted(section, taskText) {
    return !!checkedTasks[`${courseId}-${section}-${taskText}`];
  }

  return (
    <section className="tool-page study-materials-page">
      <div className="materials-header panel wide">
        <div className="inline-actions">
          <label className="field-label">
            Subject (Course)
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select subject</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title} ({course.code})
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Topic Unit
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "Entire Syllabus" : t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="materials-subtabs" style={{ marginTop: "20px" }}>
          <button className={activeTab === "notes" ? "tab-button active" : "tab-button"} onClick={() => { setActiveTab("notes"); setError(""); setMessage(""); }}>
            <FileText size={16} /> AI Study Notes
          </button>
          <button className={activeTab === "qa" ? "tab-button active" : "tab-button"} onClick={() => { setActiveTab("qa"); setError(""); setMessage(""); }}>
            <BookOpen size={16} /> AI Practice Q&A
          </button>
          <button className={activeTab === "planner" ? "tab-button active" : "tab-button"} onClick={() => { setActiveTab("planner"); setError(""); setMessage(""); }}>
            <Calendar size={16} /> Personalized Exam Planner
          </button>
        </div>
      </div>

      {(error || message) && (
        <div className="panel wide">
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
        </div>
      )}

      {/* TABS CONTENT */}
      {courseId ? (
        activeTab === "planner" ? (
          <div className="planner-tab-container panel wide">
            <div className="planner-header">
              <h2>Exam Preparation Plan</h2>
              <p className="hint">
                Plan your milestones! The planner evaluates your quiz history to detect weak and strong units.
              </p>
              <button className="primary-button" onClick={generateStudyPlan} disabled={plannerGenerating}>
                {plannerGenerating ? "Analyzing & Generating..." : "Generate AI Exam Planner"}
              </button>
            </div>

            {plannerLoading && <p className="hint">Loading plan data...</p>}

            {!plannerLoading && studyPlan && (
              <div className="study-plan-dashboard" style={{ marginTop: "24px" }}>
                {/* Strength and Weakness indicators */}
                <div className="strengths-weaknesses">
                  <div className="indicator-box weak">
                    <span className="box-title"><AlertCircle size={16} /> Areas to Focus On (Weak Topics)</span>
                    {studyPlan.weakTopics?.length > 0 ? (
                      <ul>
                        {studyPlan.weakTopics.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="hint-text">No weak areas identified. Attempt quizzes to update.</p>
                    )}
                  </div>
                  <div className="indicator-box strong">
                    <span className="box-title"><CheckCircle size={16} /> Confident Areas (Strong Topics)</span>
                    {studyPlan.strongTopics?.length > 0 ? (
                      <ul>
                        {studyPlan.strongTopics.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="hint-text">Solve quizzes with score &gt; 80% to list strong topics.</p>
                    )}
                  </div>
                </div>

                {/* Checklist Lists */}
                <div className="checklists-container">
                  <div className="checklist-card">
                    <h3>Daily Study Checklist</h3>
                    {studyPlan.dailyPlan?.length > 0 ? (
                      studyPlan.dailyPlan.map((task, idx) => (
                        <div key={idx} className={`task-checkbox-row ${isTaskCompleted("daily", task) ? "completed" : ""}`} onClick={() => toggleTask("daily", task)}>
                          {isTaskCompleted("daily", task) ? <CheckSquare className="checkbox-icon checked" size={18} /> : <Square className="checkbox-icon" size={18} />}
                          <span>{task}</span>
                        </div>
                      ))
                    ) : (
                      <p className="hint-text">No checklist created.</p>
                    )}
                  </div>

                  <div className="checklist-card">
                    <h3>Weekly Milestones</h3>
                    {studyPlan.weeklyPlan?.length > 0 ? (
                      studyPlan.weeklyPlan.map((task, idx) => (
                        <div key={idx} className={`task-checkbox-row ${isTaskCompleted("weekly", task) ? "completed" : ""}`} onClick={() => toggleTask("weekly", task)}>
                          {isTaskCompleted("weekly", task) ? <CheckSquare className="checkbox-icon checked" size={18} /> : <Square className="checkbox-icon" size={18} />}
                          <span>{task}</span>
                        </div>
                      ))
                    ) : (
                      <p className="hint-text">No checklist created.</p>
                    )}
                  </div>

                  <div className="checklist-card">
                    <h3>Final Exam Prep Schedule</h3>
                    {studyPlan.examPreparationPlan?.length > 0 ? (
                      studyPlan.examPreparationPlan.map((task, idx) => (
                        <div key={idx} className={`task-checkbox-row ${isTaskCompleted("examprep", task) ? "completed" : ""}`} onClick={() => toggleTask("examprep", task)}>
                          {isTaskCompleted("examprep", task) ? <CheckSquare className="checkbox-icon checked" size={18} /> : <Square className="checkbox-icon" size={18} />}
                          <span>{task}</span>
                        </div>
                      ))
                    ) : (
                      <p className="hint-text">No checklist created.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!plannerLoading && !studyPlan && (
              <div className="empty-state">
                <Calendar size={48} className="empty-icon" />
                <p>No exam plan has been generated yet for this course.</p>
                <p className="hint-text">Click the button above to generate a custom preparation schedule!</p>
              </div>
            )}
          </div>
        ) : (
          /* NOTES & QA TAB LAYOUT */
          <div className="quiz-layout">
            {/* Sidebar list of generated guides */}
            <aside className="panel quiz-bank-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2>Generated History</h2>
                <button className="primary-button compact-button" onClick={() => generateGuide(activeTab)} disabled={generating}>
                  {generating ? "Generating..." : <><Plus size={14} /> Generate New</>}
                </button>
              </div>

              {guidesLoading && <p className="hint">Loading guides list...</p>}

              {!guidesLoading && (
                <div className="guides-list">
                  {guides.filter((g) => g.type === activeTab).map((guide) => (
                    <div key={guide._id} className={`guide-sidebar-row ${selectedGuide?._id === guide._id ? "selected" : ""}`} onClick={() => setSelectedGuide(guide)}>
                      <div className="guide-meta-info">
                        <strong>{guide.topic === "all" ? "Full Syllabus" : guide.topic}</strong>
                        <span>{new Date(guide.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button className="icon-button danger-button" style={{ width: "32px", minHeight: "32px" }} onClick={(e) => deleteGuide(guide._id, e)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {guides.filter((g) => g.type === activeTab).length === 0 && (
                    <p className="hint-text">No generated guides for this subject yet. Click Generate New above.</p>
                  )}
                </div>
              )}

              {activeTab === "notes" && (
                <div className="course-uploads-section" style={{ marginTop: "24px" }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: "12px", borderBottom: "1px solid #cbd5e1", paddingBottom: "6px" }}>
                    Course Uploads (PDFs)
                  </h3>
                  <div className="guides-list">
                    {uploadedMaterials.map((material) => {
                      const downloadUrl = `${import.meta.env.VITE_API_BASE_URL.replace("/api", "")}/${material.storagePath.replace(/\\/g, "/")}`;
                      return (
                        <a
                          key={material._id}
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="guide-sidebar-row"
                          style={{ textDecoration: "none", color: "inherit", display: "flex", gap: "8px" }}
                        >
                          <div className="guide-meta-info" style={{ flexGrow: 1 }}>
                            <strong>{material.title}</strong>
                            <span>{material.originalName} ({material.fileType?.toUpperCase()})</span>
                          </div>
                          <span className={`status-pill compact ${material.status}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                            {material.status}
                          </span>
                        </a>
                      );
                    })}
                    {uploadedMaterials.length === 0 && (
                      <p className="hint-text">No PDFs uploaded by faculty for this subject.</p>
                    )}
                  </div>
                </div>
              )}
            </aside>

            {/* Reading Viewport */}
            <div className="panel quiz-main">
              {selectedGuide && selectedGuide.type === activeTab ? (
                <article className="study-guide-article">
                  <header className="guide-article-header">
                    <h2>{selectedGuide.topic === "all" ? "Syllabus Overview" : selectedGuide.topic}</h2>
                    <span className="type-tag">{selectedGuide.type === "notes" ? "AI STUDY GUIDE" : "AI EXAM SOLVED PRACTICE"}</span>
                    <span className="time-tag">Created: {new Date(selectedGuide.createdAt).toLocaleString()}</span>
                  </header>
                  <div className="guide-article-body">
                    {renderMarkdown(selectedGuide.content)}
                  </div>
                </article>
              ) : (
                <div className="empty-viewport">
                  <FileText size={56} className="empty-icon" />
                  <h3>No Study Guide Selected</h3>
                  <p className="hint-text">Select an item from the generated history sidebar or click "Generate New" to create one.</p>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="panel wide center-content">
          <BookOpen size={48} />
          <h3>No Subjects Found</h3>
          <p className="hint-text">Please enroll or verify that active courses are registered in the system.</p>
        </div>
      )}
    </section>
  );
}
