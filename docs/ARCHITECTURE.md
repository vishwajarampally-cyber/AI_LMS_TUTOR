# Architecture Notes

The system uses a layered architecture:

1. React frontend for role-specific dashboards and workflows.
2. Express API for authentication, validation, RBAC, upload handling, and orchestration.
3. MongoDB Atlas for transactional data and analytics.
4. Pinecone for semantic retrieval.
5. LangChain with Gemini for embeddings, tutoring, quiz generation, answer evaluation, and study planning.

Agent modules are intentionally thin and composable. Each agent has one responsibility and shares common safety, metrics, and RAG utilities.
