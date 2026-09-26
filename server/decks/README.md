# Question decks

Each `.json` file in this folder is one deck. Its filename (without `.json`) must match the deck's `id`.

See `example.json` for a complete example.

## Deck format

- `id`: unique deck identifier, using lowercase letters, numbers and hyphens.
- `title`: title shown to the teacher.
- `questions`: non-empty list of questions.

Each question has:

- `id`: unique within the deck.
- `topic`: the concept being checked.
- `prompt`: the question shown to students.
- `correctOptionId`: the id of the correct option.
- `options`: 3 or 4 options, each with a unique `id` and visible `text`.

Every wrong option must include `misconception` with a short `label` and a one-line `explanation`. The correct option must not include `misconception`.

## Server API

Import `listDecks()` and `loadDeck(deckId)` from `server/src/services/deckService.js`. Both are asynchronous. `loadDeck` validates the JSON and throws an error if the file or its content is invalid. Use `validateDeck(deck)` to get an array of validation errors directly.