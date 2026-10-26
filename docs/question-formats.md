# Question formats

A quiz is a non-empty array of questions with unique string/number IDs, non-empty question text, options and an answer. `imageUrl`, explanation and instructions are optional strings. JSON content is data, not executable instructions.

## Multiple choice (existing format)

`type` may be omitted or set to `multiple_choice`. `options` maps choice keys to strings. `answer` is a non-empty array of distinct valid keys. A single key uses radios; several keys use capped checkboxes.

```json
{"id":"q1","question":"Choose two","options":{"A":"One","B":"Two","C":"Three"},"answer":["A","C"]}
```

## Yes/no statements

`type: "yes_no"` uses an ordered `statements` array of unique `{id,text}` records. Shared options contain exactly Yes and No. `answer` maps every statement ID to its correct choice key.

```json
{
  "id":"q2","type":"yes_no","question":"Evaluate each claim.",
  "statements":[{"id":"s1","text":"First claim"},{"id":"s2","text":"Second claim"}],
  "options":{"A":"Yes","B":"No"},"answer":{"s1":"A","s2":"B"}
}
```

## Dropdown

`type: "dropdown"` uses ordered `{id,label}` slots. Each slot has its own option dictionary under `options[slotId]`; `answer` maps every slot ID to a correct key. `layout: "rows"` (or omitted) requires labels. Each dropdown selects exactly one answer.

```json
{
  "id":"q3","type":"dropdown","layout":"rows","question":"Classify each item.",
  "slots":[{"id":"first","label":"First item"},{"id":"second","label":"Second item"}],
  "options":{"first":{"A":"Input","B":"Output"},"second":{"A":"Input","B":"Output"}},
  "answer":{"first":"A","second":"B"}
}
```

For `layout: "inline"`, provide a string `template` containing each `{{slotId}}` exactly once. Null/missing inline labels use accessible names such as Blank 1. Example: `"template": "Use {{first}} before {{second}}."`. Optional `instruction` appears above the template. Templates render as text and selectors, never HTML.

## Behavior

- Practice waits for every part before showing row-level and overall feedback; answers remain editable.
- Exam retains selections between questions, counts only fully completed questions as answered, and awards one point only if all parts are correct. There is no partial credit. Review shows selected/missing answers and the correct answer for wrong parts.
- Choice shuffling preserves keys. Dropdown choices shuffle within each slot; yes/no order stays consistent. Labels, slots, answer mappings and original questions are not mutated.
- Copy includes every part and its choices without adding the marked-answer mapping. Explain includes each marked answer, and its cache identity includes the full question structure.
- IDs identify questions independently of array position. Imports preserve existing IDs and add collision suffixes to new questions. Reworded equivalents require an explicit reviewed mapping; generic fuzzy matching is not used to discard questions.
- Legacy demo banks contain some historical incomplete/image questions. The built-in loader keeps their basic shape compatible, while uploaded files and new imports use strict validation. Structured formats are always validated strictly.
