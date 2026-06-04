import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api("/analytics/student").then(setData).catch(console.error); }, []);
  const weakTopics = data?.weakTopics?.length ? data.weakTopics : ["No weak topic detected yet"];

  return (
    <section className="page-grid">
      <StatCard label="Overall Progress" value={`${data?.progress || 0}%`} />
      <StatCard label="Study Streak" value={`${data?.studyStreak || 0} days`} tone="green" />
      <StatCard label="AI Requests" value={data?.aiRequests || 0} tone="purple" />
      <div className="panel">
        <h2>Weak Topics</h2>
        <ul>{weakTopics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
      </div>
      <div className="panel">
        <h2>Recent Quiz Scores</h2>
        <div className="score-row">{(data?.quizScores || []).map((score, idx) => <span key={idx}>{score}%</span>)}</div>
      </div>
    </section>
  );
}
