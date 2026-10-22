# QuizLab

A browser-local study tool built with React, TypeScript, Vite, and Tailwind. No backend, accounts, or AI calls.

## Run

Install Node.js 20.19+ (or 22.12+), then run from this directory:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:5173. Keep the same browser and origin to retain your library. To check the project:

```powershell
npm test
npm run build
```

## Study

Click **Import a question bank** and choose your JSON file. Select **Study**, choose practice/exam, filters, question count, and shuffling. Practice locks submitted answers and reveals explanations; written answers require your own assessment. Exam saves edits immediately and permits skipping and navigation; Finish exam locks everything and reveals review. Written exam responses are assessed during review. Exact complete sets are required for multiple-answer questions.

Return to the library to resume unfinished sessions or review completed ones. Use Retry incorrect after assessment to start a separate practice attempt. Starting a new session preserves previous results. Bank deletion preserves all attempt snapshots. Each import is a separate library entry, even when titles match.

All state is saved in localStorage on each change. The origin (including port) matters. Clearing browser data removes your work. Keep your original JSON banks; browser storage is not a backup. Storage write errors are shown and changes are not committed. Malformed saved JSON is protected from overwrite.

## Generate banks elsewhere

Copy `AI-PROMPT.md` into your preferred AI tool, fill in the subject and scope, and save its JSON response as a UTF-8 `.json` file. Review factual correctness yourself, then import it here. QuizLab validates structure, not academic accuracy. See `SCHEMA.md` and `public/question-bank.schema.json` for the versioned contract. A developer example lives in `examples/sample-bank.json`; it is not served or offered in the application.

Markdown, fenced code, and `$inline$` / `$$display$$` math render in questions, choices, explanations and hints. Raw HTML is not enabled. Imported content never runs as JavaScript. No answers or hints appear before final submission in exam mode (the bank itself is a local file, not a security boundary).

## Structure

- `src/core.ts`: validation, snapshot creation, grading, storage and scoring
- `src/main.tsx`: library, setup, quiz and review
- `src/core.test.ts`: focused behavior tests
- `public/`: schema and local fonts
- `examples/`: developer example bank used by the automated tests
- `src/legacy-demo.ts`: retires exact copies of the former built-in demo, preserving user edits

No server or network services are needed after dependencies are installed. `npm run build` produces `dist/`, which can be served with any local static HTTP server. Open through HTTP rather than double-clicking `index.html`.

## Interface design

The interface uses a mulberry navigation spine, a lavender question-bank index, apricot actions, and focused question worksheets. Use **Question library** for banks and **Saved sessions** to resume or review any attempt. Fonts are served locally, with their open-source licenses in `public/fonts/`.

See `DESIGN-RESEARCH.md` for the research, audit of the original interface, palette decisions, and verification notes.

## Everyday use

For the built application, run `npm run build` once after installing or updating, then `npm start`. It serves the app at the same http://127.0.0.1:5173 origin as development. Stop any existing dev server before running it. Both commands refuse a busy port instead of silently switching to a different origin with a different browser library.

The application starts empty. The former built-in demo and its attempts are retired only when their content exactly matches the original example. Modified banks and attempts are preserved. The example JSON remains available in the source documentation for schema reference and tests.
