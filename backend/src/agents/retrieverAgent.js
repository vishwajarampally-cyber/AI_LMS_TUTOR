import { similaritySearch } from "../rag/vectorStore.js";

export async function retrieveRelevantContent({ courseId, question, k = 8 }) {
  const namespace = `course-${courseId}`;
  const results = await similaritySearch({ query: question, namespace, k });
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
