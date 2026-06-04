export function chunkText(text, { chunkSize = 1000, overlap = 150 } = {}) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}
