import { ChatGroq } from "@langchain/groq";
import { pipeline } from "@xenova/transformers";

let embeddingPipeline;

let pipelineLoading;

async function getEmbeddingPipeline() {
  if (embeddingPipeline) return embeddingPipeline;
  if (!pipelineLoading) {
    pipelineLoading = pipeline(
      "feature-extraction",
      process.env.EMBEDDING_MODEL || "Xenova/bge-large-multi-v1.0"
    ).then((loaded) => {
      embeddingPipeline = loaded;
      return loaded;
    });
  }
  return pipelineLoading;
}

export async function warmEmbeddingModel() {
  await getEmbeddingPipeline();
}

export function getChatModel({ temperature = 0.2 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Create one at https://console.groq.com/");
  }

  return new ChatGroq({
    apiKey,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    temperature
  });
}

export function getEmbeddingModel() {
  return {
    async embedQuery(text) {
      const extractor = await getEmbeddingPipeline();
      const output = await extractor(text, { pooling: "mean", normalize: true });
      return Array.from(output.data);
    }
  };
}
