import { questionType, isStructuredQuestion, validateQuizQuestions, formatAnswerLines } from './questionModel.js';

export const normalizeQuizText = value => value.normalize('NFKC').toLowerCase()
  .replace(/<=|≤/g, ' less equal ').replace(/>=|≥/g, ' greater equal ')
  .replace(/!=|≠/g, ' not equal ').replace(/</g, ' less than ').replace(/>/g, ' greater than ')
  .replace(/(^|\s)-(?=\d)/g, '$1 negative ')
  .replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function questionSignature(question) {
  return JSON.stringify([questionType(question), normalizeQuizText(question.question),
    isStructuredQuestion(question) ? [question.statements || question.slots, question.options, question.template] :
      Object.values(question.options).map(normalizeQuizText).sort()]);
}

export function mergeQuizQuestions(existing, incoming, reviewedMatches = new Map()) {
  if (existing.length) validateQuizQuestions(existing);
  validateQuizQuestions(incoming);
  const questions = [...existing], skipped = [], added = [];
  const ids = new Set(existing.map(question => String(question.id)));
  for (const question of incoming) {
    const signature = questionSignature(question);
    const reviewed = reviewedMatches.get(signature);
    const match = questions.find(other => questionSignature(other) === signature
      || (reviewed && questionSignature(other) === reviewed));
    if (match) {
      const marked = q => formatAnswerLines(q, q.answer).map(normalizeQuizText).sort().join('|');
      skipped.push({ incomingId: question.id, existingId: match.id, reason: reviewed ? 'reviewed equivalent question' : 'matching question/choices', answerTextDiffers: marked(question) !== marked(match) });
      continue;
    }
    let id = String(question.id), suffix = 1;
    while (ids.has(id)) id = `${question.id}-import-${suffix++}`;
    ids.add(id);
    questions.push({ ...question, id });
    added.push({ incomingId: question.id, savedId: id, type: questionType(question) });
  }
  validateQuizQuestions(questions);
  return { questions, added, skipped };
}
