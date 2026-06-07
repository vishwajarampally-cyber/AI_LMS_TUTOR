import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../config/ai.js";
import { parseJsonObject } from "../utils/json.js";
import { normalizeQuizQuestions } from "../utils/quizGrading.js";

export function nextDifficulty(score) {
  if (score > 80) return "hard";
  if (score < 50) return "easy";
  return "medium";
}


export async function generateAdaptiveQuiz({ courseTitle, topics = [], difficulty = "medium" }) {
  const isSingleTopic = topics.length === 1;
  const topicList = topics.length ? topics.join(", ") : "core syllabus units";
  const model = getChatModel({ temperature: 0.35 });
  const response = await model.invoke([
    new SystemMessage(
      "You create university quizzes. Return valid JSON only, no markdown. " +
        "Use ONLY these types: mcq, true_false, fill_blank, msq. " +
        "mcq = single correct option. msq = multiple correct options (answer as comma-separated labels). " +
        "fill_blank = sentence with ____ and answer is the missing word(s). " +
        "true_false = options must be True and False."
    ),
    new HumanMessage(
      `Create a ${difficulty} quiz for "${courseTitle}" ${isSingleTopic ? 'focusing strictly on the topic/unit' : 'covering'}: ${topicList}.\n` +
        `Ensure all 10 questions generated are entirely related to: ${topicList}.\n` +
        "Exactly 10 questions with this mix: 4 mcq, 2 fill_blank, 2 msq, 2 true_false.\n" +
        'JSON: {"title":"","difficulty":"","questions":[{"type":"mcq|fill_blank|msq|true_false","prompt":"","options":[],"answer":"","topic":""}]}\n' +
        "Each mcq/msq needs 4 options. fill_blank answer is only the blank text. msq answer lists all correct options separated by commas."
    )
  ]);

  const parsed = parseJsonObject(response.content, {
    title: `${courseTitle} Quiz`,
    difficulty,
    questions: []
  });

  const normalizedQuestions = normalizeQuizQuestions(parsed.questions).map(q => {
    // If questions don't have topic populated, assign the selected topic
    if (!q.topic && isSingleTopic) q.topic = topics[0];
    return q;
  });

  return {
    title: parsed.title || `${courseTitle} Quiz`,
    difficulty: (parsed.difficulty || difficulty || "medium").toLowerCase(),
    questions: normalizedQuestions.slice(0, 10)
  };
}

