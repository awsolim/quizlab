import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React from "react";
import { storageKey, type Store } from "./core";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://quizlab.test",
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Node",
  "MutationObserver",
  "localStorage",
])
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: (dom.window as any)[key],
  });
dom.window.scrollTo = () => {};
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  configurable: true,
  value: true,
  writable: true,
});
const { render, fireEvent, waitFor, cleanup, within } =
  await import("@testing-library/react");
const { App } = await import("./App");
const fixture = JSON.parse(
  readFileSync(
    new URL("./__fixtures__/paper-with-table.json", import.meta.url),
    "utf8",
  ),
);
const oldFetch = globalThis.fetch;
globalThis.fetch = (async () =>
  Response.json({ buildId: "development" })) as typeof fetch;
after(() => {
  cleanup();
  dom.window.close();
  globalThis.fetch = oldFetch;
});
const stored = () => JSON.parse(localStorage.getItem(storageKey)!) as Store;
async function upload(
  ui: ReturnType<typeof render>,
  value: unknown,
  name = "paper.json",
) {
  fireEvent.change(ui.getByLabelText("Import a JSON bank or paper"), {
    target: {
      files: [
        new File([JSON.stringify(value)], name, { type: "application/json" }),
      ],
    },
  });
}
test("real file input imports a fixed paper, launches directly, saves tables, resumes and reviews rubrics", async () => {
  localStorage.clear();
  let ui = render(<App />);
  try {
    await upload(ui, fixture);
    await waitFor(() =>
      assert.ok(ui.getByRole("button", { name: "Start paper" })),
    );
    assert.equal(stored().banks[0].kind, "paper");
    assert.deepEqual(stored().banks[0].sections, fixture.sections);
    assert.deepEqual(stored().banks[0].questions, fixture.questions);
    assert.ok(ui.getByText("100 marks", { exact: true }));
    assert.equal(ui.queryByText("Plan your session"), null);
    fireEvent.click(ui.getByRole("button", { name: "Back to library" }));
    assert.ok(ui.getByRole("button", { name: "Take paper" }));
    fireEvent.click(ui.getByRole("button", { name: "Take paper" }));
    fireEvent.click(ui.getByRole("button", { name: "Start paper" }));
    let attempt = stored().attempts[0];
    assert.ok(attempt.paper?.deadline);
    assert.equal(attempt.paper?.durationMinutes, 50);
    assert.deepEqual(
      attempt.questions.map((q) => q.id),
      fixture.questions.map((q: any) => q.id),
    );
    assert.equal(
      attempt.questions.reduce((n, q) => n + (q.marks ?? 1), 0),
      100,
    );
    fireEvent.click(ui.getByRole("button", { name: /^Question 4/ }));
    assert.ok(ui.getByText("SHARED_WORKLOAD: process A and B; time is in ms."));
    assert.equal(ui.queryByText("MODEL_TIMELINE_EXPLANATION"), null);
    assert.equal(ui.queryByText(/TIMELINE_RUBRIC/), null);
    const first = ui.getByRole("textbox", { name: "0–1 — Process" });
    fireEvent.change(first, { target: { value: "A" } });
    fireEvent.change(ui.getByRole("textbox", { name: "1–2 — Process" }), {
      target: { value: "A" },
    });
    const deadline = stored().attempts[0].paper!.deadline;
    ui.unmount();
    ui = render(<App />);
    fireEvent.click(ui.getByRole("button", { name: "Resume session" }));
    assert.equal(
      (ui.getByRole("textbox", { name: "0–1 — Process" }) as HTMLInputElement)
        .value,
      "A",
    );
    assert.equal(stored().attempts[0].paper!.deadline, deadline);
    fireEvent.click(ui.getByRole("button", { name: "Submit paper" }));
    fireEvent.click(ui.getByRole("button", { name: "Confirm submission" }));
    assert.ok(ui.getByRole("heading", { name: "Your results" }));
    assert.ok(ui.getByText("MODEL_TIMELINE_EXPLANATION"));
    assert.ok(ui.getByText(/TIMELINE_RUBRIC/));
    const tableReview = ui
      .getByRole("heading", { name: /4.1.*Pending/ })
      .closest("section")!;
    assert.equal(within(tableReview).getAllByRole("table").length, 2);
    fireEvent.change(
      within(tableReview).getByRole("combobox", { name: "Marks earned" }),
      { target: { value: "2" } },
    );
    assert.equal(stored().attempts[0].responses["q4-1"].earned, 2);
    assert.equal(stored().attempts[0].complete, true);
  } finally {
    cleanup();
  }
});
test("invalid grid dimensions reject the whole file and an existing legacy bank still imports", async () => {
  localStorage.clear();
  const ui = render(<App />);
  try {
    const invalid = structuredClone(fixture);
    invalid.questions[15].answer.pop();
    await upload(ui, invalid);
    await waitFor(() =>
      assert.match(ui.getByRole("alert").textContent!, /exactly 20 entries/),
    );
    assert.equal(localStorage.getItem(storageKey), null);
    const legacy = JSON.parse(
      readFileSync(
        new URL("../examples/sample-bank.json", import.meta.url),
        "utf8",
      ),
    );
    await upload(ui, legacy, "legacy.json");
    await waitFor(() => assert.ok(ui.getByRole("button", { name: "Study" })));
    assert.equal(stored().banks.length, 1);
    assert.equal(ui.queryByRole("button", { name: "Take paper" }), null);
  } finally {
    cleanup();
  }
});
test("a newer build blocks import and offers reload without changing the library", async () => {
  localStorage.clear();
  globalThis.fetch = (async () =>
    Response.json({ buildId: "new-release" })) as typeof fetch;
  const ui = render(<App />);
  try {
    await upload(ui, fixture);
    await waitFor(() =>
      assert.ok(ui.getByRole("button", { name: "Reload QuizLab" })),
    );
    await waitFor(() =>
      assert.match(ui.getByRole("alert").textContent!, /Reload QuizLab/),
    );
    assert.equal(localStorage.getItem(storageKey), null);
  } finally {
    cleanup();
    globalThis.fetch = (async () =>
      Response.json({ buildId: "development" })) as typeof fetch;
  }
});

