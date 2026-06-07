import { useEffect, useState } from "react";
import { api } from "../api/client.js";

const TYPE_LABELS = {
  mcq: "MCQ",
  msq: "MSQ",
  true_false: "True / False",
  fill_blank: "Fill in the blank"
};

function QuestionInput({ question, value, onChange }) {
  if (question.type === "msq") {
    const selected = new Set(String(value || "").split("|").filter(Boolean));
    return (
      <div className="option-group">
        {question.options.map((option) => (
          <label key={option} className="checkbox-option">
            <input
              type="checkbox"
              checked={selected.has(option)}
              onChange={() => {
                const next = new Set(selected);
                if (next.has(option)) next.delete(option);
                else next.add(option);
                onChange([...next].sort().join("|"));
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "true_false") {
    return (
      <div className="option-group inline-options">
        {["True", "False"].map((option) => (
          <label key={option} className="radio-option">
            <input type="radio" name={question.prompt} checked={value === option} onChange={() => onChange(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "mcq") {
    return (
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select answer</option>
        {question.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (question.type === "fill_blank") {
    return (
      <input
        className="fill-input"
        placeholder="Type the missing word(s)"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} />;
}

export default function QuizCenter() {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [topic, setTopic] = useState("all");
  const [bank, setBank] = useState({ items: [], course: null });
  const [bankLoading, setBankLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const selectedCourse = courses.find((course) => course._id === courseId);
  const topics = ["all", ...(selectedCourse?.topics || [])];

  useEffect(() => {
    api("/courses")
      .then((data) => {
        setCourses(data.courses);
        setCourseId(data.courses[0]?._id || "");
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    loadBank();
  }, [courseId, topic]);

  async function loadBank() {
    setBankLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ courseId });
      if (topic && topic !== "all") query.set("topic", topic);
      const data = await api(`/quizzes/bank?${query}`);
      setBank(data);
    } catch (err) {
      setError(err.message);
      setBank({ items: [], course: null });
    } finally {
      setBankLoading(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError("");
    setAttempt(null);
    try {
      const data = await api("/quizzes/generate", { 
        method: "POST", 
        body: JSON.stringify({ courseId, topic: topic !== "all" ? topic : undefined }) 
      });
      setQuiz(data.quiz);
      setAnswers(data.quiz.questions.map(() => ({ answer: "" })));
      await loadBank();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    setError("");
    try {
      const data = await api("/quizzes/attempts", { method: "POST", body: JSON.stringify({ quizId: quiz._id, answers }) });
      setAttempt(data.attempt);
    } catch (err) {
      setError(err.message);
    }
  }

  function setAnswerAt(index, answer) {
    setAnswers((current) => current.map((item, i) => (i === index ? { answer } : item)));
  }

  return (
    <section className="tool-page quiz-page">
      <div className="panel wide">
        <div className="inline-actions">
          <label className="field-label">
            Subject
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select subject</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Unit / topic
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All topics" : item}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" onClick={generate} disabled={!courseId || generating}>
            {generating ? "Generating…" : "Generate Quiz"}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {quiz && !attempt && (
          <div className="quiz-list">
            <h2>{quiz.title}</h2>
            <p className="hint">Mix of MCQ, fill in the blanks, MSQ, and true/false questions.</p>
            {quiz.questions.map((question, idx) => (
              <label key={idx} className="question-block">
                <span className="question-head">
                  <strong>{idx + 1}.</strong> {question.prompt}
                  <em className="type-tag">{TYPE_LABELS[question.type] || question.type}</em>
                  {question.topic && <em className="topic-tag">{question.topic}</em>}
                </span>
                <QuestionInput
                  question={question}
                  value={answers[idx]?.answer || ""}
                  onChange={(answer) => setAnswerAt(idx, answer)}
                />
              </label>
            ))}
            <button className="primary-button" onClick={submit}>
              Submit Attempt
            </button>
          </div>
        )}

        {attempt && (
          <div className="quiz-review">
            <div className="review-summary-card">
              <h3>Quiz Results Summary</h3>
              <div className="score-badge-large">{attempt.totalScore}%</div>
              <p>Next Recommended Difficulty: <strong style={{ textTransform: "capitalize" }}>{attempt.nextDifficulty}</strong></p>
            </div>

            <div className="review-questions">
              <h3>Question Review</h3>
              {attempt.answers.map((ans, idx) => {
                const isCorrect = ans.score >= 100;
                return (
                  <div key={idx} className={`review-block ${isCorrect ? "correct-ans" : "incorrect-ans"}`}>
                    <div className="review-head">
                      <strong>Q{idx + 1}: {ans.prompt}</strong>
                      <span className={`status-tag ${isCorrect ? "tag-correct" : "tag-incorrect"}`}>
                        {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                      </span>
                    </div>
                    <div className="review-details">
                      <p><strong>Your Answer:</strong> <span className="user-selected">{ans.answer || "(No Answer)"}</span></p>
                      <p><strong>Correct Answer:</strong> <span className="correct-expected">{ans.expected}</span></p>
                      {ans.feedback && (
                        <p className="feedback-text">💡 <em>{ans.feedback}</em></p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="secondary-button" style={{ marginTop: "20px" }} onClick={() => { setAttempt(null); setQuiz(null); }}>
              Close & Start New Quiz
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
