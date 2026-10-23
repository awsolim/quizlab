import { useState, useEffect } from "react";
import {
  type Bank,
  type Question,
  type Attempt,
  poolBanks,
  allocate,
  shuffle,
  maxMarks,
} from "./core";
type Props = {
  banks: (Bank & { libraryId: string })[];
  initial: string[];
  start: (
    b: Bank,
    q: Question[],
    mode: Attempt["mode"],
    mixChoices: boolean,
  ) => void;
};
export function Composer({ banks, initial, start }: Props) {
  const [saved] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("quizlab.setup") || "{}");
    } catch {
      return {};
    }
  });
  const [ids, setIds] = useState(initial),
    [count, setCount] = useState(
      Math.min(
        Number.isInteger(saved.count) && saved.count > 0 ? saved.count : 20,
        banks
          .filter((b) => initial.includes(b.libraryId))
          .reduce((n, b) => n + b.questions.length, 0),
      ) || 1,
    ),
    [mode, setMode] = useState<Attempt["mode"]>(
      saved.mode === "exam" ? "exam" : "practice",
    ),
    [difficulty, setDifficulty] = useState(""),
    [custom, setCustom] = useState(false),
    [weights, setWeights] = useState<Record<string, number>>({}),
    [mix, setMix] = useState(saved.mix !== false),
    [mixChoices, setMixChoices] = useState(saved.mixChoices === true);
  useEffect(() => {
    try {
      localStorage.setItem(
        "quizlab.setup",
        JSON.stringify({ count, mode, mix, mixChoices }),
      );
    } catch {}
  }, [count, mode, mix, mixChoices]);
  const pool = poolBanks(banks.filter((b) => ids.includes(b.libraryId)));
  const eligible = pool.filter(
    (q) =>
      !difficulty || q.difficulty?.toLowerCase() === difficulty.toLowerCase(),
  );
  const units = [...new Set(pool.map((q) => q.topic || "Uncategorized"))];
  const groups = units.map((unit) => ({
    unit,
    available: eligible.filter((q) => (q.topic || "Uncategorized") === unit)
      .length,
    weight: weights[unit] === 0 ? 0 : custom ? (weights[unit] ?? 1) : 1,
  }));
  let allocation: ReturnType<typeof allocate> = [],
    error = "";
  try {
    allocation = allocate(groups, count);
  } catch (e) {
    error = (e as Error).message;
  }
  const included = groups.filter((g) => g.weight > 0).length;
  return (
    <>
      <div className="page-heading">
        <h1>Build your session</h1>
        <p>
          A little structure. Better coverage. Choose your material and we’ll
          spread the questions across your units.
        </p>
      </div>
      <section className="setup-sheet">
        <div className="setup-intro">
          <h2>Your study plan</h2>
          <p>
            1. Choose banks
            <br />
            2. Set your coverage
            <br />
            3. Start studying
          </p>
        </div>
        <div className="setup-fields">
          <fieldset>
            <legend>Question banks</legend>
            <p className="helper">
              Combine files from the same course. Matching unit labels are
              grouped together.
            </p>
            {banks.map((b) => (
              <label className="check pool-bank" key={b.libraryId}>
                <input
                  type="checkbox"
                  checked={ids.includes(b.libraryId)}
                  onChange={(e) =>
                    setIds(
                      e.target.checked
                        ? [...ids, b.libraryId]
                        : ids.filter((id) => id !== b.libraryId),
                    )
                  }
                />
                <span>
                  {b.title} <small>· {b.questions.length} questions</small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="mode-options">
            <legend>How do you want to study?</legend>
            {(["practice", "exam"] as const).map((m) => (
              <label
                className={
                  mode === m ? "mode-option selected-mode" : "mode-option"
                }
                key={m}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                />
                <span>
                  <strong>{m === "practice" ? "Practice" : "Exam"}</strong>
                  <small>
                    {m === "practice"
                      ? "Feedback after each answer, with hints when available."
                      : "Edit and skip freely. Answers stay hidden until you finish."}
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="grid2">
            <label>
              Number of questions
              <input
                type="number"
                min="1"
                max={eligible.length || 1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
            <label>
              Difficulty
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="">All difficulties</option>
                {[
                  ...new Set(pool.map((q) => q.difficulty).filter(Boolean)),
                ].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>
          <section className="coverage">
            <h2>Unit coverage</h2>
            <p className="helper">
              Balanced gives each included unit an equal share, regardless of
              bank size. Uncheck a unit to leave it out.
            </p>
            <label>
              Distribution
              <select
                value={custom ? "custom" : "balanced"}
                onChange={(e) => setCustom(e.target.value === "custom")}
              >
                <option value="balanced">Balanced</option>
                <option value="custom">Custom shares</option>
              </select>
            </label>
            {custom && (
              <p className="helper">
                Shares are relative: 1 : 2 : 1 gives the middle unit half the
                questions.
              </p>
            )}
            {groups.map((g) => (
              <div className="coverage-row" key={g.unit}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={g.weight > 0}
                    onChange={(e) =>
                      setWeights({
                        ...weights,
                        [g.unit]: e.target.checked ? 1 : 0,
                      })
                    }
                  />
                  <span>
                    {g.unit}
                    <small>{g.available} available</small>
                  </span>
                </label>
                {custom && (
                  <label>
                    Share
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      value={weights[g.unit] ?? 1}
                      onChange={(e) =>
                        setWeights({
                          ...weights,
                          [g.unit]: Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                  </label>
                )}
                <strong>
                  {allocation.find((a) => a.unit === g.unit)?.count ?? "—"}
                  <small>questions</small>
                </strong>
              </div>
            ))}
          </section>
          <div className="plan-preview" aria-live="polite">
            {error ? (
              <p role="alert">{error}</p>
            ) : (
              <>
                <strong>
                  {count} questions · {included} units
                </strong>
                <p>
                  {allocation
                    .filter((g) => g.weight > 0)
                    .map((g) => g.unit + ": " + g.count)
                    .join(" · ")}
                </p>
                {allocation.some((g) => g.weight > 0 && !g.count) && (
                  <p>
                    Some units receive no questions. Increase the question count
                    to cover every unit.
                  </p>
                )}
              </>
            )}
          </div>
          <details>
            <summary>More options</summary>
            <div className="shuffle-options">
              <label className="check">
                <input
                  type="checkbox"
                  checked={mix}
                  onChange={(e) => setMix(e.target.checked)}
                />
                Shuffle question order
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={mixChoices}
                  onChange={(e) => setMixChoices(e.target.checked)}
                />
                Shuffle answer choices
              </label>
            </div>
          </details>
          <button
            className="primary"
            disabled={!!error}
            onClick={() => {
              let qs = allocation.flatMap((g) =>
                shuffle(
                  eligible.filter(
                    (q) => (q.topic || "Uncategorized") === g.unit,
                  ),
                ).slice(0, g.count),
              );
              if (mix) qs = shuffle(qs);
              else {
                const chosen = new Set(qs.map((q) => q.id));
                qs = eligible.filter((q) => chosen.has(q.id));
              }
              start(
                {
                  schemaVersion: 1,
                  title: banks
                    .filter((b) => ids.includes(b.libraryId))
                    .map((b) => b.title)
                    .join(" + "),
                  questions: qs,
                },
                qs,
                mode,
                mixChoices,
              );
            }}
          >
            Start {mode}
          </button>
          <p className="helper">
            Written responses are self-assessed. Coverage is based on question
            count; marks may vary.
          </p>
        </div>
      </section>
    </>
  );
}
