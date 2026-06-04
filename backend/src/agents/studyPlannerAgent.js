import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../config/ai.js";
import { parseJsonObject } from "../utils/json.js";

function normalizeToStrings(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    if (typeof item === "string") return item;
    if (typeof item === "object" && item !== null) {
      const prefix = item.day || item.week || item.phase
        ? `${item.day || (item.week ? 'Week ' + item.week : 'Phase ' + item.phase)}: `
        : "";
      const topicsText = item.topics ? `Topics: ${Array.isArray(item.topics) ? item.topics.join(', ') : item.topics}. ` : "";
      const studyTimeText = item.studyTime ? `(Study Time: ${item.studyTime}h) ` : "";
      const tasksText = item.tasks ? `Tasks: ${Array.isArray(item.tasks) ? item.tasks.join(', ') : item.tasks}` : "";
      const result = `${prefix}${studyTimeText}${topicsText}${tasksText}`.trim();
      return result || JSON.stringify(item);
    }
    return String(item);
  }).filter(Boolean);
}

export async function createStudyPlan({ courseTitle, weakTopics = [], strongTopics = [], progress = 0 }) {
  const model = getChatModel({ temperature: 0.2 });
  const response = await model.invoke([
    new SystemMessage(
      "Create personalized study plans. Return valid JSON only. " +
      "The fields dailyPlan, weeklyPlan, and examPreparationPlan MUST be flat arrays of plain strings (e.g. [\"Day 1: study X\", \"Day 2: study Y\"]). " +
      "Do NOT return objects, arrays of objects, or nested structures inside the plan arrays."
    ),
    new HumanMessage(
      `Course: ${courseTitle}\n` +
      `Weak topics: ${weakTopics.join(", ") || "None yet"}\n` +
      `Strong topics: ${strongTopics.join(", ") || "None yet"}\n` +
      `Progress: ${progress}%\n` +
      `Return JSON: {"dailyPlan":[],"weeklyPlan":[],"examPreparationPlan":[]}`
    )
  ]);

  const parsed = parseJsonObject(response.content, {
    dailyPlan: weakTopics.map((topic) => `Revise ${topic} and solve practice questions.`),
    weeklyPlan: ["Review weak topics, complete one quiz, and summarize mistakes."],
    examPreparationPlan: ["Prioritize weak units, attempt mixed quizzes, and revise faculty notes."]
  });

  return {
    dailyPlan: normalizeToStrings(parsed.dailyPlan),
    weeklyPlan: normalizeToStrings(parsed.weeklyPlan),
    examPreparationPlan: normalizeToStrings(parsed.examPreparationPlan)
  };
}
