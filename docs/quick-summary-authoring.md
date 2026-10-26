# Quick Summary authoring

Quick Summary displays a prepared, shared study guide. AI can help draft it outside the app; a maintainer reviews and publishes the files with the source. Opening a guide does not call an LLM or write to Firebase.

## Files and publication

Each quiz has a directory under `public/summaries/<quizId>/` containing `meta.json` and a Markdown content file such as `vi.md`. Add an entry to `src/data/quickSummaries.js` only when publishing. Both registry and metadata must have `status: "published"`; otherwise the guide cannot load. Unregistered quizzes and uploaded files have no guide.

Metadata contains `quizId`, `title`, `description` (scope of coverage), `language`, `status`, positive integer `version`, ISO `updatedAt`, `readingMinutes`, `sourceQuestionCount`, `sourceQuizHash`, `contentFile`, `topics`, and `sources`. `contentFile` must be a local filename ending in `.md`; topic IDs must be unique lowercase letters/numbers/hyphens. Every source has a title and HTTPS URL.

Use the CCAR-P files as the first template. Its eight topic mappings reference all 63 bank questions by ID. IDs are not array positions: the current bank skips ID 56 and ends at ID 64. The reader resolves current positions and excludes references to removed questions.

CCA-F has its own eight-topic guide and mappings for all 175 bank questions. Shared asset checks cover both published guides, including their distinct metadata/content paths. When adding a guide, extend the asset list in `tests/quickSummary.test.js`; keep the service/error tests reusable. Names or flags in a bank may reflect an older API/SDK version, so qualify version-sensitive advice and link primary documentation.

## Content contract

- Start with a short introduction and a decision checklist.
- Use one standard `## Topic title` per metadata topic, in matching order and with exactly the same title. Titles should be plain text. Each section must have content.
- Aim for 6–8 topics and roughly 1,000–1,500 Vietnamese words. Per topic, prioritize core knowledge, scenario cues, common wrong-answer traps, and one memory aid.
- Explain why a principle fits the scenario; do not memorize A/B/C/D or imply a mnemonic always selects the right answer.
- Cite current primary documentation and distinguish bank coverage from the official exam blueprint. Review conflicting bank answers instead of treating them as unquestionable authority.
- Use ordinary Markdown paragraphs, lists, bold, code spans, and blockquotes. Raw HTML is ignored. GFM tables are not enabled; lists stay readable on phones without horizontal scrolling.

## Source fingerprint and checks

`fingerprintQuestions` in `src/services/quickSummary.js` hashes question IDs, text, options, marked answers, and image URLs using a deterministic representation. Reordering questions/options/answers does not change it; changed question content does. Update the fingerprint only after reviewing the guide against the revised bank. The reader still displays an older guide with a visible review warning.

To calculate the CCAR-P fingerprint in PowerShell:

```powershell
@'
import fs from 'node:fs';
import { fingerprintQuestions } from './src/services/quickSummary.js';
const questions = JSON.parse(fs.readFileSync('public/quiz/Anthropic/CCAR_P.json', 'utf8'));
console.log(await fingerprintQuestions(questions));
'@ | node --input-type=module -
```

Run `npm test` and `npm run build`. Asset tests validate metadata, headings, fingerprint, question coverage, content length, error handling, and deployment paths. When adding another guide, add equivalent asset checks for its bank. Manually check 320/390/430px phones, tablet and desktop; long titles, contents navigation, topic-to-Practice links, loading/error/retry, and the disabled option for other quizzes.
