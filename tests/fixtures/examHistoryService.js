import { decodeHistorySnapshot } from '../../src/utils/examHistorySnapshot.js';
import { historyError } from '../../src/utils/examHistoryErrors.js';
import { findQuiz } from '../../src/data/quizzes.js';
import { fingerprintQuestions } from '../../src/utils/questionFingerprint.js';
import { quizUrl } from '../../src/utils/navigation.js';
import { cloudQuizId } from '../../src/utils/customQuizModel.js';

const key = (uid) => 'quiz-e2e-history:' + uid;
const read = (uid) =>
  JSON.parse(localStorage.getItem(key(uid)) || '{"attempts":{},"receipts":{},"revision":0}');
const write = (uid, value) => localStorage.setItem(key(uid), JSON.stringify(value));
const owner = (uid) => {
  if (!uid || JSON.parse(localStorage.getItem('quiz-e2e-auth') || 'null')?.uid !== uid)
    throw historyError('AUTH');
};
async function before(method, uid) {
  owner(uid);
  (window.quizHistoryCalls ||= []).push({ method, uid });
  if (sessionStorage.getItem('quiz-e2e-history-defer:' + method))
    await new Promise((resolve) =>
      window.addEventListener('quiz-e2e-history-release:' + method, resolve, { once: true })
    );
  owner(uid);
  const error = sessionStorage.getItem('quiz-e2e-history-error:' + method);
  if (error) throw historyError(error);
  if (!navigator.onLine) throw historyError('NETWORK');
}
const ordered = (value) =>
  Object.values(value.attempts)
    .map((attempt) => attempt.summary)
    .sort(
      (a, b) =>
        b.endedAt - a.endedAt ||
        (a.attemptId > b.attemptId ? -1 : a.attemptId < b.attemptId ? 1 : 0)
    );
export default {
  async state(uid) {
    await before('state', uid);
    const data = read(uid);
    return { count: Object.keys(data.attempts).length, revision: data.revision };
  },
  async listPage(uid, after) {
    await before('list', uid);
    const rows = ordered(read(uid)).filter(
      (row) =>
        !after ||
        row.endedAt < after.endedAt ||
        (row.endedAt === after.endedAt && row.attemptId < after.attemptId)
    );
    const summaries = rows.slice(0, 20),
      last = summaries.at(-1);
    return {
      summaries,
      next: summaries.length === 20 ? { attemptId: last.attemptId, endedAt: last.endedAt } : null,
    };
  },
  async get(uid, id) {
    await before('get', uid);
    const attempt = read(uid).attempts[id];
    if (!attempt) throw historyError('MISSING');
    return {
      summary: attempt.summary,
      payload: await decodeHistorySnapshot(attempt.summary, attempt.snapshot),
    };
  },
  async save(uid, attempt) {
    await before('save', uid);
    await decodeHistorySnapshot(attempt.summary, attempt.snapshot);
    owner(uid);
    const data = read(uid),
      id = attempt.summary.attemptId,
      receipt = data.receipts[id];
    if (receipt?.state === 'deleted') throw historyError('DELETED');
    if (receipt) {
      if (!data.attempts[id] || data.attempts[id].snapshot.payload !== attempt.snapshot.payload)
        throw historyError('CONFLICT');
      return data.attempts[id].summary;
    }
    if (Object.keys(data.attempts).length >= 50) throw historyError('QUOTA');
    const source = attempt.summary.source;
    if (source.kind === 'custom') {
      const current = JSON.parse(localStorage.getItem('quiz-e2e-custom:' + uid) || '{}')[
        source.slotId
      ];
      if (
        !current ||
        current.instanceId !== source.instanceId ||
        current.contentVersion !== source.contentVersion
      )
        throw historyError('SOURCE_CHANGED');
    }
    data.attempts[id] = attempt;
    data.receipts[id] = { state: 'saved', payloadHash: attempt.summary.payloadHash };
    data.revision++;
    write(uid, data);
    if (sessionStorage.getItem('quiz-e2e-history-drop-response')) {
      sessionStorage.removeItem('quiz-e2e-history-drop-response');
      throw historyError('NETWORK');
    }
    return attempt.summary;
  },
  async remove(uid, id) {
    await before('remove', uid);
    const data = read(uid);
    if (data.receipts[id]?.state === 'deleted') return;
    if (!data.attempts[id]) throw historyError('MISSING');
    delete data.attempts[id];
    data.receipts[id] = { state: 'deleted' };
    data.revision++;
    write(uid, data);
  },
  async sourceStatus(uid, source) {
    await before('source', uid);
    if (source.kind === 'bank') {
      const bank = findQuiz(source.id);
      if (!bank) return { state: 'missing' };
      const response = await fetch(import.meta.env.BASE_URL + bank.file);
      if (!response.ok) return { state: 'missing' };
      return {
        state:
          (await fingerprintQuestions(await response.json())) === source.fingerprint
            ? 'current'
            : 'changed',
        url: quizUrl(bank.id),
      };
    }
    const current = JSON.parse(localStorage.getItem('quiz-e2e-custom:' + uid) || '{}')[
      source.slotId
    ];
    if (!current) return { state: 'missing' };
    if (current.instanceId !== source.instanceId) return { state: 'replaced' };
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
  },
};
