import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";

export default function FacultyDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api("/analytics/faculty").then(setData).catch(console.error); }, []);

  return (
    <section className="page-grid">
      <StatCard label="Courses" value={data?.courses || 0} />
      <StatCard label="Students" value={data?.students || 0} tone="green" />
      <StatCard label="Average Score" value={`${data?.averageScore || 0}%`} tone="purple" />
      <StatCard label="Quiz Participation" value={data?.quizParticipation || 0} tone="amber" />
      <div className="panel wide">
        <h2>Learning Trends</h2>
        <div className="score-row">{(data?.learningTrends || []).map((score, idx) => <span key={idx}>{score}%</span>)}</div>
      </div>
    </section>
  );
}
