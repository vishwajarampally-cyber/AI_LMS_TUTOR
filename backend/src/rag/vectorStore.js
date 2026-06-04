import { getEmbeddingModel } from "../config/ai.js";
import { getPineconeIndex } from "../config/pinecone.js";

const EMBED_CONCURRENCY = Number(process.env.EMBED_CONCURRENCY || 2);
const UPSERT_BATCH_SIZE = Number(process.env.UPSERT_BATCH_SIZE || 50);
const DELETE_ID_BATCH = 1000;

function targetDimension() {
  return Number(process.env.PINECONE_DIMENSION || 1024);
}

function fitDimension(vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Embedding model returned an empty vector. Check EMBEDDING_MODEL.");
  }

  const dimension = targetDimension();
  if (vector.length === dimension) return vector;
  if (vector.length > dimension) return vector.slice(0, dimension);
  throw new Error(
    `Embedding size (${vector.length}) is smaller than PINECONE_DIMENSION (${dimension}). ` +
      `Set PINECONE_DIMENSION=${vector.length} on your Pinecone index and in .env, then re-upload course materials.`
  );
}

async function embedChunkWithRetry(embeddings, text, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return fitDimension(await embeddings.embedQuery(text));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function upsertChunks({ chunks, namespace, metadata }) {
  const index = getPineconeIndex();
  const embeddings = getEmbeddingModel();

  const vectors = await mapWithConcurrency(chunks, EMBED_CONCURRENCY, async (text, idx) => {
    try {
      return {
        id: `${metadata.materialId}-${idx}`,
        values: await embedChunkWithRetry(embeddings, text),
        metadata: {
          ...metadata,
          text,
          chunkId: `${metadata.materialId}-${idx}`,
          chunkIndex: idx
        }
      };
    } catch (error) {
      console.warn(`Skipping chunk ${idx} for material ${metadata.materialId}: ${error.message}`);
      return null;
    }
  });

  const records = vectors.filter(Boolean);
  if (!records.length) throw new Error("No document chunks could be embedded. Check the embedding model setup.");

  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    await index.namespace(namespace).upsert(records.slice(i, i + UPSERT_BATCH_SIZE));
  }

  return records.length;
}

export async function deleteMaterialVectors({ namespace, materialId, chunkCount = 0 }) {
  const index = getPineconeIndex();
  const id = String(materialId);

  const deleteByIds = async (count) => {
    if (count <= 0) return;
    const ids = Array.from({ length: count }, (_, idx) => `${id}-${idx}`);
    for (let i = 0; i < ids.length; i += DELETE_ID_BATCH) {
      await index.namespace(namespace).deleteMany(ids.slice(i, i + DELETE_ID_BATCH));
    }
  };

  if (chunkCount > 0) {
    await deleteByIds(chunkCount);
    return;
  }

  try {
    await index.namespace(namespace).deleteMany({ materialId: id });
  } catch (error) {
    const fallbackChunks = Number(process.env.MAX_CHUNKS_PER_MATERIAL || 400);
    console.warn(`Pinecone filter delete failed for ${id}, deleting by id prefix (${fallbackChunks} slots): ${error.message}`);
    await deleteByIds(fallbackChunks);
  }
}

export async function similaritySearch({ query, namespace, k = 5 }) {
  const index = getPineconeIndex();
  const embeddings = getEmbeddingModel();
  const vector = fitDimension(await embeddings.embedQuery(query));
  const result = await index.namespace(namespace).query({
    vector,
    topK: k,
    includeMetadata: true
  });

  return (result.matches || []).map((match) => [
    {
      pageContent: match.metadata?.text || "",
      metadata: match.metadata || {}
    },
    match.score || 0
  ]);
}
