import { Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function Courses() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [materials, setMaterials] = useState([]);
  const [courseForm, setCourseForm] = useState({ title: "", code: "", description: "", topics: "" });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canManage = user?.role === "faculty" || user?.role === "admin";

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) loadMaterials(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedCourseId || !materials.some((material) => material.status === "processing")) return;
    const timer = setInterval(() => loadMaterials(selectedCourseId), 3000);
    return () => clearInterval(timer);
  }, [selectedCourseId, materials]);

  async function loadCourses() {
    const data = await api("/courses");
    setCourses(data.courses);
    setSelectedCourseId((current) => current || data.courses[0]?._id || "");
  }

  async function loadMaterials(courseId) {
    const data = await api(`/materials/course/${courseId}`);
    setMaterials(data.materials);
  }

  async function createCourse(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const topics = courseForm.topics.split(",").map((topic) => topic.trim()).filter(Boolean);
      const data = await api("/courses", {
        method: "POST",
        body: JSON.stringify({ ...courseForm, topics })
      });
      setCourses([data.course, ...courses]);
      setSelectedCourseId(data.course._id);
      setCourseForm({ title: "", code: "", description: "", topics: "" });
      setMessage("Course created successfully.");
    } catch (err) {
      setError(err.message);
    }
  }

  function onFilesChosen(event) {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  }

  async function uploadMaterials(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedCourseId || !selectedFiles.length) {
      setError("Select a course and at least one file.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("courseId", selectedCourseId);
      selectedFiles.forEach((file) => formData.append("files", file));

      const data = await api("/materials/upload", { method: "POST", body: formData });
      setMaterials([...data.materials, ...materials]);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage(data.message || `${data.materials.length} file(s) uploaded. Indexing in background.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteMaterial(materialId) {
    if (!window.confirm("Delete this document and remove it from search?")) return;
    setError("");
    setDeletingId(materialId);
    try {
      await api(`/materials/${materialId}`, { method: "DELETE" });
      setMaterials((current) => current.filter((material) => material._id !== materialId));
      setMessage("Document deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId("");
    }
  }

  async function deleteCourse(courseId) {
    if (!window.confirm("Are you sure you want to delete this course? This will permanently delete all uploaded documents and vectors for this course!")) return;
    setError("");
    setMessage("");
    try {
      await api(`/courses/${courseId}`, { method: "DELETE" });
      setCourses((current) => current.filter((c) => c._id !== courseId));
      if (selectedCourseId === courseId) {
        setSelectedCourseId("");
        setMaterials([]);
      }
      setMessage("Course deleted successfully.");
    } catch (err) {
      setError(err.message);
    }
  }


  if (!canManage) {
    return <section className="panel wide"><h2>Courses</h2><p>Course management is available to faculty and admins.</p></section>;
  }

  const fileLabel =
    selectedFiles.length === 0
      ? "Choose one or more PDF, DOCX, PPT, or PPTX files"
      : `${selectedFiles.length} file(s): ${selectedFiles.map((f) => f.name).join(", ")}`;

  return (
    <section className="page-grid">
      <form className="panel" onSubmit={createCourse}>
        <h2>Create Course</h2>
        <input placeholder="Course title" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
        <input placeholder="Course code" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} />
        <textarea placeholder="Description" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
        <input placeholder="Topics separated by commas" value={courseForm.topics} onChange={(e) => setCourseForm({ ...courseForm, topics: e.target.value })} />
        <button className="primary-button">Create Course</button>
      </form>

      <form className="panel" onSubmit={uploadMaterials}>
        <h2>Upload Material</h2>
        <p className="hint">Select multiple files at once. Upload returns immediately; indexing runs in the background.</p>
        <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
          <option value="">Select course</option>
          {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
        </select>
        <label className="file-drop">
          <Upload size={20} />
          <span>{fileLabel}</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.ppt,.pptx"
            onChange={onFilesChosen}
          />
        </label>
        <button className="primary-button" disabled={uploading || !selectedFiles.length}>
          {uploading ? "Uploading…" : `Upload ${selectedFiles.length || ""} file(s)`.trim()}
        </button>
      </form>

      {(message || error) && <div className="panel wide">{message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}</div>}

      <div className="panel wide">
        <h2>Courses</h2>
        <div className="course-list">
          {courses.map((course) => (
            <div
              className={`course-row ${course._id === selectedCourseId ? "selected" : ""}`}
              key={course._id}
              onClick={() => setSelectedCourseId(course._id)}
            >
              <div className="course-info-clickable">
                <strong>{course.title}</strong>
                <span>{course.code}</span>
              </div>
              <button
                type="button"
                className="icon-button danger-button compact-delete-btn"
                title="Delete Course"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCourse(course._id);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!courses.length && <p>No courses yet. Create your first course above.</p>}
        </div>
      </div>

      <div className="panel wide">
        <h2>Uploaded Materials</h2>
        {selectedCourseId && <button className="secondary-button compact-button" type="button" onClick={() => loadMaterials(selectedCourseId)}>Refresh Status</button>}
        <div className="material-list">
          {materials.map((material) => (
            <article key={material._id} className="material-row">
              <div>
                <strong>{material.title}</strong>
                <span>{material.originalName}</span>
                {material.chunkCount > 0 && <span>{material.chunkCount} indexed sections</span>}
                {material.error && <span className="error">{material.error}</span>}
              </div>
              <div className="material-actions">
                <span className={`status-pill ${material.status}`}>{material.status}</span>
                <button
                  type="button"
                  className="icon-button danger-button"
                  title="Delete document"
                  disabled={deletingId === material._id}
                  onClick={() => deleteMaterial(material._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
          {!materials.length && <p>No materials uploaded for this course yet.</p>}
        </div>
      </div>
    </section>
  );
}
