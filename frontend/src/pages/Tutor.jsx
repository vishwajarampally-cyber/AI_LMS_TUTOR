import { Bot, Send, User, Star, Trash2, Volume2, VolumeX, MessageSquare, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

/* ─── Markdown → JSX renderer ─────────────────────────────────── */

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyInline(raw) {
  let html = raw;
  // markdown links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');
  // code spans  `code`
  html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
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

function cleanTextForSpeech(mdText) {
  return String(mdText || "")
    .replace(/#{1,6}\s+/g, "") // remove headers
    .replace(/\*\*|__/g, "") // remove bold markdown
    .replace(/\*|_/g, "") // remove italic markdown
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // remove inline and fenced code blocks
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // replace markdown links with title text
    .replace(/-\s+|\*\s+|•\s+/g, "") // remove bullet indicators
    .trim();
}

function groupSessionsByDate(sessions) {
  const groups = { Today: [], Yesterday: [], "Last Week": [], Older: [] };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  sessions.forEach((session) => {
    const sessionDate = new Date(session.updatedAt || session.createdAt);
    if (sessionDate >= today) {
      groups.Today.push(session);
    } else if (sessionDate >= yesterday) {
      groups.Yesterday.push(session);
    } else if (sessionDate >= lastWeek) {
      groups["Last Week"].push(session);
    } else {
      groups.Older.push(session);
    }
  });

  return groups;
}

/* ─── Main Tutor Component ─────────────────────────────────────── */

export default function Tutor() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [question, setQuestion] = useState("");
  
  // Session details
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionLoading, setActiveSessionLoading] = useState(false);
  
  // Search & bookmark parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Audio state
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Load courses list
    api("/courses")
      .then((data) => {
        setCourses(data.courses);
        setCourseId(data.courses[0]?._id || "");
        if (!data.courses.length) {
          setError("No courses available yet. Ask faculty/admin to create a course and upload material.");
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  // Fetch session history sidebar whenever search, favorites, or page changes
  useEffect(() => {
    loadSessions();
  }, [searchQuery, showOnlyFavorites, page]);

  // Scroll active conversation viewport
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, loading]);

  // Stop text-to-speech if route is left
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function loadSessions(selectFirst = false) {
    setSessionsLoading(true);
    try {
      const qParams = new URLSearchParams({
        page,
        limit: 12
      });
      if (searchQuery) qParams.set("search", searchQuery);
      if (showOnlyFavorites) qParams.set("isBookmarked", "true");

      const data = await api(`/tutor/sessions?${qParams}`);
      setSessions(data.sessions || []);
      setTotalPages(data.pages || 1);

      if (selectFirst && data.sessions.length > 0 && !activeSession) {
        loadActiveSession(data.sessions[0]._id);
      }
    } catch (err) {
      console.warn("Failed to load sessions:", err.message);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function loadActiveSession(sessionId) {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageIndex(null);
    }
    setActiveSessionLoading(true);
    setError("");
    try {
      const data = await api(`/tutor/sessions/${sessionId}`);
      setActiveSession(data.session);
      if (data.session.course) {
        setCourseId(data.session.course._id || data.session.course);
      }
    } catch (err) {
      setError(`Failed to retrieve chat: ${err.message}`);
    } finally {
      setActiveSessionLoading(false);
    }
  }

  async function startNewSession() {
    setError("");
    try {
      const data = await api("/tutor/sessions", {
        method: "POST",
        body: JSON.stringify({
          courseId: courseId || undefined,
          title: "New Chat"
        })
      });
      setActiveSession(data.session);
      setPage(1);
      await loadSessions();
    } catch (err) {
      setError(`Failed to open new conversation: ${err.message}`);
    }
  }

  async function deleteSession(sessionId, e) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;
    try {
      await api(`/tutor/sessions/${sessionId}`, { method: "DELETE" });
      if (activeSession?._id === sessionId) {
        setActiveSession(null);
      }
      await loadSessions();
    } catch (err) {
      setError(`Failed to delete session: ${err.message}`);
    }
  }

  async function clearAllHistory() {
    if (!window.confirm("Are you sure you want to delete your entire chat history? This cannot be undone.")) return;
    try {
      await api("/tutor/sessions", { method: "DELETE" });
      setActiveSession(null);
      setSessions([]);
    } catch (err) {
      setError(`Failed to clear history: ${err.message}`);
    }
  }

  async function toggleBookmark(session, e) {
    e.stopPropagation();
    try {
      const data = await api(`/tutor/sessions/${session._id}/bookmark`, { method: "PATCH" });
      
      // Update local sidebar list
      setSessions(prev => prev.map(s => s._id === session._id ? { ...s, isBookmarked: data.session.isBookmarked } : s));
      
      // Update active session details
      if (activeSession?._id === session._id) {
        setActiveSession(prev => ({ ...prev, isBookmarked: data.session.isBookmarked }));
      }
    } catch (err) {
      console.error("Failed to bookmark conversation:", err);
    }
  }

  async function ask(event) {
    event.preventDefault();
    setError("");
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    let currentSessionId = activeSession?._id;
    setLoading(true);

    try {
      // 1. Auto create session if none active
      if (!currentSessionId) {
        const data = await api("/tutor/sessions", {
          method: "POST",
          body: JSON.stringify({
            courseId: courseId || undefined,
            title: cleanQuestion.slice(0, 30) + (cleanQuestion.length > 30 ? "..." : "")
          })
        });
        currentSessionId = data.session._id;
        // optimistically set active
        setActiveSession(data.session);
      }

      // 2. Append temporary student message to active screen
      setActiveSession(prev => {
        const messages = [...(prev?.messages || [])];
        messages.push({
          role: "student",
          text: cleanQuestion,
          language: "English",
          createdAt: new Date()
        });
        return { ...prev, messages };
      });
      setQuestion("");

      // 3. Post question to session ask endpoint
      const response = await api(`/tutor/sessions/${currentSessionId}/ask`, {
        method: "POST",
        body: JSON.stringify({
          question: cleanQuestion,
          language: "English"
        })
      });

      // Update active session with real response data
      setActiveSession(response.session);
      loadSessions(); // refresh history list title/date
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Text to Speech playback controller
  function speakMessage(text, idx) {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingMessageIndex === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMessageIndex(null);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any active speech

    const cleanText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const langCode = "en-US";
    utterance.lang = langCode;

    // Find and set voice based on local OS capabilities
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => v.lang.startsWith(langCode));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => setSpeakingMessageIndex(null);
    utterance.onerror = () => setSpeakingMessageIndex(null);

    setSpeakingMessageIndex(idx);
    window.speechSynthesis.speak(utterance);
  }

  const dateGroups = groupSessionsByDate(sessions);
  const hasHistory = sessions.length > 0;

  return (
    <section className="tool-page">
      <div className="quiz-layout">
        
        {/* LEFT COLUMN: CHAT HISTORY SIDEBAR */}
        <aside className="panel quiz-bank-panel tutor-history-sidebar">
          <div className="sidebar-history-header">
            <h2>Chat History</h2>
            <button className="primary-button compact-button" onClick={startNewSession} style={{ gap: "4px" }}>
              <Plus size={14} /> New Chat
            </button>
          </div>

          {/* Search bar */}
          <div className="sidebar-search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search past chats..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>

          {/* Filters */}
          <div className="sidebar-filter-row">
            <button 
              className={`filter-tab ${!showOnlyFavorites ? 'active' : ''}`}
              onClick={() => { setShowOnlyFavorites(false); setPage(1); }}
            >
              All Chats
            </button>
            <button 
              className={`filter-tab ${showOnlyFavorites ? 'active' : ''}`}
              onClick={() => { setShowOnlyFavorites(true); setPage(1); }}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Star size={12} fill={showOnlyFavorites ? "#d88912" : "none"} /> Bookmarked
            </button>
          </div>

          {/* History sessions list */}
          {sessionsLoading && <p className="hint" style={{ padding: "12px" }}>Loading conversations...</p>}

          {!sessionsLoading && !hasHistory && (
            <div className="empty-history-sidebar">
              <MessageSquare size={32} className="empty-icon" />
              <p className="hint-text">No conversations found.</p>
            </div>
          )}

          {!sessionsLoading && hasHistory && (
            <div className="history-scroll-container">
              {Object.entries(dateGroups).map(([groupName, groupItems]) => {
                if (groupItems.length === 0) return null;
                return (
                  <div key={groupName} className="history-date-group">
                    <h3 className="history-date-header">{groupName}</h3>
                    {groupItems.map((s) => {
                      const isActive = activeSession?._id === s._id;
                      return (
                        <div 
                          key={s._id} 
                          className={`history-item-row ${isActive ? 'active' : ''}`}
                          onClick={() => loadActiveSession(s._id)}
                        >
                          <div className="history-item-info">
                            <span className="history-item-title">{s.title || "New Chat"}</span>
                            {s.course && <span className="history-item-subject">{s.course.code || s.course.title}</span>}
                          </div>
                          
                          <div className="history-item-actions">
                            <button 
                              className="bookmark-btn" 
                              onClick={(e) => toggleBookmark(s, e)}
                              title="Bookmark Chat"
                            >
                              <Star size={14} fill={s.isBookmarked ? "#d88912" : "none"} stroke={s.isBookmarked ? "#d88912" : "currentColor"} />
                            </button>
                            <button 
                              className="delete-btn" 
                              onClick={(e) => deleteSession(s._id, e)}
                              title="Delete Chat"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="history-pagination-row">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft size={16} />
              </button>
              <span>{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {hasHistory && (
            <button className="danger-button clear-history-btn" onClick={clearAllHistory} style={{ marginTop: "12px", width: "100%" }}>
              <Trash2 size={14} /> Clear All History
            </button>
          )}
        </aside>

        {/* RIGHT COLUMN: ACTIVE CONVERSATION PANEL */}
        <div className="panel tutor-panel quiz-main active-chat-panel">
          
          {/* Active conversation header settings */}
          <div className="tutor-header">
            <div className="tutor-title">
              <Bot size={22} />
              <span>{activeSession ? (activeSession.title.length > 30 ? activeSession.title.slice(0, 30) + "..." : activeSession.title) : "New Conversation"}</span>
              {activeSession?.isBookmarked && <Star size={16} fill="#d88912" stroke="#d88912" />}
            </div>
            
            <div className="tutor-settings-controls" style={{ display: "flex", gap: "10px" }}>
              <select
                className="tutor-course-select"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                style={{ height: "36px", padding: "0 8px" }}
              >
                <option value="">Choose Course Context</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>

            </div>
          </div>

          {error && <p className="error" style={{ padding: "0 4px" }}>{error}</p>}

          {/* Chat message viewport */}
          <div className="chat-window">
            {activeSessionLoading ? (
              <div className="tutor-empty">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
                <p>Retrieving chat history details...</p>
              </div>
            ) : !activeSession || activeSession.messages?.length === 0 ? (
              <div className="tutor-empty">
                <Bot size={40} className="empty-icon" />
                <p><strong>Ask me anything about your course!</strong></p>
                <p className="hint">Select a course context and type your academic question below.</p>
              </div>
            ) : (
              activeSession.messages.map((msg, idx) => (
                <div key={idx} className={`message ${msg.role}`}>
                  <span className="msg-avatar">
                    {msg.role === "student" ? <User size={16} /> : <Bot size={16} />}
                  </span>
                  
                  <div className="msg-content">
                    {msg.role === "ai" ? (
                      <>
                        <MarkdownBlock text={msg.text} />
                        
                        {/* Source citations hint */}
                        {msg.sourceTitles?.length > 0 && (
                          <small className="source-hint">
                            📚 Draws from: {msg.sourceTitles.join(" · ")}
                          </small>
                        )}
                        
                        {/* Audio TTS playback button */}
                        <div className="message-audio-row" style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                          <button 
                            className="audio-tts-btn primary-button compact-button" 
                            style={{ minHeight: "28px", padding: "0 10px", fontSize: "0.8rem", margin: 0 }}
                            onClick={() => speakMessage(msg.text, idx)}
                          >
                            {speakingMessageIndex === idx ? (
                              <>
                                <VolumeX size={12} /> Stop Speech
                              </>
                            ) : (
                              <>
                                <Volume2 size={12} /> Read Aloud
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="md-p">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))
            )}

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

          {/* User message input box */}
          <form className="composer" onSubmit={ask}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Type your academic question here..."
              disabled={loading || activeSessionLoading}
            />
            <button className="icon-button" type="submit" disabled={loading || activeSessionLoading || !question.trim()}>
              <Send size={18} />
            </button>
          </form>

        </div>
      </div>
    </section>
  );
}
