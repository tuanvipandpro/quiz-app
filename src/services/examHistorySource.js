import { doc, getDocFromServer } from 'firebase/firestore';
import { findQuiz } from '../data/quizzes.js';
import { fingerprintQuestions } from '../utils/questionFingerprint.js';
import { cloudQuizId, validateCustomQuestions } from '../utils/customQuizModel.js';
import { quizUrl } from '../utils/navigation.js';
import { validateQuizQuestions } from '../utils/questionModel.js';
import { historyError } from '../utils/examHistoryErrors.js';

export function createHistorySourceReader(
  db,
  { fetchImpl = globalThis.fetch, baseUrl = '/' } = {}
) {
  return async (uid, source) => {
    if (!uid || typeof uid !== 'string' || uid.includes('/')) throw historyError('AUTH');
    if (source.kind === 'bank') {
      const bank = findQuiz(source.id);
      if (!bank) return { state: 'missing' };
      const prefix = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const response = await fetchImpl(prefix + bank.file);
      if (!response.ok) return { state: response.status === 404 ? 'missing' : 'unavailable' };
      const questions = await response.json();
      validateQuizQuestions(questions, { allowLegacyIncomplete: true });
      return {
        state:
          (await fingerprintQuestions(questions)) === source.fingerprint ? 'current' : 'changed',
        url: quizUrl(bank.id),
      };
    }
    const snapshot = await getDocFromServer(doc(db, 'users', uid, 'customQuizzes', source.slotId));
    if (!snapshot.exists()) return { state: 'missing' };
    const current = snapshot.data();
    if (current.instanceId !== source.instanceId) return { state: 'replaced' };
    validateCustomQuestions(current.questions);
    return {
      state:
        current.contentVersion === source.contentVersion &&
        (await fingerprintQuestions(current.questions)) === source.fingerprint
          ? 'current'
          : 'changed',
      url: quizUrl(cloudQuizId(source.slotId, source.instanceId), 'overview', {
        version: String(current.contentVersion),
      }),
    };
  };
}
