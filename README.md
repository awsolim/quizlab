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

## Session composer and marking

Use Build a session to combine banks. Topic labels act as units across banks. Balanced coverage allocates equal question shares; Custom accepts relative weights (1:2:1 means 25%:50%:25%). Exclude units with their checkbox. Preview shows exact rounded counts and blocks shortages rather than silently redistributing. Questions are randomly sampled within units, then optionally shuffled.

Marks default to 1. Written questions support optional Markdown rubrics and a manual score from 0 to the maximum. Scores and unit summaries use marks; unfinished assessment is provisional. Practise missed marks includes partially correct and unanswered questions. Historical attempts retain their snapshots and binary scores are interpreted using their original marks.

Create a question bank offers a copyable/downloadable AI prompt. Generation happens in your chosen tool; review accuracy before importing.

## Practice papers

Import a kind: paper JSON to take a complete fixed exam. Use Take paper to preview its outline, total marks and instructions, choose the optional timer, and start. Main questions group their subparts under shared context; original question and choice order is preserved. Table questions accept answers in individual cells and are manually marked against model grids and rubrics. Timers continue across refresh and navigation; expiration automatically locks and submits the attempt. No answers, explanations or rubrics are rendered before submission.

The generator supports both question banks and fixed papers, with a dedicated Content-specific instructions field. Use it for exam-style references, scope exclusions, mark distribution, common misconceptions and acceptable alternative answers. Attach the reference and answer key to your chosen generation tool; QuizLab does not import PDFs or generate answers itself.

Objective questions include an optional Your reasoning disclosure before submission. Notes save with the response, survive answer changes and refresh, and appear alongside the explanation in review. They do not affect scores or count as answering an unselected question. Practice submission locks reasoning with the answer; exam and paper reasoning stays editable until submission.

## Keeping the importer current

An already-open tab continues running the JavaScript it originally loaded, even after the source or dist directory changes. If an error says only single/multiple/true-false/short are supported, that tab predates table support: reload it. The app now checks a generated build manifest on startup, focus, periodically and before import, and offers Reload QuizLab when a different build is available. Imports are blocked until reload when a newer build is detected. Offline or older static hosts without a manifest continue working.

npm start now builds before serving, so it cannot silently start an obsolete dist build. Static HTML and the build manifest are served with no-store headers by the configured dev/preview servers. Paper imports open their fixed-paper preview directly; Back to library returns to the library. No randomized session setup is needed.

Regression checks cover the actual file input, all-or-nothing import validation, a repeated-value table at Question 16, exact cell counts, direct fixed-paper launch, section order, marks, timer persistence, editable grids, review rubrics and legacy banks. Run npm test and npm run build.

## Saving papers and finishing review

Save for later returns to the library; it does not create an attempt or start a timer. Finish review appears above and below the review and returns to Saved sessions. If responses still need manual marking, an in-page prompt lets you continue or save and exit.

Results separate automatically marked questions from written/table questions. The self-assessed percentage uses scored marks only and is provisional while submitted responses remain unmarked; unanswered questions score zero. Green feedback indicates full marks, red indicates incorrect/partial/unanswered, and amber indicates assessment pending. Explicit text labels accompany the tints.
