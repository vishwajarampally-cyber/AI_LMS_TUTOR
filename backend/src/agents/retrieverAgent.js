import { similaritySearch } from "../rag/vectorStore.js";
import Material from "../models/Material.js";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "in",
  "is", "it", "of", "on", "or", "that", "the", "to", "was", "were", "with"
]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((token) => token.length > 2 && !STOP_WORDS.has(token)) || [];
}

async function textFallbackSearch({ courseId, question, k }) {
  const queryTokens = new Set(tokenize(question));
  if (!queryTokens.size) return [];

  const materials = await Material.find({
    course: courseId,
    status: "indexed",
    "chunks.0": { $exists: true }
  }).select("title chunks").lean();

  return materials
    .flatMap((material) => (material.chunks || []).map((chunk) => {
      const chunkTokens = tokenize(chunk.text);
      const matches = chunkTokens.filter((token) => queryTokens.has(token)).length;
      return {
        content: chunk.text,
        score: matches / Math.max(queryTokens.size, 1),
        citation: {
          materialId: String(material._id),
          title: material.title,
          chunkId: `${material._id}-${chunk.chunkIndex}`,
          score: matches
        }
      };
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export async function retrieveRelevantContent({ courseId, question, k = 8 }) {
  const namespace = `course-${courseId}`;
  try {
    const results = await similaritySearch({ query: question, namespace, k });
    if (results.length) {
      return results.map(([doc, score]) => ({
        content: doc.pageContent,
        score,
        citation: {
          materialId: doc.metadata.materialId,
          title: doc.metadata.title,
          chunkId: doc.metadata.chunkId,
          score
        }
      }));
    }
  } catch (error) {
    console.warn(`Vector retrieval unavailable for course ${courseId}: ${error.message}`);
  }

  return textFallbackSearch({ courseId, question, k });
}
