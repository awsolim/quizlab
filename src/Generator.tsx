import { useState } from "react";
import { buildGeneratorPrompt } from "./bank-prompt";
export function Generator() {
  const [subject, setSubject] = useState(""),
    [units, setUnits] = useState(""),
    [count, setCount] = useState(30),
    [difficulty, setDifficulty] = useState(
      "A mixture of Easy, Medium and Hard",
    ),
    [status, setStatus] = useState(""),
    [kind, setKind] = useState<"bank" | "paper">("bank"),
    [guidelines, setGuidelines] = useState(""),
    [duration, setDuration] = useState(50);
  const prompt = buildGeneratorPrompt({
    subject,
    units,
    count,
    difficulty,
    kind,
    guidelines,
    duration,
  });
  return (
    <>
      <div className="page-heading">
        <h1>
          From course notes
          <br />
          to your next quiz.
        </h1>
        <p>
          Make a question pool for flexible practice, or a complete paper that
          follows your exam’s structure.
        </p>
      </div>
      <section className="generator-sheet">
        <ol className="steps">
          <li>
            <strong>Describe what you want.</strong> Add your scope, exclusions
            and content-specific instructions.
          </li>
          <li>
            <strong>Copy the prompt into your AI tool.</strong> Attach your
            notes, reference exam and answer key where applicable.
          </li>
          <li>
            <strong>Review and import.</strong> Save the response as a .json
            file, check its accuracy, then import it in Question library.
          </li>
        </ol>
        <div className="grid2">
          <label>
            What do you want to create?
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "bank" | "paper")}
            >
              <option value="bank">Question bank — sampled practice</option>
              <option value="paper">Practice paper — fixed structure</option>
            </select>
          </label>
          <label>
            Subject
            <input
              value={subject}
              placeholder="e.g. Operating systems"
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          {kind === "bank" ? (
            <label>
              Questions per unit
              <input
                type="number"
                min="1"
                max="500"
                value={count}
                onChange={(e) =>
                  setCount(Math.max(1, Math.min(500, Number(e.target.value))))
                }
              />
            </label>
          ) : (
            <label>
              Time limit in minutes (0 = untimed)
              <input
                type="number"
                min="0"
                max="600"
                value={duration}
                onChange={(e) =>
                  setDuration(
                    Math.max(0, Math.min(600, Number(e.target.value))),
                  )
                }
              />
            </label>
          )}
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {[
                "A mixture of Easy, Medium and Hard",
                "Easy",
                "Medium",
                "Hard",
              ].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Units and covered scope
            <textarea
              value={units}
              placeholder="List the units and source material you want covered."
              onChange={(e) => setUnits(e.target.value)}
            />
          </label>
        </div>
        <label className="guidelines-field">
          Content-specific instructions (optional)
          <textarea
            value={guidelines}
            placeholder={
              "Match the style and mark distribution of my attached practice midterm.\nExclude the second half of Topic 18.\nUse T/F statements based on commonly confused concepts, not obvious facts.\nFor written answers, include acceptable alternatives and answers-may-vary guidance."
            }
            onChange={(e) => setGuidelines(e.target.value)}
          />
        </label>
        <p className="helper">
          These instructions appear as their own editable section in the copied
          prompt. Fine-tune it further in your AI tool. For a fixed paper,
          specify the main questions, subparts, answer formats and mark totals,
          or attach a reference.
        </p>
        <details>
          <summary>What makes a useful marking guide?</summary>
          <p>
            Award marks for required ideas and valid reasoning. Include
            equivalent wording, alternative solutions, assumptions, and
            partial-credit rules where answers may vary. Written and table
            answers are self-assessed in QuizLab.
          </p>
        </details>
        <label>
          Your generator prompt
          <textarea className="prompt-output" readOnly value={prompt} />
        </label>
        <div className="actions">
          <button
            className="primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(prompt);
                setStatus(
                  "Prompt copied. Paste it into your AI tool with your source material.",
                );
              } catch {
                setStatus(
                  "Copy was unavailable. Select and copy the prompt above.",
                );
              }
            }}
          >
            Copy prompt
          </button>
          <button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([prompt], { type: "text/plain" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "quizlab-prompt.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download prompt
          </button>
        </div>
        <p role="status" className="helper">
          {status}
        </p>
        <p className="helper">
          QuizLab validates structure, not factual accuracy. Review generated
          questions and answers against your sources before studying.
        </p>
      </section>
    </>
  );
}
