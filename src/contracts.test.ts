import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { validateBank, createPaperAttempt } from "./core";
import { bankPrompt } from "./bank-prompt";
import { hasNewBuild } from "./version";
const fixture = JSON.parse(
  readFileSync(
    new URL("./__fixtures__/paper-with-table.json", import.meta.url),
    "utf8",
  ),
);
const schema = JSON.parse(
  readFileSync(
    new URL("../public/question-bank.schema.json", import.meta.url),
    "utf8",
  ),
);
const check = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
test("generator, public schema and importer agree on repeated table values and fixed papers", () => {
  assert.match(bankPrompt, /Repeated values are allowed/);
  assert.ok(schema.$defs.question.properties.type.enum.includes("table"));
  assert.equal(check(fixture), true, JSON.stringify(check.errors));
  const b = validateBank(fixture);
  assert.equal(b.questions[15].id, "q4-1");
  assert.equal(new Set(b.questions[15].answer).size, 2);
  assert.equal(b.questions[15].answer.length, 20);
  assert.deepEqual(createPaperAttempt(b, true).paper?.sections, b.sections);
  for (const count of [0, 19, 21]) {
    const invalid = structuredClone(fixture);
    invalid.questions[15].answer = Array.from({ length: count }, () => "A");
    assert.throws(() => validateBank(invalid), /answer/);
  }
  const duplicate = structuredClone(fixture);
  duplicate.questions[0].answer = ["true", "true"];
  assert.equal(check(duplicate), false);
  assert.throws(() => validateBank(duplicate), /unique/);
  const old = JSON.parse(
    readFileSync(
      new URL("../examples/sample-bank.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(check(old), true);
  assert.doesNotThrow(() => validateBank(old));
});
test("build checks detect changed releases and tolerate offline or older static hosts", async () => {
  const response = (value: unknown) =>
    (async () => Response.json(value)) as typeof fetch;
  assert.equal(await hasNewBuild("a", response({ buildId: "b" })), true);
  assert.equal(await hasNewBuild("a", response({ buildId: "a" })), false);
  assert.equal(await hasNewBuild("a", response({})), false);
  assert.equal(
    await hasNewBuild("a", (async () => {
      throw Error("offline");
    }) as typeof fetch),
    false,
  );
});
