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
