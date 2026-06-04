import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => {
    const path = user?.role === "admin" ? "/analytics/admin" : user?.role === "faculty" ? "/analytics/faculty" : "/analytics/student";
    api(path).then(setData).catch(console.error);
  }, [user]);

  return (
    <section className="page-grid">
      <div className="panel wide">
        <h2>Evaluation Framework</h2>
        <div className="metric-grid">
          {["accuracy", "relevance", "faithfulness", "hallucination_rate", "latency", "cost", "feedback_score"].map((metric) => (
            <div key={metric} className="metric"><span>{metric.replaceAll("_", " ")}</span><strong>{summarizeMetric(data, metric)}</strong></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function summarizeMetric(data, metric) {
  const values = data?.metrics?.filter((item) => item.metricType === metric).map((item) => item.value) || [];
  if (!values.length) return "0";
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
