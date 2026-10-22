Generate a university study question bank for:
SUBJECT: [fill in]
SCOPE / SOURCE MATERIAL: [fill in]
NUMBER OF QUESTIONS: [fill in]

Return only valid JSON, without surrounding Markdown fences. Use this exact version-1 contract:
Root {"schemaVersion":1,"title":"...","description":"...","questions":[...]}.
Every question: unique nonempty string id, type, text, answer array, explanation. Optional topic, difficulty, hint (nonempty strings).
Types:
- single: choices [{"id":"a","text":"..."},...] (at least two unique IDs), answer [one choice ID].
- multiple: same choices format; answer [all correct choice IDs], no duplicates. Exact set is graded, no partial credit.
- true-false: omit choices; answer ["true"] or ["false"].
- short: omit choices; answer [one clear model-answer string]. User self-assesses against that answer.
Use a balanced mixture of all four types. Write meaningful explanations, plausible distractors, consistent topic labels, and difficulty labels Easy/Medium/Hard. Include useful hints where appropriate. Ensure every answer matches the supplied source material; identify ambiguity before producing the bank. Do not invent citations.
Question text, choices, answers for short questions, hints and explanations may use Markdown, fenced code, and KaTeX math ($inline$ or $$display$$). Escape newlines as \n and backslashes as \\ in JSON. Do not use raw HTML. Check JSON syntax, unique IDs, and correct answer references before returning the file.
