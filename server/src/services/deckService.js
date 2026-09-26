
import { readFile, readdir } from "node:fs/promises";

const DECKS_DIR = new URL("../../decks/", import.meta.url);

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateDeck(deck) {
  const errors = [];

  if (!deck || typeof deck !== "object" || Array.isArray(deck)) {
    return ["Deck must be an object"];
  }

  if (!nonEmpty(deck.id)) errors.push("Deck id is required");
  if (!nonEmpty(deck.title)) errors.push("Deck title is required");

  if (!Array.isArray(deck.questions) || deck.questions.length === 0) {
    errors.push("Deck must contain at least one question");
    return errors;
  }

  const questionIds = new Set();

  deck.questions.forEach((question, questionIndex) => {
    const location = `Question ${questionIndex + 1}`;

    if (!question || typeof question !== "object" || Array.isArray(question)) {
      errors.push(`${location} must be an object`);
      return;
    }

    if (!nonEmpty(question.id)) {
      errors.push(`${location}: id is required`);
    } else if (questionIds.has(question.id)) {
      errors.push(`${location}: duplicate id "${question.id}"`);
    } else {
      questionIds.add(question.id);
    }

    if (!nonEmpty(question.topic)) errors.push(`${location}: topic is required`);
    if (!nonEmpty(question.prompt)) errors.push(`${location}: prompt is required`);
    if (!nonEmpty(question.correctOptionId)) {
      errors.push(`${location}: correctOptionId is required`);
    }

    if (!Array.isArray(question.options) || question.options.length < 3 || question.options.length > 4) {
      errors.push(`${location}: provide 3 or 4 options`);
      return;
    }

    const optionIds = new Set();

    question.options.forEach((option, optionIndex) => {
      const optionLocation = `${location}, option ${optionIndex + 1}`;

      if (!option || typeof option !== "object" || Array.isArray(option)) {
        errors.push(`${optionLocation} must be an object`);
        return;
      }

      if (!nonEmpty(option.id)) {
        errors.push(`${optionLocation}: id is required`);
      } else if (optionIds.has(option.id)) {
        errors.push(`${optionLocation}: duplicate id "${option.id}"`);
      } else {
        optionIds.add(option.id);
      }

      if (!nonEmpty(option.text)) {
        errors.push(`${optionLocation}: text is required`);
      }

      if (option.id !== question.correctOptionId) {
        if (!option.misconception ||
            !nonEmpty(option.misconception.label) ||
            !nonEmpty(option.misconception.explanation)) {
          errors.push(`${optionLocation}: wrong option needs a misconception label and explanation`);
        }
      } else if (option.misconception !== undefined) {
        errors.push(`${optionLocation}: correct option must not have a misconception`);
      }
    });

    if (nonEmpty(question.correctOptionId) &&
        !optionIds.has(question.correctOptionId)) {
      errors.push(`${location}: correctOptionId must match an option id`);
    }
  });

  return errors;
}
export async function loadDeck(deckId) {
  if (typeof deckId !== "string" || !/^[a-z0-9-]+$/.test(deckId)) {
    throw new Error("Invalid deck id");
  }

  const fileUrl = new URL(`${deckId}.json`, DECKS_DIR);
  const contents = await readFile(fileUrl, "utf8");
  const deck = JSON.parse(contents);
  const errors = validateDeck(deck);

  if (errors.length > 0) {
    throw new Error(`Invalid deck "${deckId}": ${errors.join("; ")}`);
  }

  if (deck.id !== deckId) {
    throw new Error(`Deck id must match filename "${deckId}.json"`);
  }

  return deck;
}

export async function listDecks() {
  const files = await readdir(DECKS_DIR);
  return files
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -5))
    .sort();
}