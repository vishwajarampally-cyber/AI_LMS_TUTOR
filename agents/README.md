# Agent Design

Runtime agents are implemented in `backend/src/agents`.

- Retriever Agent: searches Pinecone and returns cited chunks.
- Tutor Agent: generates grounded answers using retrieved sources.
- Quiz Agent: creates adaptive quizzes.
- Evaluation Agent: scores answers and identifies missing concepts.
- Study Planner Agent: creates personalized daily, weekly, and exam plans.
