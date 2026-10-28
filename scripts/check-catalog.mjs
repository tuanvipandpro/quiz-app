import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { quizzes } from '../src/data/quizzes.js';
import { validateQuizQuestions } from '../src/utils/questionModel.js';
import { fingerprintQuestions } from '../src/services/quickSummary.js';
import { getQuickSummary } from '../src/data/quickSummaries.js';

const seen = new Map();
const reviews = [];
for (const quiz of quizzes) {
  const questions = JSON.parse(
    await fs.readFile(new URL('../public/' + quiz.file, import.meta.url), 'utf8')
  );
  validateQuizQuestions(questions, { allowLegacyIncomplete: true });
  if (questions.length !== quiz.totalQuestions)
    throw new Error(`${quiz.id}: count differs from catalog`);
  const hash = createHash('sha256').update(JSON.stringify(questions)).digest('hex');
  if (seen.has(hash)) throw new Error(`${quiz.id}: duplicates ${seen.get(hash)}`);
  seen.set(hash, quiz.id);
  const entry = getQuickSummary(quiz.id);
  if (entry) {
    const meta = JSON.parse(
      await fs.readFile(new URL('../public/' + entry.metadataPath, import.meta.url), 'utf8')
    );
    if ((await fingerprintQuestions(questions)) !== meta.sourceQuizHash)
      reviews.push(
        `${quiz.code}: reviewed ${meta.sourceQuestionCount}, current ${questions.length}`
      );
  }
}
console.log(`Catalog OK: ${quizzes.length} unique, validated quiz banks.`);
if (reviews.length)
  console.warn('Guides need content review (fingerprints preserved):\n' + reviews.join('\n'));
if (reviews.length && process.argv.includes('--strict-guides')) process.exitCode = 1;
