import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../config/ai.js";
import { parseJsonObject } from "../utils/json.js";

export async function generateInterviewQuestions({ role, type, count = 5 }) {
  const model = getChatModel({ temperature: 0.5 });
  const typeLabel = type === "technical" ? "Technical (coding, system design, framework concepts, algorithm design, or domain-specific questions)" : "HR (behavioral, situational, cultural fit, soft-skills, and teamwork questions)";
  
  const systemPrompt = `You are a world-class hiring manager conducting an interview for the role: "${role}".
Your job is to generate a set of extremely relevant, high-quality, and realistic interview questions.
Return ONLY a valid JSON object. Do NOT wrap it in markdown block.
JSON structure:
{
  "questions": [
    "Question 1 text...",
    "Question 2 text..."
  ]
}`;

  const humanPrompt = `Create exactly ${count} ${typeLabel} interview questions for a candidate applying for the role: "${role}".
Make them challenging and specific to modern standards.
JSON:`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt)
  ]);

  const fallback = { questions: [] };
  for (let i = 1; i <= count; i++) {
    fallback.questions.push(`Tell me about your experience related to ${role} (Question ${i})`);
  }

  const parsed = parseJsonObject(response.content, fallback);
  return parsed.questions || fallback.questions;
}

export async function evaluateInterview({ role, type, questions }) {
  const model = getChatModel({ temperature: 0.2 });
  
  const qAndAPairsText = questions.map((q, idx) => {
    return `[Question ${idx + 1}]
Q: ${q.question}
A: ${q.userAnswer || "(No Answer Provided)"}
`;
  }).join("\n\n---\n\n");

  const systemPrompt = `You are a senior hiring panel evaluating a candidate's completed interview for the role: "${role}".
The interview type was: "${type}".
You must evaluate each answer on a scale of 0-100, provide constructive feedback, calculate an overall average score, list key strengths, list key weaknesses, and suggest improvement areas.
Return ONLY a valid JSON object. Do NOT wrap it in markdown block.
JSON structure:
{
  "overallScore": 85,
  "questions": [
    {
      "question": "Question text...",
      "userAnswer": "User answer...",
      "score": 80,
      "feedback": "Feedback for this specific answer..."
    }
  ],
  "strengths": [
    "Strength 1...",
    "Strength 2..."
  ],
  "weaknesses": [
    "Weakness 1...",
    "Weakness 2..."
  ],
  "improvementAreas": "Constructive paragraphs on how to improve..."
}`;

  const humanPrompt = `Evaluate this candidate's performance for "${role}" (${type} interview):

${qAndAPairsText}

Provide a fair, rigorous evaluation. Return the JSON object:`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt)
  ]);

  const fallback = {
    overallScore: 50,
    questions: questions.map(q => ({
      question: q.question,
      userAnswer: q.userAnswer,
      score: 50,
      feedback: "Answer received and recorded."
    })),
    strengths: ["Submitted answers successfully."],
    weaknesses: ["Needs detail in responses."],
    improvementAreas: "Focus on providing concrete details, technical terms, and structured answers (STAR method)."
  };

  return parseJsonObject(response.content, fallback);
}
