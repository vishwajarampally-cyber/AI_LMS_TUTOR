import QuizAttempt from "../models/QuizAttempt.js";
import Evaluation from "../models/Evaluation.js";

export async function detectWeakAreas(userId, courseId) {
  const attempts = await QuizAttempt.find({ user: userId, course: courseId }).lean();
  const evaluations = await Evaluation.find({ user: userId, course: courseId }).lean();
  const topicStats = new Map();

  for (const attempt of attempts) {
    for (const answer of attempt.answers || []) {
      if (!answer.topic) continue;
      const stat = topicStats.get(answer.topic) || { total: 0, count: 0 };
      stat.total += Number(answer.score || 0);
      stat.count += 1;
      topicStats.set(answer.topic, stat);
    }
  }

  for (const evaluation of evaluations) {
    const topic = evaluation.question?.slice(0, 40) || "General";
    const stat = topicStats.get(topic) || { total: 0, count: 0 };
    stat.total += Number(evaluation.score || 0);
    stat.count += 1;
    topicStats.set(topic, stat);
  }

  const weakTopics = [];
  const strongTopics = [];
  for (const [topic, stat] of topicStats.entries()) {
    const avg = stat.total / stat.count;
    if (avg < 60) weakTopics.push(topic);
    if (avg >= 80) strongTopics.push(topic);
  }

  return { weakTopics, strongTopics };
}
