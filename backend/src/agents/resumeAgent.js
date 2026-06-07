import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../config/ai.js";
import { parseJsonObject } from "../utils/json.js";

export async function analyzeResume({ resumeText, targetRole, targetDescription }) {
  const model = getChatModel({ temperature: 0.3 });

  const systemPrompt = `You are an expert ATS (Applicant Tracking System) optimizer and professional recruiter.
Analyze the provided resume text against the target job role and description.
Generate a structured feedback report.
You MUST output ONLY a valid JSON object. Do NOT wrap it in markdown block.
JSON structure:
{
  "atsScore": 72,
  "missingSkills": ["React Native", "TypeScript"],
  "missingKeywords": ["State Management", "CI/CD Pipelines"],
  "suggestions": [
    "Quantify your metrics in experience bullets.",
    "Add a dedicated skills section at top."
  ],
  "sectionFeedback": {
    "summary": "Feedback for summary section...",
    "experience": "Feedback for experience/work history section...",
    "skills": "Feedback for skills section...",
    "education": "Feedback for education section..."
  },
  "improvedResume": "The complete rewritten, tailored resume in clean markdown format..."
}`;

  const humanPrompt = `Resume Text:
${resumeText}

Target Job Role:
${targetRole}

Target Job Description:
${targetDescription}

Perform ATS matching, suggest improvements, and write a complete rewritten resume optimized for ATS scan:`;

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt)
  ]);

  const fallback = {
    atsScore: 60,
    missingSkills: [],
    missingKeywords: [],
    suggestions: ["Review bullet points for action verbs.", "Ensure formatting is clean."],
    sectionFeedback: {
      summary: "Add a concise summary targeting the role.",
      experience: "Include accomplishments with metrics.",
      skills: "List all key relevant tools.",
      education: "Add coursework links if applicable."
    },
    improvedResume: `# Professional Resume\n\n${resumeText}`
  };

  return parseJsonObject(response.content, fallback);
}
