import { hasNewBuild } from "./version";
import React, { useEffect, useState } from "react";
import {
  Md,
  Feedback,
  Marking,
  TableAnswer,
  choices,
  ReasoningInput,
  ReasoningReview,
} from "./Content";
import { Paper, PaperSetup } from "./Paper";
import {
  isManual,
  hasAnswer,
  createPaperAttempt,
  finishAttempt,
  withAnswer,
} from "./core";

import {
  type Bank,
  type Question,
  type Attempt,
  type Store,
  validateBank,
  grade,
  stats,
  createAttempt,
  readStore,
  storageKey,
} from "./core";
import { Composer } from "./Composer";
import { Generator } from "./Generator";
import { maxMarks, earnedMarks, markStats, splitScores } from "./core";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function App({ initialError = "" }: { initialError?: string }) {
  const [startupError] = useState(() => {
    try {
      readStore(localStorage);
      return "";
    } catch {
      return "Saved data could not be read. Reload after recovering your browser storage; changes are disabled to protect it.";
    }
  });
  const [store, setStore] = useState<Store>(() => {
    try {
      return readStore(localStorage);
    } catch {
      return { banks: [], attempts: [] };
    }
  });
  const [error, setError] = useState(initialError);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (await hasNewBuild()) if (mounted) setUpdateAvailable(true);
    };
    void check();
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 60000);
    return () => {
      mounted = false;
      window.removeEventListener("focus", check);
      window.clearInterval(timer);
    };
  }, []);
  const [paperSelected, setPaperSelected] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<"library" | "sessions">("library");
  const [dark, setDark] = useState(
    () => localStorage.getItem("quizlab.theme") === "dark",
  );

  const mode: Attempt["mode"] = "practice";

  const mixChoices = false;

  const commit = (next: Store) => {
    if (startupError) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStore(next);
      setError("");
      return true;
    } catch {
      setError(
        "Could not save to browser storage. Your latest change was not saved. Free storage and try again.",
      );
      return false;
    }
  };
  const update = (attempt: Attempt) =>
    commit({
      ...store,
      attempts: store.attempts.map((a) => (a.id === attempt.id ? attempt : a)),
    });
  const attempt = store.attempts.find((a) => a.id === active);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [
    active,
    selected,
    view,
    composing,
    generating,
    attempt?.index,
    attempt?.complete,
  ]);
  const unfinished = store.attempts.filter((a) => !a.complete);

  const navigate = (next: "library" | "sessions") => {
    setView(next);
    setPaperSelected(null);
    setActive(null);
    setSelected(null);
    setComposing(false);
    setGenerating(false);
  };
  const selectBank = (id: string) => {
    setSelected(id);
    setPaperSelected(null);
    setActive(null);
    setView("library");
    setComposing(true);
    setGenerating(false);
  };
  const start = (
    b: Bank,
    questions: Question[],
    nextMode: Attempt["mode"] = mode,
    shuffleChoices = mixChoices,
  ) => {
    if (!questions.length) return;
    const next = createAttempt(b, nextMode, questions, shuffleChoices);
    if (commit({ ...store, attempts: [next, ...store.attempts] }))
      setActive(next.id);
  };
  const retry = (a: Attempt) =>
    start(
      { schemaVersion: 1, title: a.title, questions: a.questions },
      a.questions.filter((q) => {
        const n = earnedMarks(q, a.responses[q.id]);
        return n !== undefined && n < maxMarks(q);
      }),
      "practice",
    );
  async function importFile(file: File) {
    try {
      if (await hasNewBuild()) {
        setUpdateAvailable(true);
        setError(
          "Reload QuizLab to update before importing this file. Your saved banks and sessions will remain.",
        );
        return;
      }
      const b = validateBank(JSON.parse(await file.text()));
      const imported = { ...b, libraryId: crypto.randomUUID() };
      if (commit({ ...store, banks: [...store.banks, imported] })) {
        navigate("library");
        if (imported.kind === "paper") setPaperSelected(imported.libraryId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
  }
  const upload = (
    <label className="button primary upload">
      Import a bank or paper
      <input
        aria-label="Import a JSON bank or paper"
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          if (e.target.files?.[0]) void importFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
  const sessions = (attempts: Attempt[]) => (
    <div className="session-list">
      {attempts.map((a) => {
        const score = markStats(a);
        return (
          <article className="session-row" key={a.id}>
            <div className="session-name">
              <h3>{a.title}</h3>
              <p>
                {formatDate(a.created)}
                <span className="mode-name">
                  {a.mode === "exam" ? "Exam" : "Practice"}
                </span>
              </p>
            </div>
            <div className="session-state">
              {a.complete ? (
                <>
                  <strong>
                    {score.earned}/{score.total} marks
                  </strong>
                  <span>
                    {score.pending ? "Assessment pending" : "Completed"}
                  </span>
                </>
              ) : (
                <>
                  <strong>
                    {
                      Object.values(a.responses).filter(
                        (r) => r.value.length > 0,
                      ).length
                    }
                    /{a.questions.length}
                  </strong>
                  <span>Answered</span>
                </>
              )}
            </div>
            <button className="text-button" onClick={() => setActive(a.id)}>
              {a.complete ? "Review results" : "Resume session"}
            </button>
          </article>
        );
      })}
    </div>
  );

  return (
    <div className={`app${dark ? " dark" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          aria-label="QuizLab home"
          onClick={() => navigate("library")}
        >
          QuizLab
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            aria-current={!attempt && view === "library" ? "page" : undefined}
            onClick={() => navigate("library")}
          >
            Question library<span>{store.banks.length}</span>
          </button>
          <button
            aria-current={!attempt && view === "sessions" ? "page" : undefined}
            onClick={() => navigate("sessions")}
          >
            Saved sessions<span>{store.attempts.length}</span>
          </button>
          {attempt && (
            <div className="current-session" aria-current="page">
              {attempt.complete
                ? "Results & review"
                : `${attempt.mode === "exam" ? "Exam" : "Practice"} in progress`}
            </div>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="theme-button"
            onClick={() => {
              setDark(!dark);
              localStorage.setItem("quizlab.theme", !dark ? "dark" : "light");
            }}
          >
            {dark ? "Use light theme" : "Use dark theme"}
          </button>
          <p>
            No account needed. Banks and sessions stay in this browser. Keep
            your original files; clearing browser data removes saved work.
          </p>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1}>
        {updateAvailable && (
          <div className="update-notice" role="status">
            <p>
              A newer version of QuizLab is available. Reload to use the latest
              importer and question formats. Saved banks and sessions will
              remain.
            </p>
            <button onClick={() => window.location.reload()}>
              Reload QuizLab
            </button>
          </div>
        )}
        {(error || startupError) && (
          <div role="alert" className="error">
            <p>{startupError || error}</p>
            {!startupError && (
              <button onClick={() => setError("")}>Dismiss</button>
            )}
          </div>
        )}
        {attempt ? (
          <>
            <div className="page-return">
              <button
                className="text-button"
                onClick={() => navigate("sessions")}
              >
                Back to saved sessions
              </button>
            </div>
            {attempt.complete ? (
              <Results
                a={attempt}
                update={update}
                retry={retry}
                finishReview={() => navigate("sessions")}
              />
            ) : attempt.paper ? (
              <Paper a={attempt} update={update} />
            ) : (
              <Quiz a={attempt} update={update} />
            )}
          </>
        ) : paperSelected ? (
          <>
            <div className="page-return">
              <button
                className="text-button"
                onClick={() => navigate("library")}
              >
                Back to library
              </button>
            </div>
            <PaperSetup
              saveForLater={() => navigate("library")}
              bank={store.banks.find((b) => b.libraryId === paperSelected)!}
              start={(timed) => {
                const next = createPaperAttempt(
                  store.banks.find((b) => b.libraryId === paperSelected)!,
                  timed,
                );
                if (commit({ ...store, attempts: [next, ...store.attempts] }))
                  setActive(next.id);
              }}
            />
          </>
        ) : generating ? (
          <>
            <div className="page-return">
              <button
                className="text-button"
                onClick={() => navigate("library")}
              >
                Back to library
              </button>
            </div>
            <Generator />
          </>
        ) : composing ? (
          <>
            <div className="page-return">
              <button
                className="text-button"
                onClick={() => navigate("library")}
              >
                Back to library
              </button>
            </div>
            <Composer
              banks={store.banks.filter((b) => b.kind !== "paper")}
              initial={
                selected
                  ? [selected]
                  : store.banks
                      .filter((b) => b.kind !== "paper")
                      .map((b) => b.libraryId)
              }
              start={start}
            />
          </>
        ) : view === "sessions" ? (
          <>
            <div className="page-heading">
              <h1>Saved sessions</h1>
            </div>
            {store.attempts.length ? (
              sessions(store.attempts)
            ) : (
              <div className="empty-sessions">
                <h2>No sessions yet.</h2>
                <p>Choose a question bank to start your first quiz.</p>
                <button onClick={() => navigate("library")}>
                  Open question library
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="page-heading library-heading">
              <div>
                <h1>
                  Make every
                  <br />
                  session count.
                </h1>
                <p>
                  Turn your course material into focused practice and balanced
                  mock exams. Your questions. Your pace.
                </p>
              </div>
            </div>
            <div className="library-toolbar">
              <button
                className="primary"
                disabled={!store.banks.some((b) => b.kind !== "paper")}
                onClick={() => {
                  setSelected(null);
                  setComposing(true);
                }}
              >
                Build a session
              </button>
              {upload}
              <button onClick={() => setGenerating(true)}>
                Create a bank or paper
              </button>
            </div>
            <section className="welcome-strip">
              <div>
                <strong>Choose your material</strong>
                <p>
                  Import banks from your sources or use our copyable AI prompt.
                </p>
              </div>
              <div>
                <strong>Cover what matters</strong>
                <p>
                  Balance units or give extra attention to the ones you find
                  difficult.
                </p>
              </div>
              <div>
                <strong>Learn from each attempt</strong>
                <p>
                  Review explanations, award written-answer marks, and retry
                  missed questions.
                </p>
              </div>
            </section>
            <div className="section-heading">
              <h2>Your study material</h2>
              <span>{store.banks.length} imported</span>
            </div>
            <div className="library-layout">
              <section className="library-index" aria-label="Question banks">
                {store.banks.length ? (
                  <div className="bank-list">
                    <div className="bank-column-head" aria-hidden="true">
                      <span>Subject</span>
                      <span>Questions</span>
                      <span>Actions</span>
                    </div>
                    {store.banks.map((b) => {
                      const topics = [
                        ...new Set(
                          b.questions.map((q) => q.topic).filter(Boolean),
                        ),
                      ];
                      return (
                        <article className="bank-row" key={b.libraryId}>
                          <div className="bank-details">
                            <h3>{b.title}</h3>
                            {b.kind === "paper" && (
                              <p className="paper-badge">
                                Practice paper ·{" "}
                                {b.questions.reduce(
                                  (n, q) => n + maxMarks(q),
                                  0,
                                )}{" "}
                                marks
                                {b.durationMinutes
                                  ? " · " + b.durationMinutes + " minutes"
                                  : ""}
                              </p>
                            )}
                            {b.description && <p>{b.description}</p>}
                            {topics.length > 0 && (
                              <p className="bank-topics">{topics.join(", ")}</p>
                            )}
                          </div>
                          <div className="bank-count">
                            <span className="sr-only">Questions: </span>
                            {b.questions.length}
                          </div>
                          <div className="bank-actions">
                            <button
                              className="study-button"
                              onClick={() =>
                                b.kind === "paper"
                                  ? setPaperSelected(b.libraryId)
                                  : selectBank(b.libraryId)
                              }
                            >
                              {b.kind === "paper" ? "Take paper" : "Study"}
                            </button>
                            <button
                              className="delete-button"
                              aria-label={`Delete ${b.title}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete “${b.title}” from your library? Saved attempts will remain.`,
                                  )
                                )
                                  commit({
                                    ...store,
                                    banks: store.banks.filter(
                                      (x) => x.libraryId !== b.libraryId,
                                    ),
                                  });
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-library">
                    <h2>No banks or papers yet.</h2>
                    <p>
                      Start with “Create a bank or paper” to get a prompt for
                      your preferred AI tool, then import its JSON output.
                      Already have a compatible JSON file? Import it above.
                    </p>
                  </div>
                )}
              </section>
            </div>
            {unfinished.length > 0 && (
              <section className="unfinished">
                <div className="section-heading">
                  <h2>Continue studying</h2>
                </div>
                {sessions(unfinished.slice(0, 3))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Quiz({ a, update }: { a: Attempt; update: (a: Attempt) => void }) {
  const q = a.questions[a.index];
  const r = a.responses[q.id] || { value: [], submitted: false };
  const locked = a.mode === "practice" && r.submitted;
  const canNext = locked && (!isManual(q) || earnedMarks(q, r) !== undefined);
  const setValue = (value: string[]) =>
    update({
      ...a,
      responses: { ...a.responses, [q.id]: withAnswer(r, value) },
    });
  const submit = () =>
    update({
      ...a,
      responses: {
        ...a.responses,
        [q.id]: { ...r, submitted: true, correct: grade(q, r.value) },
      },
    });
  const finish = () => {
    if (
      a.mode === "exam" &&
      !confirm(
        "Submit this exam? Answers will be locked, including unanswered questions.",
      )
    )
      return;
    update(finishAttempt(a));
  };
  return (
    <div className="quiz-workspace">
      <div className="quiz-heading">
        <h1>{a.title}</h1>
        <div className="quiz-context">
          <span>{a.mode === "practice" ? "Practice" : "Exam"}</span>
          <span>
            Question {a.index + 1} of {a.questions.length}
          </span>
        </div>
        <progress
          aria-label="Quiz progress"
          value={a.index + 1}
          max={a.questions.length}
        />
      </div>
      <section className="question-sheet">
        <div className="question-meta">
          <span>
            {q.type === "multiple"
              ? "Select all correct answers"
              : isManual(q)
                ? "Write your answer"
                : "Select one answer"}
          </span>
          <span>
            {[q.topic, q.difficulty, maxMarks(q) + " marks"]
              .filter(Boolean)
              .join(" / ")}
          </span>
        </div>
        {q.sharedContext && (
          <div className="shared-context">
            <Md text={q.sharedContext} />
          </div>
        )}
        <div className="question-text">
          <Md text={q.text} />
        </div>
        <fieldset disabled={locked}>
          <legend className="sr-only">Your answer</legend>
          {q.type === "table" ? (
            <TableAnswer
              q={q}
              value={r.value}
              onChange={setValue}
              readOnly={locked}
            />
          ) : isManual(q) ? (
            <textarea
              aria-label="Your written answer"
              placeholder="Your response…"
              rows={6}
              value={r.value[0] || ""}
              onChange={(e) =>
                setValue(e.target.value.trim() ? [e.target.value] : [])
              }
            />
          ) : (
            choices(q).map((c) => (
              <label
                className={`choice${r.value.includes(c.id) ? " chosen" : ""}`}
                key={c.id}
              >
                <input
                  type={q.type === "multiple" ? "checkbox" : "radio"}
                  name={q.id}
                  checked={r.value.includes(c.id)}
                  onChange={() =>
                    setValue(
                      q.type === "multiple"
                        ? r.value.includes(c.id)
                          ? r.value.filter((x) => x !== c.id)
                          : [...r.value, c.id]
                        : [c.id],
                    )
                  }
                />
                <div>
                  <Md text={c.text} />
                </div>
              </label>
            ))
          )}
        </fieldset>
        {!isManual(q) && (
          <ReasoningInput
            key={q.id}
            value={r.reasoning || ""}
            disabled={locked}
            onChange={(reasoning) =>
              update({
                ...a,
                responses: { ...a.responses, [q.id]: { ...r, reasoning } },
              })
            }
          />
        )}
        {a.mode === "practice" && !locked && q.hint && (
          <details>
            <summary>Show hint</summary>
            <Md text={q.hint} />
          </details>
        )}
        {locked && (
          <>
            <h3
              className={`answer-status ${r.correct === false ? "incorrect" : "correct"}`}
              role="status"
            >
              {r.correct === undefined
                ? "Compare your response"
                : r.correct
                  ? "Full marks"
                  : isManual(q)
                    ? earnedMarks(q, r) + " / " + maxMarks(q) + " marks"
                    : "Incorrect"}
            </h3>
            <Feedback q={q} response={r} />
            {isManual(q) && (
              <Marking
                q={q}
                r={r}
                onMark={(earned) =>
                  update({
                    ...a,
                    responses: {
                      ...a.responses,
                      [q.id]: { ...r, earned, correct: earned === maxMarks(q) },
                    },
                  })
                }
              />
            )}
          </>
        )}
        <div className="quiz-bottom">
          {a.mode === "exam" && <p>Answers stay editable until you finish.</p>}
          <div className="actions">
            {a.mode === "practice" ? (
              <>
                {!locked ? (
                  <button
                    className="primary"
                    disabled={!hasAnswer(r)}
                    onClick={submit}
                  >
                    Submit answer
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={!canNext}
                    onClick={() =>
                      a.index === a.questions.length - 1
                        ? finish()
                        : update({ ...a, index: a.index + 1 })
                    }
                  >
                    {a.index === a.questions.length - 1
                      ? "View results"
                      : "Next question"}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  disabled={a.index === 0}
                  onClick={() => update({ ...a, index: a.index - 1 })}
                >
                  Previous
                </button>
                <button
                  disabled={a.index === a.questions.length - 1}
                  onClick={() => update({ ...a, index: a.index + 1 })}
                >
                  Next
                </button>
                <button className="primary" onClick={finish}>
                  Finish exam
                </button>
              </>
            )}
          </div>
        </div>
      </section>
      {a.mode === "exam" && (
        <nav className="question-nav" aria-label="Question navigation">
          {a.questions.map((q, i) => (
            <button
              aria-label={`Question ${i + 1}${hasAnswer(a.responses[q.id]) ? ", answered" : ", unanswered"}`}
              aria-current={i === a.index ? "step" : undefined}
              className={i === a.index ? "primary" : ""}
              key={q.id}
              onClick={() => update({ ...a, index: i })}
            >
              {i + 1}
              <span
                className={
                  hasAnswer(a.responses[q.id])
                    ? "answered-mark"
                    : "unanswered-mark"
                }
              />
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function Results({
  a,
  update,
  retry,
  finishReview,
}: {
  a: Attempt;
  update: (a: Attempt) => void;
  retry: (a: Attempt) => void;
  finishReview: () => void;
}) {
  const s = stats(a);
  const marks = markStats(a);
  const scores = splitScores(a);
  const [exitAt, setExitAt] = useState<"top" | "bottom" | null>(null);
  const reviewActions = (position: "top" | "bottom") => (
    <div className="review-exit">
      <button
        onClick={() =>
          scores.manual.pendingQuestions ? setExitAt(position) : finishReview()
        }
      >
        Finish review
      </button>
      {exitAt === position && scores.manual.pendingQuestions > 0 && (
        <div
          className="review-exit-prompt"
          role="region"
          aria-label="Unfinished assessment"
        >
          <strong>
            {scores.manual.pendingQuestions} responses still need marking.
          </strong>
          <p>
            Your progress is saved. You can return from Saved sessions to finish
            assessing them.
          </p>
          <div className="actions">
            <button onClick={() => setExitAt(null)}>Continue review</button>
            <button onClick={finishReview}>Save and exit review</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="results-workspace">
      <div className="page-heading">
        <h1>Your results</h1>
        {a.submissionReason === "timer" && (
          <p role="status">
            Time expired. Your saved responses were submitted automatically.
          </p>
        )}
        <p>{a.title}</p>
      </div>
      {reviewActions("top")}
      {scores.manual.pendingQuestions > 0 && (
        <div className="assessment-banner" role="status">
          <strong>Assessment incomplete</strong>
          <p>
            {scores.manual.pendingQuestions} written or table responses still
            need marking. The automatic score does not include them.
          </p>
        </div>
      )}
      <section className="results-summary" aria-label="Score summary">
        <div className="split-scores">
          <section
            className="score-card"
            aria-label="Automatically marked score"
          >
            <h2>Automatically marked</h2>
            <strong>
              {scores.automatic.total
                ? Math.round(
                    (scores.automatic.earned / scores.automatic.total) * 100,
                  ) + "%"
                : "—"}
            </strong>
            <p>
              {scores.automatic.total
                ? scores.automatic.earned +
                  " / " +
                  scores.automatic.total +
                  " marks"
                : "No automatically marked questions"}
            </p>
          </section>
          <section
            className="score-card manual-score"
            aria-label="Self-assessed score"
          >
            <h2>Self-assessed</h2>
            <strong>
              {scores.manual.scoredMarks
                ? Math.round(
                    (scores.manual.earned / scores.manual.scoredMarks) * 100,
                  ) + "%"
                : "—"}
            </strong>
            <p>
              {!scores.manual.questions
                ? "No self-assessed questions"
                : scores.manual.scoredMarks
                  ? scores.manual.earned +
                    " / " +
                    scores.manual.scoredMarks +
                    " scored marks"
                  : "Not assessed yet"}
            </p>
            {scores.manual.questions > 0 && (
              <>
                <p>
                  {scores.manual.scoredQuestions} / {scores.manual.questions}{" "}
                  questions scored
                </p>
                <p className="score-status">
                  {scores.manual.pendingQuestions
                    ? scores.manual.pendingQuestions +
                      " still to assess · provisional"
                    : "Assessment complete"}
                </p>
                {scores.manual.pendingQuestions > 0 && (
                  <small>
                    Percentage covers scored marks only, out of{" "}
                    {scores.manual.total} available. Unanswered questions score
                    zero.
                  </small>
                )}
              </>
            )}
          </section>
        </div>
        <div className="score-details">
          <dl>
            <div>
              <dt>Below full marks</dt>
              <dd>{marks.lost}</dd>
            </div>
            <div>
              <dt>Unanswered</dt>
              <dd>{s.unanswered}</dd>
            </div>
            <div>
              <dt>To self-assess</dt>
              <dd>{s.pending}</dd>
            </div>
          </dl>
          {s.pending > 0 && (
            <p className="assessment-notice">
              Assess your written and table responses below. Each score updates
              as you mark.
            </p>
          )}
          <button
            className="primary"
            disabled={!marks.lost}
            onClick={() => retry(a)}
          >
            Practise missed marks
          </button>
        </div>
      </section>
      {a.questions.some((q) => q.topic) && (
        <section className="topic-results">
          <h2>By topic</h2>
          <div>
            {[
              ...new Set(a.questions.map((q) => q.topic || "Uncategorized")),
            ].map((t) => {
              const qs = a.questions.filter(
                (q) => (q.topic || "Uncategorized") === t,
              );
              const n = qs.reduce(
                (sum, q) => sum + (earnedMarks(q, a.responses[q.id]) ?? 0),
                0,
              );
              const total = qs.reduce((sum, q) => sum + maxMarks(q), 0);
              return (
                <div className="topic-row" key={t}>
                  <span>{t}</span>
                  <meter
                    min={0}
                    max={total}
                    value={n}
                    aria-label={`${t}: ${n} of ${total} marks`}
                  />
                  <strong>
                    {n}/{total}
                  </strong>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <h2 className="review-title">Answer review</h2>
      {a.questions.map((q, i) => {
        const r = a.responses[q.id];
        const status = !hasAnswer(r)
          ? "Unanswered"
          : r.correct === undefined
            ? "Self-assessment needed"
            : r.correct
              ? "Full marks"
              : "Below full marks";
        return (
          <section className="review-sheet" key={q.id}>
            <div className="review-heading">
              <h3>
                {q.label || "Question " + (i + 1)} ·{" "}
                {earnedMarks(q, r) ?? "Pending"}/{maxMarks(q)} marks
              </h3>
              <span
                className={
                  !hasAnswer(r) || r.correct === undefined
                    ? "pending-status"
                    : r.correct
                      ? "correct"
                      : "incorrect"
                }
              >
                {status}
              </span>
            </div>
            {q.sourceBank && (
              <p className="helper">
                {q.sourceBank} · {q.topic || "Uncategorized"}
              </p>
            )}
            {!a.paper && q.sharedContext && (
              <div className="shared-context">
                <Md text={q.sharedContext} />
              </div>
            )}
            {a.paper && q.sectionId && (
              <div className="review-context">
                <h4>
                  {a.paper.sections.find((s) => s.id === q.sectionId)?.title}
                </h4>
                <Md
                  text={
                    a.paper.sections.find((s) => s.id === q.sectionId)
                      ?.context || ""
                  }
                />
              </div>
            )}
            <div className="review-question">
              <Md text={q.text} />
            </div>
            <div className="submitted-answer">
              <h4>Your answer</h4>
              {q.type === "table" ? (
                <TableAnswer q={q} value={r?.value || []} readOnly />
              ) : (
                <Md
                  text={
                    hasAnswer(r)
                      ? isManual(q)
                        ? r.value.join("")
                        : r.value
                            .map((id) =>
                              q.type === "true-false"
                                ? id
                                : q.choices?.find((c) => c.id === id)?.text ||
                                  id,
                            )
                            .join("; ")
                      : "No answer submitted"
                  }
                />
              )}
            </div>
            <ReasoningReview value={r?.reasoning} />
            <Feedback q={q} response={r} />
            {isManual(q) && !!hasAnswer(r) && (
              <Marking
                q={q}
                r={r}
                onMark={(earned) =>
                  update({
                    ...a,
                    responses: {
                      ...a.responses,
                      [q.id]: { ...r, earned, correct: earned === maxMarks(q) },
                    },
                  })
                }
              />
            )}
          </section>
        );
      })}
      {reviewActions("bottom")}
    </div>
  );
}
