export function normalizeQuizQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => {
    const type = q.type || "mcq";
    const prompt = q.prompt || "";
    let options = Array.isArray(q.options) ? q.options : [];
    let answer = String(q.answer || "").trim();

    if (type === "true_false") {
      options = ["True", "False"];
    }

    return {
      type,
      prompt,
      options,
      answer,
      topic: q.topic || "General"
    };
  });
}

export function gradeQuestion(question, submitted) {
  const type = question.type || "mcq";
  const expected = String(question.answer || "").trim();
  const actual = String(submitted || "").trim();

  if (!actual) {
    return { score: 0, feedback: "No answer submitted." };
  }

  if (type === "mcq" || type === "true_false") {
    const isCorrect = expected.toLowerCase() === actual.toLowerCase();
    return {
      score: isCorrect ? 100 : 0,
      feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${expected}`
    };
  }

  if (type === "fill_blank") {
    const isCorrect = expected.toLowerCase() === actual.toLowerCase();
    return {
      score: isCorrect ? 100 : 0,
      feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${expected}`
    };
  }

  if (type === "msq") {
    const expectedSet = new Set(
      expected
        .split(/[|,]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    const actualSet = new Set(
      actual
        .split(/[|,]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );

    if (expectedSet.size === 0) {
      return { score: 100, feedback: "Correct!" };
    }

    let matchCount = 0;
    actualSet.forEach((val) => {
      if (expectedSet.has(val)) matchCount++;
    });

    const extraCount = actualSet.size - matchCount;
    const isPerfect = matchCount === expectedSet.size && extraCount === 0;

    if (isPerfect) {
      return { score: 100, feedback: "Correct!" };
    } else if (matchCount > 0 && extraCount === 0) {
      const pct = Math.round((matchCount / expectedSet.size) * 100);
      return {
        score: pct,
        feedback: `Partially correct (${pct}%). The correct options are: ${Array.from(expectedSet).join(", ")}`
      };
    } else {
      return {
        score: 0,
        feedback: `Incorrect. The correct options are: ${expected}`
      };
    }
  }

  // Fallback
  const isCorrect = expected.toLowerCase() === actual.toLowerCase();
  return {
    score: isCorrect ? 100 : 0,
    feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${expected}`
  };
}
