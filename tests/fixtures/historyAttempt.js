import { createExamSession, finishExam } from '../../src/utils/studySession.js';
import { createHistoryAttempt, examHistorySource } from '../../src/utils/examHistory.js';
import { secureId } from '../../src/utils/secureId.js';

export const historyQuestions = [
  {
    id: 'history-fixture',
    question: 'Which answer is correct?',
    options: { A: 'First answer', B: 'Second answer' },
    answer: ['A'],
  },
];
export async function historyAttempt({
  uid = 'alice',
  id = secureId(),
  questions = historyQuestions,
  source = examHistorySource({ kind: 'bank', id: 'gcp-ace' }, uid),
  now = 1000,
  feedbackMode = 'standard',
} = {}) {
  const session = createExamSession(questions, questions.length, 60, {
    now,
    random: () => 0.25,
    feedbackMode,
    idFactory: () => id,
    historyOwner: uid,
    captureHistory: true,
    historySource: source,
  });
  session.answers = session.questions.map((question) =>
    Array.isArray(question.answer) && question.answer.length === 1
      ? question.answer[0]
      : structuredClone(question.answer)
  );
  return createHistoryAttempt(finishExam(session, now + 1000, true), uid, questions);
}
