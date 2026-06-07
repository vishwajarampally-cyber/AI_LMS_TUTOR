import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../config/ai.js";
import { retrieveRelevantContent } from "./retrieverAgent.js";

function extractContent(response) {
  if (typeof response?.content === "string") return response.content.trim();
  if (Array.isArray(response?.content)) {
    return response.content.map((part) => part.text || "").join("\n").trim();
  }
  return "";
}

async function getOptionalCourseContexts({ courseId, queryText, k = 10 }) {
  if (!courseId) return [];

  try {
    return await retrieveRelevantContent({ courseId, question: queryText, k });
  } catch (error) {
    console.warn(`Study material retrieval skipped: ${error.message}`);
    return [];
  }
}

export async function generateStudyNotes({ courseId, courseTitle, topic }) {
  const queryText = topic === "all" ? courseTitle : `${courseTitle} ${topic}`;
  const contexts = await getOptionalCourseContexts({ courseId, queryText, k: 10 });
  
  let contextSnippet = "";
  if (contexts.length > 0) {
    contextSnippet = contexts
      .map((item, idx) => `[Source Note ${idx + 1}]\n${item.content}`)
      .join("\n\n---\n\n");
  }

  const model = getChatModel({ temperature: 0.3 });
  
  const systemPrompt = `You are a world-class academic tutor. Your task is to generate extremely high-quality, comprehensive, and beautiful study notes for a specific topic of a university course.
Use the course materials provided below as your primary context. If the materials are empty or lack specific details, use your broad academic knowledge of the subject (Computer Science, AI, Engineering, etc.) to compile expert notes that align with a college curriculum.

Formatting Rules:
- Present the notes in beautiful, structured Markdown.
- Start with a clear bold title (e.g. "# Topic: Name").
- Use bold headings (##) and sub-headings (###) to separate sections (e.g., Overview, Core Definitions, Explanations, Step-by-Step Methods, and Illustrative Examples).
- Use neat bullet points (•) and numbered lists to structure concepts. Do NOT write long, dense paragraphs.
- Bold (**term**) key technical terms, variables, or definitions when they are introduced.
- Use clean code blocks (\`\`\`language) or mathematical formatting where applicable.
- Write in an encouraging, highly professional, and academic tone.`;

  const humanPrompt = `Course: "${courseTitle}"
Topic to cover: "${topic}"

Reference Course Materials:
${contextSnippet || "No course materials uploaded yet. Use standard syllabus guidelines for this subject."}

Generate the complete study notes:`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt)
  ]);

  return extractContent(response);
}

export async function generatePracticeGuide({ courseId, courseTitle, topic }) {
  const queryText = topic === "all" ? courseTitle : `${courseTitle} ${topic}`;
  const contexts = await getOptionalCourseContexts({ courseId, queryText, k: 10 });
  
  let contextSnippet = "";
  if (contexts.length > 0) {
    contextSnippet = contexts
      .map((item, idx) => `[Source Note ${idx + 1}]\n${item.content}`)
      .join("\n\n---\n\n");
  }

  const model = getChatModel({ temperature: 0.35 });

  const systemPrompt = `You are an expert college examiner. Your task is to generate a high-quality practice question and answer guide for a university course topic.
Create a set of 5-10 exam-style practice questions with detailed, step-by-step solved answers. 
You MUST include a mix of BOTH:
1. Short Answer Questions (conceptual definitions, quick explanations, short derivations, or brief definitions).
2. Long Answer Questions (deep case analysis, scenario-based applications, step-by-step problem-solving, or design/code/math analysis).

Formatting Rules:
- Output in clean Markdown.
- Start with a main title (e.g. "# Exam Practice Guide: Topic").
- Clearly label each question's format (e.g. "### Q1. [Short Answer] [Question Prompt]" or "### Q2. [Long Answer] [Question Prompt]").
- Place the detailed solution immediately below each question in a clear block under a bold label (e.g. "**Step-by-Step Solution:**").
- Use bullet lists to explain reasoning, steps, and options.
- Bold key terms and final solutions.`;

  const humanPrompt = `Course: "${courseTitle}"
Topic to cover: "${topic}"

Reference Course Materials:
${contextSnippet || "No course materials uploaded yet. Use standard syllabus guidelines for this subject."}

Generate the exam-style Q&A guide:`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt)
  ]);

  return extractContent(response);
}
