import React from "react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  type Question,
  maxMarks,
  earnedMarks,
  isManual,
  feedbackState,
  type Response,
} from "./core";
export const Md = ({ text }: { text: string }) => (
  <Markdown
    remarkPlugins={[remarkMath, remarkGfm]}
    rehypePlugins={[rehypeKatex, rehypeHighlight]}
  >
    {text}
  </Markdown>
);
export const choices = (q: Question) =>
  q.type === "true-false"
    ? [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ]
    : q.choices || [];
const answerText = (q: Question, value: string[]) =>
  isManual(q)
    ? value.join("")
    : value
        .map((id) => choices(q).find((c) => c.id === id)?.text || id)
        .join("; ");
export function Marking({
  q,
  r,
  onMark,
}: {
  q: Question;
  r: import("./core").Response;
  onMark: (n: number) => void;
}) {
  return (
    <div className="marking">
      <label>
        Marks earned
        <select
          value={earnedMarks(q, r) ?? ""}
          onChange={(e) => {
            if (e.target.value !== "") onMark(Number(e.target.value));
          }}
        >
          <option value="" disabled>
            Choose a score
          </option>
          {Array.from({ length: maxMarks(q) + 1 }, (_, i) => (
            <option key={i} value={i}>
              {i} / {maxMarks(q)}
            </option>
          ))}
        </select>
      </label>
      <p className="helper">
        Compare your response with the model answer and marking guide. Award
        credit for the ideas you demonstrated.
      </p>
    </div>
  );
}

export function Feedback({
  q,
  response,
}: {
  q: Question;
  response?: Response;
}) {
  const state = feedbackState(q, response);
  const label = {
    correct: "Full marks",
    incorrect: "Incorrect",
    partial: "Partial credit",
    pending: "Needs self-assessment",
    unanswered: "Unanswered",
  }[state];
  return (
    <div className={`feedback feedback-${state}`}>
      <p className="feedback-result">{label}</p>
      <h4>{isManual(q) ? "Model answer" : "Correct answer"}</h4>
      {q.type === "table" ? (
        <TableAnswer q={q} value={q.answer} readOnly />
      ) : (
        <Md text={answerText(q, q.answer)} />
      )}
      <h4>Explanation</h4>
      <Md text={q.explanation} />
      {q.rubric && (
        <>
          <h4>Marking guide · {maxMarks(q)} marks</h4>
          <Md text={q.rubric} />
        </>
      )}
    </div>
  );
}

export function TableAnswer({
  q,
  value,
  onChange,
  readOnly = false,
}: {
  q: Question;
  value: string[];
  onChange?: (v: string[]) => void;
  readOnly?: boolean;
}) {
  if (!q.table) return null;
  const { rows, columns } = q.table;
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      aria-label="Scrollable answer table"
    >
      <table className="answer-table">
        <caption>{q.label || "Table response"}</caption>
        <thead>
          <tr>
            <th scope="col">Row</th>
            {columns.map((col, i) => (
              <th scope="col" key={i}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              <th scope="row">{row}</th>
              {columns.map((col, c) => {
                const i = r * columns.length + c;
                return (
                  <td key={c}>
                    {readOnly ? (
                      <span>{value[i] || "—"}</span>
                    ) : (
                      <input
                        aria-label={row + " — " + col}
                        value={value[i] || ""}
                        onChange={(e) => {
                          const next = Array.from(
                            { length: rows.length * columns.length },
                            (_, j) => value[j] || "",
                          );
                          next[i] = e.target.value;
                          onChange?.(next);
                        }}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReasoningInput({
  value,
  onChange,
  disabled = false,
  label = "Your reasoning",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <details className="reasoning-input" open={disabled ? !!value : undefined}>
      <summary>Your reasoning (optional)</summary>
      <label>
        {label}
        <textarea
          value={value}
          disabled={disabled}
          rows={3}
          placeholder="Why does this answer make sense? What rules or evidence support it?"
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <p className="helper">
        For your own reflection. This is saved with your answer and is not
        automatically graded.
      </p>
    </details>
  );
}
export function ReasoningReview({ value }: { value?: string }) {
  return value?.trim() ? (
    <div className="submitted-answer reasoning-review">
      <h4>Your reasoning</h4>
      <p>{value}</p>
    </div>
  ) : null;
}
