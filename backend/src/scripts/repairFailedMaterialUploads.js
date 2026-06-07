import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Material from "../models/Material.js";
import { extractText } from "../rag/documentLoader.js";
import { chunkText } from "../rag/chunker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const STORED_CHUNK_LIMIT = Number(process.env.MAX_CHUNKS_PER_MATERIAL || 400);
const EMBEDDING_FAILURE_PATTERN = /No document chunks could be embedded|Unauthorized access to file/i;

async function repairFailedMaterials() {
  await connectDB();

  const materials = await Material.find({
    status: "failed",
    storagePath: { $exists: true, $ne: "" },
    error: EMBEDDING_FAILURE_PATTERN
  });

  let repaired = 0;

  for (const material of materials) {
    try {
      const text = await extractText(material.storagePath, material.originalName);
      const chunks = chunkText(text).slice(0, STORED_CHUNK_LIMIT);

      material.chunks = chunks.map((chunk, chunkIndex) => ({ chunkIndex, text: chunk }));
      material.chunkCount = chunks.length;
      material.status = "indexed";
      material.indexWarning = "Vector indexing unavailable. Text fallback search is enabled.";
      material.error = undefined;
      await material.save();
      repaired += 1;
      console.log(`Repaired ${material._id} (${material.originalName || material.title})`);
    } catch (error) {
      console.warn(`Could not repair ${material._id}: ${error.message}`);
    }
  }

  console.log(`Repair complete. ${repaired}/${materials.length} material(s) repaired.`);
}

repairFailedMaterials()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
