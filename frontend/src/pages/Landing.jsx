import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main className="landing">
      <section className="landing-hero">
        <div>
          <p className="eyebrow">RAG + Agentic AI + LMS Analytics</p>
          <h1>AI-Powered LMS Tutor</h1>
          <p>Grounded course tutoring, adaptive quizzes, answer evaluation, weak-topic detection, and role-based dashboards for students, faculty, and admins.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/login">Login</Link>
            <Link className="secondary-button" to="/register">Create Account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
