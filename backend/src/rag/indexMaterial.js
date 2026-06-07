import path from "path";
import { extractText } from "./documentLoader.js";
import { chunkText } from "./chunker.js";
import { upsertChunks } from "./vectorStore.js";

const STORED_CHUNK_LIMIT = Number(process.env.MAX_CHUNKS_PER_MATERIAL || 400);

export async function indexMaterial({ material, course }) {
  const text = await extractText(material.storagePath);
  const chunks = chunkText(text);
  const storedChunks = chunks.slice(0, STORED_CHUNK_LIMIT);
  const namespace = `course-${course._id}`;
  let count = storedChunks.length;
  let indexWarning = "";

  material.chunks = storedChunks.map((chunk, chunkIndex) => ({ chunkIndex, text: chunk }));

  try {
    count = await upsertChunks({
      chunks,
      namespace,
      metadata: {
        materialId: String(material._id),
        courseId: String(course._id),
        title: material.title,
        fileType: path.extname(material.storagePath).replace(".", "")
      }
    });
  } catch (error) {
    indexWarning = `Vector indexing unavailable: ${error.message}. Text fallback search is enabled.`;
    console.warn(`Vector indexing skipped for ${material._id}: ${error.message}`);
  }

  material.chunkCount = count;
  material.pineconeNamespace = namespace;
  material.status = "indexed";
  material.indexWarning = indexWarning;
  material.error = undefined;
  await material.save();
  return material;
}