test("save for later keeps the imported paper without starting an attempt or timer", async () => {
  localStorage.clear();
  const ui = render(<App />);
  try {
    await upload(ui, fixture);
    await waitFor(() =>
      assert.ok(ui.getByRole("button", { name: "Save for later" })),
    );
    fireEvent.click(ui.getByRole("button", { name: "Save for later" }));
    assert.ok(ui.getByRole("button", { name: "Take paper" }));
    assert.equal(stored().banks.length, 1);
    assert.equal(stored().attempts.length, 0);
    fireEvent.click(ui.getByRole("button", { name: "Take paper" }));
    assert.ok(ui.getByRole("button", { name: "Start paper" }));
  } finally {
    cleanup();
  }
});

test("review shows independent live scores, outcome tints and a safe finish-review exit", async () => {
  localStorage.clear();
  const { createPaperAttempt } = await import("./core");
  const a = createPaperAttempt(fixture, false);
  for (const q of a.questions)
    a.responses[q.id] = {
      value: q.type === "short" ? ["My explanation"] : q.answer,
      submitted: true,
      ...(["short", "table"].includes(q.type) ? {} : { correct: true }),
    };
  a.complete = true;
  localStorage.setItem(
    storageKey,
    JSON.stringify({ banks: [], attempts: [a] }),
  );
  const ui = render(<App />);
  try {
    fireEvent.click(ui.getByRole("button", { name: /Saved sessions/ }));
    fireEvent.click(ui.getByRole("button", { name: "Review results" }));
    const automatic = ui.getByRole("region", {
      name: "Automatically marked score",
    });
    const manual = ui.getByRole("region", { name: "Self-assessed score" });
    assert.ok(within(automatic).getByText("100%"));
    assert.ok(within(manual).getByText("Not assessed yet"));
    assert.ok(ui.getByText("Assessment incomplete"));
    assert.equal(
      ui.getAllByRole("button", { name: "Finish review" }).length,
      2,
    );
    assert.ok(ui.container.querySelector(".feedback-pending"));
    assert.ok(ui.container.querySelector(".feedback-correct"));
    fireEvent.change(ui.getAllByRole("combobox", { name: "Marks earned" })[0], {
      target: { value: "5" },
    });
    assert.ok(within(manual).getByText("100%"));
    assert.ok(within(manual).getByText(/still to assess/));
    assert.ok(within(automatic).getByText("100%"));
    const grid = ui
      .getByRole("heading", { name: /4.1.*Pending/ })
      .closest("section")!;
    fireEvent.change(
      within(grid).getByRole("combobox", { name: "Marks earned" }),
      { target: { value: "5" } },
    );
    assert.ok(within(manual).getByText("67%"));
    assert.ok(grid.querySelector(".feedback-partial"));
    fireEvent.click(ui.getAllByRole("button", { name: "Finish review" })[1]);
    assert.ok(ui.getByRole("region", { name: "Unfinished assessment" }));
    fireEvent.click(ui.getByRole("button", { name: "Continue review" }));
    assert.ok(ui.getByRole("heading", { name: "Your results" }));
    fireEvent.click(ui.getAllByRole("button", { name: "Finish review" })[0]);
    fireEvent.click(ui.getByRole("button", { name: "Save and exit review" }));
    assert.ok(ui.getByRole("heading", { name: "Saved sessions" }));
    assert.equal(stored().attempts[0].responses["q4-1"].earned, 5);
  } finally {
    cleanup();
  }
});
