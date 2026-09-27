export type ExplanationRubric = {
  keyIdeas: string[];
  misconceptions: {
    label: string;
    phrases: string[];
  }[];
};

export type ExplanationScore = {
  matchedIdeas: string[];
  matchedMisconceptions: string[];
  score: number | null;
};

// Keyword matching is a hint for the teacher, not a final judgment of understanding.
export function scoreExplanation(
  explanation: string,
  rubric: ExplanationRubric,
): ExplanationScore {
  const words = (text: string) =>
    text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

  const answerWords = words(explanation);
  if (answerWords.length === 0) {
    return { matchedIdeas: [], matchedMisconceptions: [], score: null };
  }

  const containsPhrase = (phrase: string) => {
    const phraseWords = words(phrase);
    if (phraseWords.length === 0) return false;

    return answerWords.some((_, start) =>
      phraseWords.every(
        (word, offset) => answerWords[start + offset] === word,
      ),
    );
  };

  const matchedIdeas = rubric.keyIdeas.filter(containsPhrase);
  const matchedMisconceptions = rubric.misconceptions
    .filter((item) => item.phrases.some(containsPhrase))
    .map((item) => item.label);

  const score = rubric.keyIdeas.length === 0
    ? null
    : Math.round((matchedIdeas.length / rubric.keyIdeas.length) * 100);

  return { matchedIdeas, matchedMisconceptions, score };
}