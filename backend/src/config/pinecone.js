import { Pinecone } from "@pinecone-database/pinecone";

let client;

export function getPineconeClient() {
  if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY is required");
  if (!client) client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  return client;
}

export function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX;
  if (!indexName) throw new Error("PINECONE_INDEX is required");
  return getPineconeClient().index(indexName);
}
