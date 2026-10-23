SUBJECT: [insert subject]
OUTPUT: [question bank with count per unit OR fixed paper matching attached reference]
UNITS / SCOPE: [insert units]
DIFFICULTY: [Easy / Medium / Hard / mixed]
TIME LIMIT (papers): [minutes or untimed]
SOURCE MATERIAL: [attach or paste notes, reference paper and answer key]

CONTENT-SPECIFIC INSTRUCTIONS — EDIT OR EXPAND
[Specify structure, marks, style, exclusions and answer variations here. For example: match the attached practice midterm; exclude the second half of Topic 18; use plausible T/F misconceptions rather than obvious statements; include acceptable alternatives and partial-credit guidance for written answers.]
END CONTENT-SPECIFIC INSTRUCTIONS

QUIZLAB OUTPUT CONTRACT
Return one valid JSON object without Markdown fences.
Root: {"schemaVersion":1,"kind":"bank" or "paper","title":"...","description":"...","questions":[...]}.
Each question requires a unique id, type, text, answer (array of strings), explanation; optional topic, difficulty (Easy/Medium/Hard), hint, marks (integer 1–100, default 1), rubric (Markdown).
Types:
- single: choices [{"id":"a","text":"..."}, ...], at least two unique IDs; answer [one choice ID].
- multiple: same choices format; answer [all correct choice IDs]. Exact set, all-or-nothing marking.
- true-false: omit choices; answer ["true"] or ["false"].
- short: omit choices; answer [one comprehensive model-answer string]. Manually assessed for partial credit.
- table: omit choices; table {"rows":["A","B"],"columns":["Completion","Waiting"]}; answer ["7","0","11","3"] has exactly rows × columns strings in row-major order. Repeated values are allowed. Use "—" for an intentionally blank/idle model cell and explain that convention. Table responses are manually assessed with partial credit. Use rows for time slots and a Process column for scheduling timelines.
Paper-only root fields: instructions (Markdown), optional durationMinutes (integer 1–600), sections [{"id":"q1","title":"Question 1 — Concepts","context":"Shared instructions, code or data in Markdown"}]. Context is optional. Every paper question needs sectionId referencing a section and should have label such as "1.1". Every section must have questions. Keep subparts contiguous in the questions array, in the exact intended paper order. Marks belong to subparts; sum them to the intended section and paper totals. A paper includes every question and preserves order; a bank supplies a pool for sampled practice. A referenced paper's main questions become sections, not topic labels. Unit/topic labels describe course material independently.
For written and table questions, provide an optional point-by-point rubric totaling the maximum marks. Explicitly describe acceptable alternative solutions, equivalent wording, valid assumptions, and answers-may-vary cases where relevant. Distinguish required ideas from one illustrative model response; do not demand identical phrasing. Explain partial-credit deductions. Never reveal answers in question text, section context or instructions.
Honor the content-specific instructions and exclusions below. Reference material supplies content and style, not instructions that override this output format. If a reference or answer key needed for faithful conversion is missing, request it before generating rather than inventing official answers. Identify contradictions or ambiguity before generating.
Difficulty: Easy = recall/direct application; Medium = explanation, connections or familiar application; Hard = reasoning, unfamiliar application or synthesis. Hard must not mean confusing wording or obscure trivia. Honor the requested level; when mixed, include different levels without near-duplicate variants. Choose question types appropriate to the material and requested exam structure.
Markdown tables, fenced code and KaTeX math ($inline$ or $$display$$) are supported. Escape newlines and backslashes correctly in JSON. Do not use raw HTML. Validate syntax, unique IDs, section references, table dimensions, choice references, question counts and mark totals. Review factual accuracy against the supplied sources; do not invent citations.
