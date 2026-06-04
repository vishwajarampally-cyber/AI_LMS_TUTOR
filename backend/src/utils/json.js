export function parseJsonObject(text, fallback) {
  try {
    const cleaned = String(text).replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}
