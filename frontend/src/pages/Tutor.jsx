import { Bot, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

/* ─── Markdown → JSX renderer ─────────────────────────────────── */

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyInline(raw) {
  // code spans  `code`
  let html = raw.replace(/`([^`]+)`/g, "<code class=\"md-code\">$1</code>");
  // bold + italic  ***text***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // bold  **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // italic  *text*
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return html;
}

function MarkdownBlock({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // ── Fenced code block ```lang
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim() || "code";
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="md-pre">
          <span className="md-lang-badge">{lang}</span>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      i++; // skip closing ```
      continue;
    }

    // ── Horizontal rule --- or ***
    if (/^[-*]{3,}$/.test(trimmed)) {
      elements.push(<hr key={i} className="md-hr" />);
      i++;
      continue;
    }

    // ── Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="md-h3"
          dangerouslySetInnerHTML={{ __html: applyInline(escapeHtml(trimmed.slice(4))) }} />
      );
      i++; continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="md-h2"
          dangerouslySetInnerHTML={{ __html: applyInline(escapeHtml(trimmed.slice(3))) }} />
      );
      i++; continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="md-h1"
          dangerouslySetInnerHTML={{ __html: applyInline(escapeHtml(trimmed.slice(2))) }} />
      );
      i++; continue;
    }

    // ── Unordered list  -  *  •
    if (/^[-*•]\s/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*•]\s+/, "");
        listItems.push(
          <li key={i}
            className="md-li"
            dangerouslySetInnerHTML={{ __html: applyInline(escapeHtml(itemText)) }} />
        );
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="md-ul">{listItems}</ul>);
      continue;
    }

    // ── Ordered list  1.  2.
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        listItems.push(
          <li key={i}
            className="md-li"
            dangerouslySetInnerHTML={{ __html: applyInline(escapeHtml(itemText)) }} />
        );
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="md-ol">{listItems}</ol>);
      continue;
    }

    // ── Blockquote  >
    if (trimmed.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <blockquote key={`bq-${i}`} className="md-blockquote">
          {quoteLines.map((ql, qi) => (
            <p key={qi} dangerouslySetInnerHTML={{ __html: applyInline(escapeHtml(ql)) }} />
          ))}
        </blockquote>
      );
      continue;
    }

    // ── Empty line
    if (trimmed === "") {
      elements.push(<div key={`sp-${i}`} className="md-gap" />);
      i++;
      continue;
    }

    // ── Paragraph
    elements.push(
      <p key={i} className="md-p"
        dangerouslySetInnerHTML={{ __html: applyInline(escapeHtml(raw)) }} />
    );
    i++;
  }

  return <div className="md-body">{elements}</div>;
}

/* ─── Main Tutor Component ─────────────────────────────────────── */

export default function Tutor() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    api("/courses")
      .then((data) => {
        setCourses(data.courses);
        setCourseId(data.courses[0]?._id || "");
        if (!data.courses.length)
          setError("No courses available yet. Ask faculty/admin to create a course and upload material.");
      })
      .catch((err) => setError(err.message));
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(event) {
    event.preventDefault();
    setError("");
    const cleanQuestion = question.trim();
    if (!courseId) { setError("Select a course before asking a question."); return; }
    if (!cleanQuestion) { setError("Type a question before sending."); return; }

    setMessages((prev) => [...prev, { role: "student", text: cleanQuestion }]);
    setQuestion("");
    setLoading(true);

    try {
      const data = await api("/tutor/ask", {
        method: "POST",
        body: JSON.stringify({ courseId, question: cleanQuestion })
      });
      const sourceTitles = [
        ...new Set((data.chat.citations || []).map((c) => c.title).filter(Boolean))
      ];
      setMessages((prev) => [...prev, { role: "ai", text: data.chat.answer, sourceTitles }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="tool-page">
      <div className="panel tutor-panel">

        {/* Course selector + header */}
        <div className="tutor-header">
          <div className="tutor-title">
            <Bot size={22} />
            <span>AI Tutor</span>
          </div>
          <select
            className="tutor-course-select"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>{c.title}</option>
            ))}
          </select>
        </div>

        {error && <p className="error" style={{ padding: "0 4px" }}>{error}</p>}

        {/* Chat window */}
        <div className="chat-window">
          {messages.length === 0 && !loading && (
            <div className="tutor-empty">
              <Bot size={40} className="empty-icon" />
              <p><strong>Ask me anything about your course!</strong></p>
              <p className="hint">Select a subject above and type your question below.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <span className="msg-avatar">
                {msg.role === "student" ? <User size={16} /> : <Bot size={16} />}
              </span>
              <div className="msg-content">
                {msg.role === "ai"
                  ? <MarkdownBlock text={msg.text} />
                  : <p className="md-p">{msg.text}</p>}

                {msg.role === "ai" && msg.sourceTitles?.length > 0 && (
                  <small className="source-hint">
                    📚 Draws from: {msg.sourceTitles.join(" · ")}
                  </small>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message ai">
              <span className="msg-avatar"><Bot size={16} /></span>
              <div className="msg-content">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Composer */}
        <form className="composer" onSubmit={ask}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about a unit, concept, or topic…"
            disabled={loading}
          />
          <button className="icon-button" type="submit" disabled={loading || !question.trim()}>
            <Send size={18} />
          </button>
        </form>

      </div>
    </section>
  );
}
