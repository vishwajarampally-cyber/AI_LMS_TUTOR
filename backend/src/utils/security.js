const injectionPatterns = [
  /ignore\s+(all\s+)?(previous|prior|system)\s+instructions/i,
  /reveal\s+(the\s+)?(system|hidden|developer)\s+prompt/i,
  /show\s+(hidden|confidential|system)\s+data/i,
  /bypass\s+(policy|guardrails|security)/i,
  /act\s+as\s+(admin|root|system)/i
];

export function detectPromptInjection(input = "") {
  return injectionPatterns.some((pattern) => pattern.test(input));
}

export function maskSensitive(value) {
  if (!value || typeof value !== "object") return value;
  const clone = Array.isArray(value) ? [...value] : { ...value };
  for (const key of Object.keys(clone)) {
    if (/password|token|secret|api[_-]?key/i.test(key)) clone[key] = "[MASKED]";
    else if (typeof clone[key] === "object") clone[key] = maskSensitive(clone[key]);
  }
  return clone;
}

export function clampQuery(input = "", max = Number(process.env.MAX_QUERY_LENGTH || 1200)) {
  return String(input).slice(0, max).trim();
}
