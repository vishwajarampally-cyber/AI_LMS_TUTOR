import path from "path";
import { extractText } from "./documentLoader.js";
import { chunkText } from "./chunker.js";
import { upsertChunks } from "./vectorStore.js";

export async function indexMaterial({ material, course }) {
  const text = await extractText(material.storagePath);
  const chunks = chunkText(text);
  const namespace = `course-${course._id}`;
  const count = await upsertChunks({
    chunks,
    namespace,
    metadata: {
      materialId: String(material._id),
      courseId: String(course._id),
      title: material.title,
      fileType: path.extname(material.storagePath).replace(".", "")
    }
  });

  material.chunkCount = count;
  material.pineconeNamespace = namespace;
  material.status = "indexed";
  await material.save();
  return material;
}
