import { isStructuredQuestion } from './questionModel.js';
import { contentHash } from './contentHash.js';

export async function fingerprintQuestions(questions) {
  const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const ordered = (value) =>
    Array.isArray(value)
      ? value.map(ordered)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.keys(value)
              .sort(compare)
              .map((key) => [key, ordered(value[key])])
          )
        : value;
  const records = questions
    .map((question) =>
      isStructuredQuestion(question)
        ? ordered({
            id: String(question.id),
            type: question.type,
            question: question.question,
            options: question.options,
            answer: question.answer,
            imageUrl: question.imageUrl || '',
            layout: question.layout || '',
            instruction: question.instruction || '',
            template: question.template || '',
            statements: question.statements || [],
            slots: question.slots || [],
          })
        : {
            id: String(question.id),
            question: question.question,
            options: Object.fromEntries(
              Object.entries(question.options).sort(([a], [b]) => compare(a, b))
            ),
            answer: question.answer.map(String).sort(compare),
            imageUrl: question.imageUrl || '',
          }
    )
    .sort((a, b) => compare(a.id, b.id));
  return contentHash(JSON.stringify(records));
}
