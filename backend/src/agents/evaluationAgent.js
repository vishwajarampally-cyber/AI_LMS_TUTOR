import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../config/ai.js";
import { parseJsonObject } from "../utils/json.js";

export async function evaluateAnswer({ question, answer, expectedContext = "" }) {
  const model = getChatModel({ temperature: 0.1 });
  const response = await model.invoke([
    new SystemMessage("Evaluate student answers. Return valid JSON only with numeric scores from 0 to 100."),
    new HumanMessage(`Question: ${question}\nStudent answer: ${answer}\nExpected context: ${expectedContext}\nReturn {"correctness":0,"completeness":0,"relevance":0,"coverage":0,"score":0,"feedback":"","missingConcepts":[],"suggestedImprovements":[]}`)
  ]);

  return parseJsonObject(response.content, {
    correctness: 0,
    completeness: 0,
    relevance: 0,
    coverage: 0,
    score: 0,
    feedback: "Evaluation unavailable.",
    missingConcepts: [],
    suggestedImprovements: []
  });
}
