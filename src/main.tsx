import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import {
  type Bank, type Question, type Attempt, type Store,
  validateBank, shuffle, grade, stats, createAttempt, readStore, storageKey,
} from './core';
import './style.css';
import { retireLegacyDemo } from './legacy-demo';

const Md = ({ text }: { text: string }) => (
  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>{text}</Markdown>
);
const choices = (q: Question) => q.type === 'true-false'
  ? [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }]
  : q.choices || [];
const answerText = (q: Question, value: string[]) => q.type === 'short'
  ? value.join('')
  : value.map(id => choices(q).find(c => c.id === id)?.text || id).join('; ');
const formatDate = (date: string) => new Date(date).toLocaleDateString(undefined, {
  month: 'short', day: 'numeric', year: 'numeric',
});

function App({ initialError = '' }: { initialError?: string }) {
  const [startupError] = useState(() => {
    try { readStore(localStorage); return ''; }
    catch { return 'Saved data could not be read. Reload after recovering your browser storage; changes are disabled to protect it.'; }
  });
  const [store, setStore] = useState<Store>(() => {
    try { return readStore(localStorage); } catch { return { banks: [], attempts: [] }; }
  });
  const [error, setError] = useState(initialError);
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<'library' | 'sessions'>('library');
  const [dark, setDark] = useState(() => localStorage.getItem('quizlab.theme') === 'dark');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState('all');
  const [mode, setMode] = useState<Attempt['mode']>('practice');
  const [mix, setMix] = useState(true);
  const [mixChoices, setMixChoices] = useState(false);

  const commit = (next: Store) => {
    if (startupError) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStore(next); setError(''); return true;
    } catch {
      setError('Could not save to browser storage. Your latest change was not saved. Free storage and try again.');
      return false;
    }
  };
  const update = (attempt: Attempt) => commit({
    ...store, attempts: store.attempts.map(a => a.id === attempt.id ? attempt : a),
  });
  const bank = store.banks.find(b => b.libraryId === selected);
  const attempt = store.attempts.find(a => a.id === active);
  useEffect(() => { window.scrollTo(0, 0); }, [active, selected, view, attempt?.index, attempt?.complete]);
  const unfinished = store.attempts.filter(a => !a.complete);
  const eligible = bank?.questions.filter(q => (!topic || q.topic === topic)
    && (!difficulty || q.difficulty === difficulty)) || [];
  const navigate = (next: 'library' | 'sessions') => {
    setView(next); setActive(null); setSelected(null);
  };
  const selectBank = (id: string) => {
    setSelected(id); setActive(null); setView('library');
    setTopic(''); setDifficulty(''); setCount('all');
  };
  const start = (b: Bank, questions: Question[], nextMode = mode) => {
    if (!questions.length) return;
    const next = createAttempt(b, nextMode, questions, mixChoices);
    if (commit({ ...store, attempts: [next, ...store.attempts] })) setActive(next.id);
  };
  const retry = (a: Attempt) => start(
    { schemaVersion: 1, title: a.title, questions: a.questions },
    a.questions.filter(q => a.responses[q.id]?.correct === false), 'practice',
  );
  async function importFile(file: File) {
    try {
      const b = validateBank(JSON.parse(await file.text()));
      commit({ ...store, banks: [...store.banks, { ...b, libraryId: crypto.randomUUID() }] });
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); }
  }
  const upload = <label className="button primary upload">
    Import a question bank
    <input aria-label="Import a JSON question bank" type="file" accept=".json,application/json"
      onChange={e => {
        if (e.target.files?.[0]) void importFile(e.target.files[0]);
        e.target.value = '';
      }} />
  </label>;
  const sessions = (attempts: Attempt[]) => <div className="session-list">
    {attempts.map(a => {
      const score = stats(a);
      return <article className="session-row" key={a.id}>
        <div className="session-name"><h3>{a.title}</h3><p>{formatDate(a.created)}<span className="mode-name">{a.mode === 'exam' ? 'Exam' : 'Practice'}</span></p></div>
        <div className="session-state">{a.complete
          ? <><strong>{score.correct}/{score.total}</strong><span>{score.pending ? 'Assessment pending' : 'Completed'}</span></>
          : <><strong>{Object.values(a.responses).filter(r => r.value.length > 0).length}/{a.questions.length}</strong><span>Answered</span></>}
        </div>
        <button className="text-button" onClick={() => setActive(a.id)}>{a.complete ? 'Review results' : 'Resume session'}</button>
      </article>;
    })}
  </div>;

  return <div className={`app${dark ? ' dark' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <button className="brand" aria-label="QuizLab home" onClick={() => navigate('library')}>QuizLab</button>
      <nav className="main-nav" aria-label="Main navigation">
        <button aria-current={!attempt && view === 'library' ? 'page' : undefined} onClick={() => navigate('library')}>Question library<span>{store.banks.length}</span></button>
        <button aria-current={!attempt && view === 'sessions' ? 'page' : undefined} onClick={() => navigate('sessions')}>Saved sessions<span>{store.attempts.length}</span></button>
        {attempt && <div className="current-session" aria-current="page">{attempt.complete ? 'Results & review' : `${attempt.mode === 'exam' ? 'Exam' : 'Practice'} in progress`}</div>}
      </nav>
      <div className="sidebar-bottom">
        <button className="theme-button" onClick={() => {
          setDark(!dark); localStorage.setItem('quizlab.theme', !dark ? 'dark' : 'light');
        }}>{dark ? 'Use light theme' : 'Use dark theme'}</button>
        <p>Your banks and sessions are saved in this browser.</p>
      </div>
    </aside>
    <main id="main-content" tabIndex={-1}>
      {(error || startupError) && <div role="alert" className="error"><p>{startupError || error}</p>
        {!startupError && <button onClick={() => setError('')}>Dismiss</button>}</div>}
      {attempt ? <>
        <div className="page-return"><button className="text-button" onClick={() => navigate('sessions')}>Back to saved sessions</button></div>
        {attempt.complete ? <Results a={attempt} update={update} retry={retry} /> : <Quiz a={attempt} update={update} />}
      </> : bank ? <>
        <div className="page-return"><button className="text-button" onClick={() => navigate('library')}>Back to question library</button></div>
        <div className="page-heading bank-heading"><h1>{bank.title}</h1>{bank.description && <p>{bank.description}</p>}</div>
        <section className="setup-sheet" aria-labelledby="setup-heading">
          <div className="setup-intro"><h2 id="setup-heading">Plan your session</h2><p>{eligible.length} {eligible.length === 1 ? 'question matches' : 'questions match'} your selection.</p></div>
          <div className="setup-fields">
            <fieldset className="mode-options"><legend>How do you want to study?</legend>
              <label className={mode === 'practice' ? 'mode-option selected-mode' : 'mode-option'}><input type="radio" name="mode" checked={mode === 'practice'} onChange={() => setMode('practice')} /><span><strong>Practice</strong><small>Feedback after each answer. Hints when you need them.</small></span></label>
              <label className={mode === 'exam' ? 'mode-option selected-mode' : 'mode-option'}><input type="radio" name="mode" checked={mode === 'exam'} onChange={() => setMode('exam')} /><span><strong>Exam</strong><small>Move freely between questions. Review after finishing.</small></span></label>
            </fieldset>
            <div className="grid2">
              <label>Number of questions<select value={count} onChange={e => setCount(e.target.value)}><option value="all">All {eligible.length} questions</option>{Array.from({ length: eligible.length }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></label>
              <label>Topic<select value={topic} onChange={e => { setTopic(e.target.value); setCount('all'); }}><option value="">All topics</option>{[...new Set(bank.questions.map(q => q.topic).filter(Boolean))].map(t => <option key={t}>{t}</option>)}</select></label>
              <label>Difficulty<select value={difficulty} onChange={e => { setDifficulty(e.target.value); setCount('all'); }}><option value="">All difficulties</option>{[...new Set(bank.questions.map(q => q.difficulty).filter(Boolean))].map(t => <option key={t}>{t}</option>)}</select></label>
            </div>
            <div className="shuffle-options"><label className="check"><input type="checkbox" checked={mix} onChange={e => setMix(e.target.checked)} />Shuffle question order</label><label className="check"><input type="checkbox" checked={mixChoices} onChange={e => setMixChoices(e.target.checked)} />Shuffle answer choices</label></div>
            <button className="primary" disabled={!eligible.length} onClick={() => start(bank, (mix ? shuffle(eligible) : eligible).slice(0, count === 'all' ? eligible.length : Math.min(Number(count), eligible.length)))}>Start {mode}</button>
          </div>
        </section>
      </> : view === 'sessions' ? <>
        <div className="page-heading"><h1>Saved sessions</h1></div>
        {store.attempts.length ? sessions(store.attempts) : <div className="empty-sessions"><h2>No sessions yet.</h2><p>Choose a question bank to start your first quiz.</p><button onClick={() => navigate('library')}>Open question library</button></div>}
      </> : <>
        <div className="page-heading library-heading"><h1>Question<br />library</h1>{upload}</div>
        <div className="library-layout">
          <section className="library-index" aria-label="Question banks">
            {store.banks.length ? <div className="bank-list">
              <div className="bank-column-head" aria-hidden="true"><span>Subject</span><span>Questions</span><span>Actions</span></div>
              {store.banks.map(b => {
                const topics = [...new Set(b.questions.map(q => q.topic).filter(Boolean))];
                return <article className="bank-row" key={b.libraryId}>
                  <div className="bank-details"><h3>{b.title}</h3>{b.description && <p>{b.description}</p>}{topics.length > 0 && <p className="bank-topics">{topics.join(', ')}</p>}</div>
                  <div className="bank-count"><span className="sr-only">Questions: </span>{b.questions.length}</div>
                  <div className="bank-actions"><button className="study-button" onClick={() => selectBank(b.libraryId)}>Study</button><button className="delete-button" aria-label={`Delete ${b.title}`} onClick={() => {
                    if (confirm(`Delete “${b.title}” from your library? Saved attempts will remain.`)) commit({ ...store, banks: store.banks.filter(x => x.libraryId !== b.libraryId) });
                  }}>Delete</button></div>
                </article>;
              })}
            </div> : <div className="empty-library"><h2>No question banks yet.</h2><p>Import a JSON question bank to start studying.</p></div>}
          </section>
        </div>
        {unfinished.length > 0 && <section className="unfinished"><div className="section-heading"><h2>Continue studying</h2></div>{sessions(unfinished.slice(0, 3))}</section>}
      </>}
    </main>
  </div>;
}

function Feedback({ q }: { q: Question }) {
  return <div className="feedback"><h4>{q.type === 'short' ? 'Model answer' : 'Correct answer'}</h4><Md text={answerText(q, q.answer)} /><h4>Explanation</h4><Md text={q.explanation} /></div>;
}

function Quiz({ a, update }: { a: Attempt; update: (a: Attempt) => void }) {
  const q = a.questions[a.index];
  const r = a.responses[q.id] || { value: [], submitted: false };
  const locked = a.mode === 'practice' && r.submitted;
  const canNext = locked && (q.type !== 'short' || r.correct !== undefined);
  const setValue = (value: string[]) => update({ ...a, responses: { ...a.responses, [q.id]: { value, submitted: false } } });
  const submit = () => update({ ...a, responses: { ...a.responses, [q.id]: { ...r, submitted: true, correct: grade(q, r.value) } } });
  const finish = () => {
    if (a.mode === 'exam' && !confirm('Submit this exam? Answers will be locked, including unanswered questions.')) return;
    update({ ...a, complete: true, responses: Object.fromEntries(a.questions.map(q => {
      const r = a.responses[q.id] || { value: [], submitted: false };
      return [q.id, { ...r, submitted: true, correct: r.value.length ? (q.type === 'short' ? r.correct : grade(q, r.value)) : undefined }];
    })) });
  };
  return <div className="quiz-workspace">
    <div className="quiz-heading"><h1>{a.title}</h1><div className="quiz-context"><span>{a.mode === 'practice' ? 'Practice' : 'Exam'}</span><span>Question {a.index + 1} of {a.questions.length}</span></div><progress aria-label="Quiz progress" value={a.index + 1} max={a.questions.length} /></div>
    <section className="question-sheet">
      <div className="question-meta"><span>{q.type === 'multiple' ? 'Select all correct answers' : q.type === 'short' ? 'Write your answer' : 'Select one answer'}</span><span>{[q.topic, q.difficulty].filter(Boolean).join(' / ')}</span></div>
      <div className="question-text"><Md text={q.text} /></div>
      <fieldset disabled={locked}><legend className="sr-only">Your answer</legend>
        {q.type === 'short' ? <textarea aria-label="Your written answer" placeholder="Your response…" rows={6} value={r.value[0] || ''} onChange={e => setValue(e.target.value.trim() ? [e.target.value] : [])} /> : choices(q).map(c => <label className={`choice${r.value.includes(c.id) ? ' chosen' : ''}`} key={c.id}>
          <input type={q.type === 'multiple' ? 'checkbox' : 'radio'} name={q.id} checked={r.value.includes(c.id)} onChange={() => setValue(q.type === 'multiple' ? (r.value.includes(c.id) ? r.value.filter(x => x !== c.id) : [...r.value, c.id]) : [c.id])} /><div><Md text={c.text} /></div>
        </label>)}
      </fieldset>
      {a.mode === 'practice' && !locked && q.hint && <details><summary>Show hint</summary><Md text={q.hint} /></details>}
      {locked && <><h3 className={`answer-status ${r.correct === false ? 'incorrect' : 'correct'}`} role="status">{r.correct === undefined ? 'Compare your response' : r.correct ? 'Correct' : 'Incorrect'}</h3><Feedback q={q} />{q.type === 'short' && r.correct === undefined && <div className="actions"><button onClick={() => update({ ...a, responses: { ...a.responses, [q.id]: { ...r, correct: true } } })}>I got it correct</button><button onClick={() => update({ ...a, responses: { ...a.responses, [q.id]: { ...r, correct: false } } })}>I got it incorrect</button></div>}</>}
      <div className="quiz-bottom">
        {a.mode === 'exam' && <p>Answers stay editable until you finish.</p>}
        <div className="actions">{a.mode === 'practice' ? <>{!locked ? <button className="primary" disabled={!r.value.length} onClick={submit}>Submit answer</button> : <button className="primary" disabled={!canNext} onClick={() => a.index === a.questions.length - 1 ? finish() : update({ ...a, index: a.index + 1 })}>{a.index === a.questions.length - 1 ? 'View results' : 'Next question'}</button>}</> : <><button disabled={a.index === 0} onClick={() => update({ ...a, index: a.index - 1 })}>Previous</button><button disabled={a.index === a.questions.length - 1} onClick={() => update({ ...a, index: a.index + 1 })}>Next</button><button className="primary" onClick={finish}>Finish exam</button></>}</div>
      </div>
    </section>
    {a.mode === 'exam' && <nav className="question-nav" aria-label="Question navigation">{a.questions.map((q, i) => <button aria-label={`Question ${i + 1}${a.responses[q.id]?.value.length ? ', answered' : ', unanswered'}`} aria-current={i === a.index ? 'step' : undefined} className={i === a.index ? 'primary' : ''} key={q.id} onClick={() => update({ ...a, index: i })}>{i + 1}<span className={a.responses[q.id]?.value.length ? 'answered-mark' : 'unanswered-mark'} /></button>)}</nav>}
  </div>;
}

function Results({ a, update, retry }: { a: Attempt; update: (a: Attempt) => void; retry: (a: Attempt) => void }) {
  const s = stats(a);
  return <div className="results-workspace">
    <div className="page-heading"><h1>Your results</h1><p>{a.title}</p></div>
    <section className="results-summary" aria-label="Score summary">
      <div className="score-total"><strong>{Math.round(s.correct / s.total * 100)}<span>%</span></strong><p>{s.correct} of {s.total} correct</p></div>
      <div className="score-details"><dl><div><dt>Incorrect</dt><dd>{s.incorrect}</dd></div><div><dt>Unanswered</dt><dd>{s.unanswered}</dd></div><div><dt>To self-assess</dt><dd>{s.pending}</dd></div></dl>
        {s.pending > 0 && <p className="assessment-notice">Provisional score. Assess your written responses below to finalize it.</p>}
        <button className="primary" disabled={!s.incorrect} onClick={() => retry(a)}>Retry incorrect questions</button>
      </div>
    </section>
    {a.questions.some(q => q.topic) && <section className="topic-results"><h2>By topic</h2><div>{[...new Set(a.questions.map(q => q.topic || 'Uncategorized'))].map(t => {
      const qs = a.questions.filter(q => (q.topic || 'Uncategorized') === t);
      const n = qs.filter(q => a.responses[q.id]?.correct).length;
      return <div className="topic-row" key={t}><span>{t}</span><meter min={0} max={qs.length} value={n} aria-label={`${t}: ${n} of ${qs.length} correct`} /><strong>{n}/{qs.length}</strong></div>;
    })}</div></section>}
    <h2 className="review-title">Answer review</h2>
    {a.questions.map((q, i) => {
      const r = a.responses[q.id];
      const status = !r?.value.length ? 'Unanswered' : r.correct === undefined ? 'Self-assessment needed' : r.correct ? 'Correct' : 'Incorrect';
      return <section className="review-sheet" key={q.id}>
        <div className="review-heading"><h3>Question {i + 1}</h3><span className={!r?.value.length || r.correct === undefined ? 'pending-status' : r.correct ? 'correct' : 'incorrect'}>{status}</span></div>
        <div className="review-question"><Md text={q.text} /></div>
        <div className="submitted-answer"><h4>Your answer</h4><Md text={r?.value.length ? answerText(q, r.value) : 'No answer submitted'} /></div>
        <Feedback q={q} />
        {q.type === 'short' && !!r?.value.length && <div className="actions"><button aria-pressed={r.correct === true} onClick={() => update({ ...a, responses: { ...a.responses, [q.id]: { ...r, correct: true } } })}>Mark correct</button><button aria-pressed={r.correct === false} onClick={() => update({ ...a, responses: { ...a.responses, [q.id]: { ...r, correct: false } } })}>Mark incorrect</button></div>}
      </section>;
    })}
  </div>;
}

async function bootstrap() {
  let initialError = '';
  try {
    const saved = readStore(localStorage);
    const cleaned = await retireLegacyDemo(saved);
    if (cleaned !== saved) localStorage.setItem(storageKey, JSON.stringify(cleaned));
  } catch {
    initialError = 'Could not update saved data. Check browser storage permissions and reload.';
  }
  createRoot(document.getElementById('root')!).render(<React.StrictMode><App initialError={initialError} /></React.StrictMode>);
}
void bootstrap();
