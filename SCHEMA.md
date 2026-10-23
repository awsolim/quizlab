# Question bank schema v1

Root: `schemaVersion` (exactly 1), `title` (nonempty string), optional `description` (string), `questions` (nonempty array). See `public/question-bank.schema.json` for the machine-readable structural schema. The importer additionally checks unique question/choice IDs, distinct answer strings, and valid choice references.

Every question requires `id` (unique within bank), `type`, `text` (Markdown), `answer` (nonempty string array), and `explanation` (Markdown). Optional `topic`, `difficulty`, and `hint` are nonempty strings. Topic and difficulty use free-form labels; consistent spelling produces consistent filters.

| type | choices | answer |
| --- | --- | --- |
| `single` | At least two `{id,text}` objects, unique IDs | Exactly one choice ID |
| `multiple` | At least two `{id,text}` objects, unique IDs | One or more distinct choice IDs; exact set required |
| `true-false` | Omit; UI supplies the two options | `["true"]` or `["false"]` (lowercase strings) |
| `short` | Omit | One string containing the model answer; self-assessed |

IDs are stable strings, never choice positions. Shuffling preserves ID mappings. Every required text must contain non-whitespace characters. Unknown additional fields are ignored. Future schema versions require explicit app support; unsupported versions are rejected.

```json
{"schemaVersion":1,"title":"Example","questions":[{"id":"q1","type":"single","text":"What is $1+1$?","choices":[{"id":"a","text":"2"},{"id":"b","text":"3"}],"answer":["a"],"explanation":"Adding one to one gives two."}]}
```

JSON strings must escape backslashes: math `\frac` becomes `\\frac` inside JSON. Use `\n` for newlines and fenced code. Do not include Markdown fences around the JSON document itself. Validation reports question position/ID and field, and rejects the whole import if anything fails.

Optional `marks`: integer 1–100, default 1. Optional `rubric`: nonempty Markdown marking guidelines, revealed with feedback. Written responses receive manual partial credit. Objective questions remain all-or-nothing. Use `topic` as the unit name consistently across imported banks. Different banks may reuse question IDs; sessions namespace them by bank.

## Fixed papers and tables

Schema version remains 1; existing banks work unchanged. Optional root kind is bank (default) or paper. A paper requires sections [{id,title,context?}], and every question references a section with sectionId. Optional label preserves subpart labels (for example 4.1). Subparts for a section must be contiguous; the questions array defines the exact paper order. Every section must be used and references must resolve. Optional root instructions is Markdown; durationMinutes is an integer from 1 to 600.

The table question type requires table: {rows: string[], columns: string[]}. answer contains exactly one nonempty model-answer string per cell, in row-major order. Repeated answers are allowed for tables. Use an em dash (—) to indicate an intentionally blank model cell. Table answers use manual partial-credit marking, with an optional rubric. They are saved cell by cell and support partially completed grids.

Paper attempts snapshot instructions and section context. Timed attempts persist an absolute deadline and auto-submit at expiration, including when reopened after the deadline. There is no pause. Untimed attempts have no deadline. The library presents papers separately through Take paper; sampled sessions use ordinary banks.
