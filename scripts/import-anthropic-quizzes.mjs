import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { mergeQuizQuestions, normalizeQuizText, questionSignature } from '../src/utils/quizImport.js';
import { fingerprintQuestions } from '../src/services/quickSummary.js';

const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Usage: node scripts/import-anthropic-quizzes.mjs <source-directory> [--check]');
const checkOnly = process.argv.includes('--check');
const files = ['CCAR_P', 'CCAO_F', 'CCDV_F'];
const report = [];
const writes = [];
for (const name of files) {
  const source = fs.readFileSync(path.join(sourceDirectory, name + '.json'));
  const incoming = JSON.parse(source.toString('utf8').replace(/^\uFEFF/, ''));
  const target = 'public/quiz/Anthropic/' + name + '.json';
  const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : [];
  const reviewed = new Map();
  if (name === 'CCAR_P') {
    // These equivalences were reviewed for this exact revision; source IDs alone are not identity.
    const expected = '03d37995afe08296f1ed891ac2067b160ddc11618fe70a41ddc7d21442d08943';
    if (createHash('sha256').update(source).digest('hex') !== expected) throw new Error('CCAR-P revision changed; review equivalences before importing.');
    const originals = existing.slice(0, 63);
    if (await fingerprintQuestions(originals) !== 'e8606d273bfa766427bbdce88a849fa17f2a7db735455ef0d29cbba89c57a6a3') throw new Error('Original CCAR-P questions changed; review the import mapping.');
    const options = q => Object.values(q.options).map(normalizeQuizText).sort().join('|');
    const similarity = (a, b) => {
      const x = new Set(normalizeQuizText(a).split(' ')), y = new Set(normalizeQuizText(b).split(' '));
      return 2 * [...x].filter(token => y.has(token)).length / (x.size + y.size);
    };
    for (const q of incoming.filter(q => q.type === 'multiple_choice')) {
      const matches = originals.filter(old => options(q) === options(old) && similarity(q.question, old.question) >= 0.7);
      if (matches.length > 1) throw new Error('Ambiguous reviewed match for ' + q.id);
      if (matches.length) reviewed.set(questionSignature(q), questionSignature(matches[0]));
    }
    const pairs = [[49,21],[88,2],[62,52],[97,6],[78,29],[68,42],[70,59],[77,40],[75,53],[105,60],[101,36],[123,61],[76,28]];
    for (const [sourceId, existingId] of pairs) {
      reviewed.set(questionSignature(incoming.find(q => q.id === 'ccar-p-' + sourceId)), questionSignature(originals.find(q => q.id === 'ccar-p-' + existingId)));
    }
    if (reviewed.size !== 63 || new Set(reviewed.values()).size !== 63) throw new Error('Reviewed CCAR-P mapping must preserve all 63 original questions.');
  }
  const result = mergeQuizQuestions(existing, incoming, reviewed);
  const item = { file: name + '.json', before: existing.length, incoming: incoming.length, after: result.questions.length, added: result.added, skipped: result.skipped };
  report.push(item);
  if (checkOnly) {
    if (result.added.length) throw new Error(name + ' still has unimported questions.');
  } else writes.push([target, JSON.stringify(result.questions, null, 2) + '\n']);
}
if (!checkOnly) {
  for (const [target, contents] of writes) fs.writeFileSync(target, contents);
  fs.mkdirSync('docs/imports', { recursive: true });
  fs.writeFileSync('docs/imports/anthropic-2026-10-26.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report.map(({ file, before, incoming, after, added, skipped }) => ({ file, before, incoming, after, added: added.length, skipped: skipped.length })), null, 2));
