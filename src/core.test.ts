import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateBank,
  grade,
  shuffle,
  createAttempt,
  stats,
  readStore,
  storageKey,
} from "./core";
import { retireLegacyDemo } from "./legacy-demo";
const sample = JSON.parse(
  readFileSync(
    new URL("../examples/sample-bank.json", import.meta.url),
    "utf8",
  ),
);
test("retiring the old demo preserves user banks, edits and attempts", async () => {
  const demo = validateBank(sample);
  const edited = structuredClone(demo);
  edited.questions[0].explanation = "My own course explanation";
  const real = structuredClone(demo);
  real.title = "My course";
  const demoAttempt = createAttempt(
    demo,
    "practice",
    demo.questions.slice(0, 2),
    true,
  );
  const editedAttempt = createAttempt(
    edited,
    "exam",
    edited.questions.slice(0, 2),
    true,
  );
  const realAttempt = createAttempt(real, "practice", real.questions, true);
  const input = {
    banks: [
      { ...demo, libraryId: "demo" },
      { ...edited, libraryId: "edited" },
      { ...real, libraryId: "real" },
    ],
    attempts: [demoAttempt, editedAttempt, realAttempt],
  };
  const cleaned = await retireLegacyDemo(input);
  assert.deepEqual(
    cleaned.banks.map((b) => b.libraryId),
    ["edited", "real"],
  );
  assert.deepEqual(
    cleaned.attempts.map((a) => a.id),
    [editedAttempt.id, realAttempt.id],
  );
  assert.equal(input.banks.length, 3);
  assert.equal(await retireLegacyDemo(cleaned), cleaned);
});
test("sample contains every type and 12 valid questions", () => {
  const b = validateBank(sample);
  assert.equal(b.questions.length, 12);
  assert.equal(new Set(b.questions.map((q) => q.type)).size, 4);
});
test("invalid imports identify question and field", () => {
  const b = structuredClone(sample);
  b.questions[0].answer = ["missing"];
  assert.throws(() => validateBank(b), /math-1.*answer/);
  b.questions[0].id = b.questions[1].id;
  assert.throws(() => validateBank(b), /id: must be unique/);
  assert.throws(() => validateBank({ schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => validateBank(null), /JSON object/);
});
test("all objective types and exact multi-answer grading", () => {
  for (const q of validateBank(sample).questions) {
    assert.equal(grade(q, q.answer), q.type === "short" ? undefined : true);
    if (q.type !== "short") assert.equal(grade(q, []), false);
  }
  const q = sample.questions[1];
  assert.equal(grade(q, ["c", "a"]), true);
  assert.equal(grade(q, ["a"]), false);
  assert.equal(grade(q, ["a", "c", "b"]), false);
});
test("shuffling preserves IDs and correctness", () => {
  const q = validateBank(sample).questions[0];
  const original = structuredClone(q.choices!);
  const shuffled = shuffle(q.choices!, () => 0);
  assert.deepEqual(q.choices, original);
  assert.deepEqual(
    new Set(shuffled.map((x) => x.id)),
    new Set(original.map((x) => x.id)),
  );
  assert.equal(grade({ ...q, choices: shuffled }, q.answer), true);
});
test("both modes snapshot banks and survive refresh, scoring and retry eligibility", () => {
  for (const mode of ["practice", "exam"] as const) {
    const b = validateBank(sample);
    const a = createAttempt(b, mode, b.questions, true);
    b.questions[0].text = "changed";
    assert.notEqual(a.questions[0].text, "changed");
    a.responses[a.questions[0].id] = {
      value: a.questions[0].answer,
      submitted: true,
      correct: true,
    };
    a.responses[a.questions[1].id] = {
      value: ["b"],
      submitted: true,
      correct: false,
    };
    a.responses[a.questions[3].id] = { value: ["my essay"], submitted: true };
    const raw = JSON.stringify({ banks: [], attempts: [a] });
    const resumed = readStore({
      getItem: (key) => (key === storageKey ? raw : null),
    }).attempts[0];
    assert.deepEqual(resumed, a);
    const s = stats(resumed);
    assert.equal(s.correct, 1);
    assert.equal(s.incorrect, 1);
    assert.equal(s.pending, 1);
    assert.equal(s.unanswered, 9);
    const retryQs = a.questions.filter(
      (q) => a.responses[q.id]?.correct === false,
    );
    const retry = createAttempt(b, "practice", retryQs, false);
    assert.equal(retry.questions.length, 1);
    assert.notEqual(retry.id, a.id);
    assert.deepEqual(retry.responses, {});
  }
});

import { allocate, poolBanks, maxMarks, earnedMarks, markStats } from "./core";
test("balanced coverage guarantees counts independent of bank size", () => {
  const rows = allocate(
    [
      { unit: "A", available: 100, weight: 1 },
      { unit: "B", available: 100, weight: 1 },
      { unit: "C", available: 100, weight: 1 },
    ],
    20,
  );
  assert.deepEqual(
    rows.map((r) => r.count),
    [7, 7, 6],
  );
});
test("custom weights, excluded units, small sessions and shortages", () => {
  const groups = [
    { unit: "A", available: 100, weight: 1 },
    { unit: "B", available: 100, weight: 2 },
    { unit: "C", available: 100, weight: 1 },
    { unit: "D", available: 0, weight: 0 },
  ];
  assert.deepEqual(
    allocate(groups, 20).map((r) => r.count),
    [5, 10, 5, 0],
  );
  assert.equal(
    allocate(groups, 2).reduce((s, r) => s + r.count, 0),
    2,
  );
  assert.throws(
    () => allocate([{ unit: "A", available: 2, weight: 1 }], 3),
    /only 2/,
  );
  assert.throws(() => allocate([], 20));
  assert.throws(() => allocate(groups, 0));
});
test("multi-bank snapshots namespace duplicate IDs and preserve sources", () => {
  const b = validateBank(sample);
  const pool = poolBanks([
    { ...b, libraryId: "one" },
    { ...b, libraryId: "two" },
  ]);
  assert.equal(new Set(pool.map((q) => q.id)).size, pool.length);
  assert.equal(pool[0].sourceBank, b.title);
  pool[0].text = "changed";
  assert.notEqual(b.questions[0].text, "changed");
});
test("marks validate and partial assessment survives serialization", () => {
  const b = structuredClone(sample);
  b.questions[3].marks = 4;
  b.questions[3].rubric = "One mark per relevant point.";
  const bank = validateBank(b);
  const q = bank.questions[3];
  const a = createAttempt(bank, "exam", [q], false);
  assert.equal(maxMarks(q), 4);
  a.responses[q.id] = { value: ["response"], submitted: true };
  assert.equal(markStats(a).pending, 1);
  a.responses[q.id].earned = 2;
  a.responses[q.id].correct = false;
  const resumed = JSON.parse(JSON.stringify(a));
  assert.deepEqual(markStats(resumed), {
    earned: 2,
    total: 4,
    pending: 0,
    lost: 1,
  });
  assert.equal(
    earnedMarks(q, { value: ["answer"], submitted: true, correct: true }),
    4,
  );
  b.questions[3].marks = -1;
  assert.throws(() => validateBank(b), /marks/);
  b.questions[3].marks = 1.5;
  assert.throws(() => validateBank(b), /marks/);
});

import {
  createPaperAttempt,
  finishAttempt,
  paperGroups,
  hasAnswer,
} from "./core";
import { buildGeneratorPrompt } from "./bank-prompt";
const paperInput = JSON.parse(
  readFileSync(
    new URL("../examples/sample-paper.json", import.meta.url),
    "utf8",
  ),
);
test("fixed paper snapshots order, choices, instructions and shared context", () => {
  const b = validateBank(paperInput);
  const a = createPaperAttempt(b, true, 1000);
  assert.deepEqual(
    a.questions.map((q) => q.id),
    b.questions.map((q) => q.id),
  );
  assert.equal(a.paper?.deadline, new Date(601000).toISOString());
  assert.equal(createPaperAttempt(b, false).paper?.deadline, undefined);
  b.sections![2].context = "changed";
  b.questions[0].text = "changed";
  assert.notEqual(a.paper?.sections[2].context, "changed");
  assert.notEqual(a.questions[0].text, "changed");
  assert.match(a.questions[3].sharedContext!, /Arrival/);
  assert.deepEqual(
    paperGroups(a).map((g) => g.questions.length),
    [2, 1, 1],
  );
});
test("table responses accept repeated model cells and preserve partial entries", () => {
  const b = validateBank(paperInput);
  const q = b.questions[3];
  assert.equal(grade(q, q.answer), undefined);
  const a = createPaperAttempt(b, false);
  a.responses[q.id] = { value: ["2", "", "", ""], submitted: false };
  assert.equal(hasAnswer(a.responses[q.id]), true);
  assert.equal(hasAnswer({ value: ["", "", "", ""], submitted: false }), false);
  const finished = finishAttempt(a);
  assert.equal(finished.responses[q.id].submitted, true);
  assert.equal(finished.responses[q.id].correct, undefined);
  assert.equal(stats(finished).pending, 1);
  assert.equal(stats(finished).unanswered, 3);
  finished.responses[q.id].earned = 3;
  finished.responses[q.id].correct = false;
  assert.equal(markStats(finished).earned, 3);
  const stored = JSON.stringify({ banks: [], attempts: [finished] });
  assert.deepEqual(
    readStore({ getItem: () => stored }).attempts[0],
    JSON.parse(JSON.stringify(finished)),
  );
});
test("paper validation rejects malformed sections, references, time limits and table dimensions", () => {
  for (const edit of [
    (b: any) => (b.sections = null),
    (b: any) => (b.sections = [null]),
    (b: any) => (b.questions[0].sectionId = "missing"),
    (b: any) => delete b.questions[0].sectionId,
    (b: any) => b.questions.push({ ...b.questions[0], id: "again" }),
    (b: any) => (b.durationMinutes = 0),
    (b: any) => (b.questions[3].answer = ["2"]),
    (b: any) => (b.questions[3].table.rows = []),
  ]) {
    const b = structuredClone(paperInput);
    edit(b);
    assert.throws(() => validateBank(b));
  }
});
test("finishing a paper grades objective questions and keeps manual scores pending", () => {
  const a = createPaperAttempt(validateBank(paperInput), false);
  a.responses.tf1 = { value: ["true"], submitted: false };
  a.responses.short = { value: ["valid alternate wording"], submitted: false };
  a.responses.grid = { value: ["", "", "", ""], submitted: false };
  const f = finishAttempt(a);
  assert.equal(f.complete, true);
  assert.equal(f.responses.tf1.correct, true);
  assert.equal(f.responses.short.correct, undefined);
  assert.equal(markStats(f).pending, 1);
  assert.equal(markStats(f).earned, 1);
  assert.equal(stats(f).unanswered, 2);
  assert.deepEqual(finishAttempt(f), f);
  assert.equal(a.complete, false);
});
test("generator includes custom guidelines verbatim and selects paper contract without bank counts", () => {
  const guidelines =
    "Match the reference midterm.\nExclude second half of Topic 18.\nAccept equivalent short answers.";
  const prompt = buildGeneratorPrompt({
    subject: "OS",
    units: "1–18",
    count: 100,
    difficulty: "Hard",
    kind: "paper",
    guidelines,
    duration: 50,
  });
  assert.ok(prompt.includes(guidelines));
  assert.match(prompt, /50 minutes/);
  assert.match(prompt, /sectionId/);
  assert.match(prompt, /answers-may-vary/);
  assert.ok(!prompt.includes("Generate 100 questions per unit"));
  assert.ok(prompt.includes("TIME LIMIT"));
});

test("timer submissions record their reason without changing grading", () => {
  const a = createPaperAttempt(validateBank(paperInput), true, 0);
  const done = finishAttempt(a, "timer");
  assert.equal(done.submissionReason, "timer");
  assert.equal(done.complete, true);
  assert.equal(markStats(done).total, 10);
  assert.equal(a.complete, false);
});

import { withAnswer } from "./core";
test("optional reasoning survives answer changes, submission and storage without affecting grades", () => {
  const b = validateBank(sample);
  const q = b.questions.find((q) => q.type === "single")!;
  const a = createAttempt(b, "practice", [q], false);
  const note = "I used the definition, rather than guessing.";
  a.responses[q.id] = { value: [], submitted: false, reasoning: note };
  assert.equal(hasAnswer(a.responses[q.id]), false);
  assert.equal(stats(a).unanswered, 1);
  a.responses[q.id] = withAnswer(a.responses[q.id], q.answer);
  assert.equal(a.responses[q.id].reasoning, note);
  const done = finishAttempt(a);
  assert.equal(done.responses[q.id].correct, true);
  assert.equal(done.responses[q.id].reasoning, note);
  const restored = readStore({
    getItem: () => JSON.stringify({ banks: [], attempts: [done] }),
  }).attempts[0];
  assert.equal(restored.responses[q.id].reasoning, note);
  assert.equal(markStats(restored).earned, maxMarks(q));
  assert.equal(
    withAnswer({ ...done.responses[q.id], earned: 1 }, []).earned,
    undefined,
  );
  assert.equal(withAnswer(undefined, q.answer).reasoning, undefined);
});

import { splitScores, feedbackState } from "./core";
test("automatic and self-assessed scores remain separate while marking is pending", () => {
  const bank = validateBank(paperInput);
  const a = createPaperAttempt(bank, false);
  for (const q of a.questions)
    a.responses[q.id] = {
      value: q.answer,
      submitted: true,
      correct: q.type === "true-false" ? true : undefined,
    };
  let s = splitScores(a);
  assert.equal(s.automatic.earned, 2);
  assert.equal(s.automatic.total, 2);
  assert.equal(s.manual.pendingQuestions, 2);
  assert.equal(s.manual.scoredMarks, 0);
  assert.equal(s.manual.earned, 0);
  const q = bank.questions[2];
  a.responses[q.id].earned = 3;
  a.responses[q.id].correct = true;
  s = splitScores(a);
  assert.equal(s.manual.earned, 3);
  assert.equal(s.manual.scoredMarks, 3);
  assert.equal(s.manual.pendingQuestions, 1);
  a.responses.grid.earned = 2;
  a.responses.grid.correct = false;
  s = splitScores(a);
  assert.equal(s.manual.earned, 5);
  assert.equal(s.manual.scoredMarks, 8);
  assert.equal(s.manual.pendingQuestions, 0);
  assert.equal(s.automatic.earned, 2);
});
test("feedback distinguishes pending, full, partial, wrong and unanswered outcomes", () => {
  const b = validateBank(paperInput);
  const q = b.questions[3];
  assert.equal(feedbackState(q), "unanswered");
  assert.equal(feedbackState(q, { value: ["A"], submitted: true }), "pending");
  assert.equal(
    feedbackState(q, { value: ["A"], submitted: true, earned: 5 }),
    "correct",
  );
  assert.equal(
    feedbackState(q, { value: ["A"], submitted: true, earned: 2 }),
    "partial",
  );
  assert.equal(
    feedbackState(q, { value: ["A"], submitted: true, earned: 0 }),
    "incorrect",
  );
  const a = createPaperAttempt(b, false);
  assert.equal(splitScores(a).manual.scoredMarks, 8);
  assert.equal(
    splitScores({ ...a, questions: [b.questions[0]] }).manual.total,
    0,
  );
  assert.equal(splitScores({ ...a, questions: [q] }).automatic.total, 0);
});
