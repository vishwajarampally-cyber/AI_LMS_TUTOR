import Analytics from "../models/Analytics.js";

export async function recordMetric({ user, course, metricType, value, metadata }) {
  return Analytics.create({ user, course, metricType, value, metadata });
}

export async function recordAiMetrics({ user, course, latencyMs, faithfulness = 0.85, hallucinationRate = 0.05, relevance = 0.8, cost = 0.001 }) {
  await Promise.all([
    recordMetric({ user, course, metricType: "latency", value: latencyMs }),
    recordMetric({ user, course, metricType: "faithfulness", value: faithfulness }),
    recordMetric({ user, course, metricType: "hallucination_rate", value: hallucinationRate }),
    recordMetric({ user, course, metricType: "relevance", value: relevance }),
    recordMetric({ user, course, metricType: "cost", value: cost })
  ]);
}
