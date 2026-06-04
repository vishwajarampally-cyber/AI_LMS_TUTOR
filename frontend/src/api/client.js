const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(data.details) ? `: ${data.details.map((item) => item.msg).join(", ")}` : "";
    throw new Error(`${data.message || "Request failed"}${details}`);
  }
  return data;
}
