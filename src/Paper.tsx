import { useEffect, useState } from "react";
import {
  type Bank,
  type Attempt,
  type Question,
  hasAnswer,
  maxMarks,
  finishAttempt,
  paperGroups,
  isManual,
  withAnswer,
} from "./core";
import { Md, TableAnswer, ReasoningInput } from "./Content";
export function PaperSetup({
  bank,
  start,
  saveForLater,
}: {
  bank: Bank;
  start: (timed: boolean) => void;
  saveForLater: () => void;
}) {
  const [timed, setTimed] = useState(!!bank.durationMinutes);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Fixed practice paper</p>
        <h1>{bank.title}</h1>
        <p>
          Take the complete paper in its original order. Subparts stay together
          and answers remain hidden until submission.
        </p>
      </div>
      <section className="paper-intro">
        <div className="paper-summary">
          <strong>{bank.sections?.length || 1} main questions</strong>
          <strong>
            {bank.questions.reduce((n, q) => n + maxMarks(q), 0)} marks
          </strong>
          {bank.durationMinutes && (
            <strong>{bank.durationMinutes} minutes</strong>
          )}
        </div>
        {bank.instructions && (
          <div className="paper-instructions">
            <h2>Instructions</h2>
            <Md text={bank.instructions} />
          </div>
        )}
        <h2>Paper outline</h2>
        <ol className="paper-outline">
          {(bank.sections || []).map((s) => (
            <li key={s.id}>
              <span>{s.title}</span>
              <strong>
                {bank.questions
                  .filter((q) => q.sectionId === s.id)
                  .reduce((n, q) => n + maxMarks(q), 0)}{" "}
                marks
              </strong>
            </li>
          ))}
        </ol>
        {bank.durationMinutes && (
          <>
            <label className="check">
              <input
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
              />
              Use the {bank.durationMinutes}-minute timer
            </label>
            <p className="helper">
              The timer continues if you leave or reload. At zero, the paper
              submits automatically. Turn it off for untimed practice.
            </p>
          </>
        )}
        <div className="actions paper-start-actions">
          <button className="primary" onClick={() => start(timed)}>
            Start paper
          </button>
          <button onClick={saveForLater}>Save for later</button>
        </div>
        <p className="helper">
          Your paper is saved in the library. The timer starts only when you
          start the paper.
        </p>
      </section>
    </>
  );
}
export function Paper({
  a,
  update,
}: {
  a: Attempt;
  update: (a: Attempt) => unknown;
}) {
  const [now, setNow] = useState(Date.now());
  const [confirming, setConfirming] = useState(false);
  const groups = paperGroups(a);
  const index = Math.min(a.index, groups.length - 1);
  const group = groups[index];
  const deadline = a.paper?.deadline ? Date.parse(a.paper.deadline) : undefined;
  const remaining =
    deadline === undefined
      ? undefined
      : Math.max(0, Math.ceil((deadline - now) / 1000));
  useEffect(() => {
    if (deadline === undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [deadline]);
  useEffect(() => {
    if (deadline !== undefined && Date.now() >= deadline && !a.complete)
      update(finishAttempt(a, "timer"));
  }, [now, deadline, a, update]);
  const setValue = (q: Question, value: string[]) => {
    if (deadline !== undefined && Date.now() >= deadline) {
      update(finishAttempt(a, "timer"));
      return;
    }
    update({
      ...a,
      responses: {
        ...a.responses,
        [q.id]: withAnswer(a.responses[q.id], value),
      },
    });
  };
  const answered = a.questions.filter((q) =>
    hasAnswer(a.responses[q.id]),
  ).length;
  return (
    <div className="paper-workspace">
      <div className="quiz-heading">
        <p className="eyebrow">Practice paper</p>
        <h1>{a.title}</h1>
        <div className="paper-status">
          <span>
            {answered}/{a.questions.length} parts answered
          </span>
          {remaining !== undefined && (
            <strong
              className={remaining <= 60 ? "incorrect" : ""}
              role="timer"
              aria-label="Time remaining"
            >
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")} remaining
            </strong>
          )}
        </div>
      </div>
      {a.paper?.instructions && (
        <details>
          <summary>Paper instructions</summary>
          <Md text={a.paper.instructions} />
        </details>
      )}
      <nav className="paper-nav" aria-label="Main questions">
        {groups.map((g, i) => (
          <button
            key={g.id}
            aria-current={index === i ? "step" : undefined}
            onClick={() => update({ ...a, index: i })}
          >
            {g.title}
            <small>
              {g.questions.filter((q) => hasAnswer(a.responses[q.id])).length}/
              {g.questions.length} answered
            </small>
          </button>
        ))}
      </nav>
      <section className="question-sheet">
        <div className="section-heading">
          <h2>{group.title}</h2>
          <strong>
            {group.questions.reduce((n, q) => n + maxMarks(q), 0)} marks
          </strong>
        </div>
        {group.context && (
          <div className="shared-context">
            <Md text={group.context} />
          </div>
        )}
        {group.questions.map((q, i) => {
          const r = a.responses[q.id] || { value: [], submitted: false };
          return (
            <article className="paper-part" key={q.id}>
              <div className="review-heading">
                <h3>{q.label || "Part " + (i + 1)}</h3>
                <span>{maxMarks(q)} marks</span>
              </div>
              <Md text={q.text} />
              {q.type === "table" ? (
                <TableAnswer
                  q={q}
                  value={r.value}
                  onChange={(v) => setValue(q, v)}
                />
              ) : q.type === "short" ? (
                <textarea
                  aria-label={(q.label || "Part " + (i + 1)) + " answer"}
                  value={r.value[0] || ""}
                  placeholder="Your response…"
                  onChange={(e) =>
                    setValue(q, e.target.value.trim() ? [e.target.value] : [])
                  }
                />
              ) : (
                <fieldset>
                  <legend className="sr-only">
                    {q.label || "Part " + (i + 1)}
                  </legend>
                  {(q.type === "true-false"
                    ? [
                        { id: "true", text: "True" },
                        { id: "false", text: "False" },
                      ]
                    : q.choices || []
                  ).map((c) => (
                    <label className="choice" key={c.id}>
                      <input
                        type={q.type === "multiple" ? "checkbox" : "radio"}
                        name={q.id}
                        checked={r.value.includes(c.id)}
                        onChange={() =>
                          setValue(
                            q,
                            q.type === "multiple"
                              ? r.value.includes(c.id)
                                ? r.value.filter((v) => v !== c.id)
                                : [...r.value, c.id]
                              : [c.id],
                          )
                        }
                      />
                      <Md text={c.text} />
                    </label>
                  ))}
                </fieldset>
              )}
              {!isManual(q) && (
                <ReasoningInput
                  key={q.id}
                  label={(q.label || "Part " + (i + 1)) + " reasoning"}
                  value={r.reasoning || ""}
                  onChange={(reasoning) => {
                    if (deadline !== undefined && Date.now() >= deadline) {
                      update(finishAttempt(a, "timer"));
                      return;
                    }
                    update({
                      ...a,
                      responses: {
                        ...a.responses,
                        [q.id]: { ...r, reasoning },
                      },
                    });
                  }}
                />
              )}
            </article>
          );
        })}
        <div className="quiz-bottom">
          <div className="actions">
            <button
              disabled={index === 0}
              onClick={() => update({ ...a, index: index - 1 })}
            >
              Previous question
            </button>
            <button
              disabled={index === groups.length - 1}
              onClick={() => update({ ...a, index: index + 1 })}
            >
              Next question
            </button>
            <button className="primary" onClick={() => setConfirming(true)}>
              Submit paper
            </button>
          </div>
        </div>
        {confirming && (
          <section
            className="submission-confirmation"
            aria-labelledby="submit-heading"
            role="region"
          >
            <h3 id="submit-heading">Ready to submit?</h3>
            <p>
              {a.questions.length - answered} parts are unanswered. Your
              responses will be locked and the marking guide revealed.
            </p>
            <div className="actions">
              <button onClick={() => setConfirming(false)}>Keep working</button>
              <button
                className="primary"
                onClick={() => update(finishAttempt(a))}
              >
                Confirm submission
              </button>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
