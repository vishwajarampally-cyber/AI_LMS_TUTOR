# RAG Pipeline

Runtime RAG code is implemented in `backend/src/rag`.

Pipeline:

1. Extract text from PDF, DOCX, or PPT/PPTX.
2. Split documents into overlapping chunks.
3. Embed chunks with Gemini embeddings via LangChain.
4. Upsert vectors and metadata into Pinecone.
5. Retrieve relevant chunks at question time.
6. Generate grounded answers with citations and safety constraints.
