import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import StatCard from "../components/StatCard.jsx";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api("/analytics/admin").then(setData).catch(console.error); }, []);

  return (
    <section className="page-grid">
      <StatCard label="Total Users"  value={data?.totalUsers  || 0} />
      <StatCard label="Active Users" value={data?.activeUsers || 0} tone="green" />
      <StatCard label="Courses"      value={data?.courses     || 0} tone="purple" />
      <StatCard label="AI Requests"  value={data?.aiRequests  || 0} tone="amber" />
    </section>
  );
}
