export type Question = {
  id: string;
  type: "single" | "multiple" | "true-false" | "short" | "table";
  text: string;
  answer: string[];
  explanation: string;
  choices?: { id: string; text: string }[];
  topic?: string;
  difficulty?: string;
  hint?: string;
  marks?: number;
  rubric?: string;
  sourceBank?: string;
  sharedContext?: string;
  sectionId?: string;
  label?: string;
  table?: { rows: string[]; columns: string[] };
};
export type Bank = {
  schemaVersion: 1;
  title: string;
  description?: string;
  questions: Question[];
  kind?: "bank" | "paper";
  instructions?: string;
  durationMinutes?: number;
  sections?: { id: string; title: string; context?: string }[];
};
export type Response = {
  reasoning?: string;
  value: string[];
  submitted: boolean;
  correct?: boolean;
  earned?: number;
};
export type Attempt = {
  id: string;
  title: string;
  mode: "practice" | "exam";
  questions: Question[];
  responses: Record<string, Response>;
  index: number;
  complete: boolean;
  submissionReason?: "timer";
  created: string;
  paper?: {
    instructions?: string;
    sections: NonNullable<Bank["sections"]>;
    deadline?: string;
    durationMinutes?: number;
  };
};
export function validateBank(input: unknown): Bank {
  const errors: string[] = [];
  const b = input as Bank;
  if (!b || typeof b !== "object") throw Error("Bank must be a JSON object.");
  if (b.schemaVersion !== 1) errors.push("schemaVersion: must be 1");
  if (typeof b.title !== "string" || !b.title.trim())
    errors.push("title: required text");
  if (b.description !== undefined && typeof b.description !== "string")
    errors.push("description: must be text");
  if (!Array.isArray(b.questions) || !b.questions.length)
    errors.push("questions: must be a nonempty array");
  const ids = new Set<string>();
  if (Array.isArray(b.questions))
    b.questions.forEach((q, i) => {
      const label = `Question ${i + 1}${q?.id ? ` (${q.id})` : ""}`;
      const err = (field: string, msg: string) =>
        errors.push(`${label} · ${field}: ${msg}`);
      if (!q || typeof q !== "object") {
        err("question", "must be an object");
        return;
      }
      for (const f of ["id", "text", "explanation"] as const)
        if (typeof q[f] !== "string" || !q[f].trim())
          err(f, "required nonempty text");
      if (ids.has(q.id)) err("id", "must be unique");
      ids.add(q.id);
      if (
        q.marks !== undefined &&
        (!Number.isInteger(q.marks) || q.marks < 1 || q.marks > 100)
      )
        err("marks", "use an integer from 1 to 100");
      for (const f of [
        "topic",
        "difficulty",
        "hint",
        "rubric",
        "sectionId",
        "label",
      ] as const)
        if (q[f] !== undefined && (typeof q[f] !== "string" || !q[f]!.trim()))
          err(f, "must be nonempty text");
      if (
        !["single", "multiple", "true-false", "short", "table"].includes(q.type)
      )
        err("type", "use single, multiple, true-false, short, or table");
      if (
        !Array.isArray(q.answer) ||
        !q.answer.length ||
        q.answer.some((a) => typeof a !== "string" || !a.trim()) ||
        (q.type !== "table" && new Set(q.answer).size !== q.answer.length)
      )
        err(
          "answer",
          q.type === "table"
            ? "must be a nonempty array of nonempty strings; repeated table values are allowed"
            : "must be a nonempty array of unique strings",
        );
      else if (q.type === "true-false") {
        if (q.answer.length !== 1 || !["true", "false"].includes(q.answer[0]))
          err("answer", 'use ["true"] or ["false"]');
      } else if (q.type === "table") {
        if (
          !q.table ||
          !Array.isArray(q.table.rows) ||
          !q.table.rows.length ||
          !Array.isArray(q.table.columns) ||
          !q.table.columns.length ||
          [...q.table.rows, ...q.table.columns].some(
            (v) => typeof v !== "string" || !v.trim(),
          )
        )
          err("table", "provide nonempty rows and columns of labels");
        else if (
          q.answer.length !==
          q.table.rows.length * q.table.columns.length
        )
          err(
            "answer",
            `must contain exactly ${q.table.rows.length * q.table.columns.length} entries (${q.table.rows.length} rows × ${q.table.columns.length} columns); received ${q.answer.length}. Use — for an intentionally blank cell`,
          );
      } else if (q.type === "short") {
        if (q.answer.length !== 1) err("answer", "provide one model answer");
      } else if (q.type === "single" || q.type === "multiple") {
        if (!Array.isArray(q.choices) || q.choices.length < 2)
          err("choices", "provide at least two choices");
        else {
          const ci = new Set<string>();
          q.choices.forEach((c) => {
            if (
              !c ||
              typeof c.id !== "string" ||
              !c.id.trim() ||
              typeof c.text !== "string" ||
              !c.text.trim() ||
              ci.has(c.id)
            )
              err("choices", "each needs unique nonempty id and text");
            if (c) ci.add(c.id);
          });
          if (q.answer.some((a) => !ci.has(a)))
            err("answer", "must reference choice IDs");
        }
        if (q.type === "single" && q.answer.length !== 1)
          err("answer", "single requires exactly one answer");
      }
    });
  if (b.kind !== undefined && !["bank", "paper"].includes(b.kind))
    errors.push("kind: use bank or paper");
  if (
    b.instructions !== undefined &&
    (typeof b.instructions !== "string" || !b.instructions.trim())
  )
    errors.push("instructions: provide nonempty text");
  if (
    b.durationMinutes !== undefined &&
    (!Number.isInteger(b.durationMinutes) ||
      b.durationMinutes < 1 ||
      b.durationMinutes > 600)
  )
    errors.push("durationMinutes: use an integer from 1 to 600");
  if (b.sections !== undefined) {
    if (!Array.isArray(b.sections)) errors.push("sections: provide an array");
    else {
      const seen = new Set<string>();
      for (const s of b.sections) {
        if (
          !s ||
          typeof s.id !== "string" ||
          !s.id.trim() ||
          seen.has(s.id) ||
          typeof s.title !== "string" ||
          !s.title.trim() ||
          (s.context !== undefined &&
            (typeof s.context !== "string" || !s.context.trim()))
        )
          errors.push(
            "sections: unique IDs, titles and optional nonempty context required",
          );
        if (s) seen.add(s.id);
      }
      for (const q of Array.isArray(b.questions) ? b.questions : [])
        if (q?.sectionId && !seen.has(q.sectionId))
          errors.push("sectionId: unknown section " + q.sectionId);
    }
  }
  if (b.kind === "paper") {
    if (!Array.isArray(b.sections) || !b.sections.length)
      errors.push("paper: provide sections");
    const seen = new Set<string>();
    let last = "";
    for (const q of Array.isArray(b.questions) ? b.questions : []) {
      if (!q?.sectionId) errors.push("paper: every question needs sectionId");
      else if (q.sectionId !== last) {
        if (seen.has(q.sectionId))
          errors.push(
            "paper: keep each section’s subparts together in question order",
          );
        seen.add(q.sectionId);
        last = q.sectionId;
      }
    }
    for (const s of Array.isArray(b.sections) ? b.sections : [])
      if (s && !seen.has(s.id))
        errors.push("paper: section " + s.id + " has no questions");
  }
  if (errors.length) throw Error(errors.join("\n"));
  return structuredClone(b);
}
export function shuffle<T>(values: T[], rng = Math.random): T[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function grade(q: Question, value: string[]): boolean | undefined {
  return isManual(q)
    ? undefined
    : value.length === q.answer.length &&
        q.answer.every((a) => value.includes(a));
}
export function stats(a: Attempt) {
  let correct = 0,
    incorrect = 0,
    unanswered = 0,
    pending = 0;
  for (const q of a.questions) {
    const r = a.responses[q.id];
    if (!hasAnswer(r)) unanswered++;
    else if (r.correct === undefined) pending++;
    else if (r.correct) correct++;
    else incorrect++;
  }
  return { correct, incorrect, unanswered, pending, total: a.questions.length };
}
export function createAttempt(
  bank: Bank,
  mode: Attempt["mode"],
  questions: Question[],
  mix: boolean,
): Attempt {
  return {
    id: crypto.randomUUID(),
    title: bank.title,
    mode,
    questions: structuredClone(questions).map((q) => ({
      ...q,
      ...(bank.sections?.find((s) => s.id === q.sectionId)?.context
        ? {
            sharedContext: bank.sections.find((s) => s.id === q.sectionId)!
              .context,
          }
        : {}),
      ...(mix && q.choices ? { choices: shuffle(q.choices) } : {}),
    })),
    responses: {},
    index: 0,
    complete: false,
    created: new Date().toISOString(),
  };
}
export type Store = {
  banks: (Bank & { libraryId: string })[];
  attempts: Attempt[];
};
export const storageKey = "quizlab.v1";
export function readStore(storage: Pick<Storage, "getItem">): Store {
  const raw = storage.getItem(storageKey);
  if (!raw) return { banks: [], attempts: [] };
  const s = JSON.parse(raw);
  if (!Array.isArray(s.banks) || !Array.isArray(s.attempts))
    throw Error("Saved library is invalid.");
  return s;
}

export const maxMarks = (q: Question) => q.marks ?? 1;
export function earnedMarks(q: Question, r?: Response): number | undefined {
  if (!hasAnswer(r)) return 0;
  if (r.earned !== undefined)
    return Math.max(0, Math.min(maxMarks(q), r.earned));
  return r.correct === undefined ? undefined : r.correct ? maxMarks(q) : 0;
}
export function markStats(a: Attempt) {
  let earned = 0,
    total = 0,
    pending = 0,
    lost = 0;
  for (const q of a.questions) {
    total += maxMarks(q);
    const n = earnedMarks(q, a.responses[q.id]);
    if (n === undefined) pending++;
    else {
      earned += n;
      if (n < maxMarks(q)) lost++;
    }
  }
  return { earned, total, pending, lost };
}
export type Allocation = {
  unit: string;
  available: number;
  weight: number;
  count: number;
};
export function allocate(
  groups: { unit: string; available: number; weight: number }[],
  total: number,
): Allocation[] {
  const sum = groups.reduce((s, g) => s + g.weight, 0);
  if (
    !Number.isInteger(total) ||
    total < 1 ||
    !sum ||
    groups.some((g) => !Number.isFinite(g.weight) || g.weight < 0)
  )
    throw Error(
      "Choose a question count and at least one unit with a positive share.",
    );
  const rows = groups.map((g) => ({
    ...g,
    count: Math.floor((total * g.weight) / sum),
    fraction: ((total * g.weight) / sum) % 1,
  }));
  let left = total - rows.reduce((s, g) => s + g.count, 0);
  for (const g of [...rows].sort((a, b) => b.fraction - a.fraction)) {
    if (left-- <= 0) break;
    g.count++;
  }
  for (const g of rows)
    if (g.count > g.available)
      throw Error(
        g.unit +
          ": needs " +
          g.count +
          " questions, but only " +
          g.available +
          " match. Lower the count, change shares, or include more questions.",
      );
  return rows.map(({ fraction, ...g }) => g);
}
export function poolBanks(banks: (Bank & { libraryId: string })[]): Question[] {
  return banks.flatMap((b) =>
    b.questions.map((q) => ({
      ...structuredClone(q),
      id: JSON.stringify([b.libraryId, q.id]),
      sourceBank: b.title,
      ...(b.sections?.find((s) => s.id === q.sectionId)?.context
        ? {
            sharedContext: b.sections.find((s) => s.id === q.sectionId)!
              .context,
          }
        : {}),
    })),
  );
}

export const isManual = (q: Question) =>
  q.type === "short" || q.type === "table";
export const hasAnswer = (r?: Response): r is Response =>
  !!r?.value.some((v) => v.trim());
export function finishAttempt(a: Attempt, reason?: "timer"): Attempt {
  return {
    ...a,
    complete: true,
    ...(reason ? { submissionReason: reason } : {}),
    responses: Object.fromEntries(
      a.questions.map((q) => {
        const r = a.responses[q.id] || { value: [], submitted: false };
        return [
          q.id,
          {
            ...r,
            submitted: true,
            correct: hasAnswer(r)
              ? isManual(q)
                ? r.correct
                : grade(q, r.value)
              : undefined,
          },
        ];
      }),
    ),
  };
}
export function createPaperAttempt(
  bank: Bank,
  timed: boolean,
  now = Date.now(),
): Attempt {
  const a = createAttempt(bank, "exam", bank.questions, false);
  return {
    ...a,
    paper: {
      instructions: bank.instructions,
      sections: structuredClone(bank.sections || []),
      ...(timed && bank.durationMinutes
        ? {
            durationMinutes: bank.durationMinutes,
            deadline: new Date(
              now + bank.durationMinutes * 60000,
            ).toISOString(),
          }
        : {}),
    },
  };
}
export function paperGroups(a: Attempt) {
  return [...new Set(a.questions.map((q) => q.sectionId || ""))].map((id) => ({
    id,
    title: a.paper?.sections.find((s) => s.id === id)?.title || "Questions",
    context: a.paper?.sections.find((s) => s.id === id)?.context,
    questions: a.questions.filter((q) => (q.sectionId || "") === id),
  }));
}

export function withAnswer(
  previous: Response | undefined,
  value: string[],
): Response {
  return {
    value,
    submitted: false,
    ...(previous?.reasoning !== undefined
      ? { reasoning: previous.reasoning }
      : {}),
  };
}

export function splitScores(a: Attempt) {
  const automatic = { earned: 0, total: 0, questions: 0 };
  const manual = {
    earned: 0,
    total: 0,
    questions: 0,
    scoredQuestions: 0,
    scoredMarks: 0,
    pendingQuestions: 0,
    pendingMarks: 0,
  };
  for (const q of a.questions) {
    const max = maxMarks(q);
    const earned = earnedMarks(q, a.responses[q.id]);
    if (!isManual(q)) {
      automatic.questions++;
      automatic.total += max;
      automatic.earned += earned ?? 0;
    } else {
      manual.questions++;
      manual.total += max;
      if (earned === undefined) {
        manual.pendingQuestions++;
        manual.pendingMarks += max;
      } else {
        manual.earned += earned;
        manual.scoredMarks += max;
        manual.scoredQuestions++;
      }
    }
  }
  return { automatic, manual };
}
export function feedbackState(
  q: Question,
  response?: Response,
): "correct" | "incorrect" | "partial" | "pending" | "unanswered" {
  if (!hasAnswer(response)) return "unanswered";
  const earned = earnedMarks(q, response);
  return earned === undefined
    ? "pending"
    : earned === maxMarks(q)
      ? "correct"
      : earned > 0
        ? "partial"
        : "incorrect";
}
