import { findQuiz } from '../data/quizzes.js';
import { canonicalQuizId } from '../data/quizAliases.js';
import { parseCloudQuizId } from './customQuizModel.js';
import { questionFingerprint } from './studySession.js';
import { fingerprintQuestions } from './questionFingerprint.js';
import { encodeHistorySnapshot } from './examHistorySnapshot.js';
import { historyError } from './examHistoryErrors.js';
import { UUID_PATTERN } from './secureId.js';
import { EXAM_HISTORY_SCHEMA } from '../data/examHistoryLimits.js';

export function examHistorySource(quiz, uid) {
  if (!uid || !quiz) return null;
  if (quiz.kind === 'bank' && findQuiz(quiz.id))
    return {
      kind: 'bank',
      id: canonicalQuizId(quiz.id),
      title: findQuiz(quiz.id).name,
      slotId: null,
      instanceId: null,
      contentVersion: null,
    };
  const privateId = parseCloudQuizId(quiz.id);
  if (
    quiz.kind === 'cloud-custom' &&
    quiz.owner === uid &&
    privateId &&
    Number.isSafeInteger(quiz.contentVersion) &&
    quiz.contentVersion > 0
  )
    return {
      kind: 'custom',
      id: privateId.instanceId,
      title: quiz.name,
      slotId: privateId.slotId,
      instanceId: privateId.instanceId,
      contentVersion: quiz.contentVersion,
    };
  return null;
}
export function canArchiveExam(session, uid) {
  return (
    !!uid &&
    session.submitted &&
    session.captureHistory === true &&
    session.historyOwner === uid &&
    !!session.historySource &&
    typeof session.attemptId === 'string' &&
    UUID_PATTERN.test(session.attemptId)
  );
}
export async function createHistoryAttempt(session, uid, sourceQuestions) {
  if (!uid || session.historyOwner !== uid) throw historyError('AUTH');
  if (
    !canArchiveExam(session, uid) ||
    !Array.isArray(sourceQuestions) ||
    session.signature !== questionFingerprint(sourceQuestions) ||
    !Number.isSafeInteger(session.endedAt)
  )
    throw historyError('INVALID');
  const selectedIds = new Set(session.questions.map((question) => String(question.id)));
  if (
    (await fingerprintQuestions(session.questions)) !==
    (await fingerprintQuestions(
      sourceQuestions.filter((question) => selectedIds.has(String(question.id)))
    ))
  )
    throw historyError('INVALID');
  const source = {
    ...session.historySource,
    fingerprint: await fingerprintQuestions(sourceQuestions),
  };
  // Build source fields in a fixed order; option order remains meaningful in payloads.
  const canonicalSource = Object.fromEntries(
    ['kind', 'id', 'title', 'fingerprint', 'slotId', 'instanceId', 'contentVersion'].map((key) => [
      key,
      source[key],
    ])
  );
  return encodeHistorySnapshot(
    {
      schemaVersion: EXAM_HISTORY_SCHEMA,
      attemptId: session.attemptId,
      source: canonicalSource,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      elapsedMs: session.startedAt === null ? null : session.endedAt - session.startedAt,
      feedbackMode: session.feedbackMode,
      gradingVersion: session.gradingVersion,
      endReason: session.endReason,
    },
    session.questions,
    session.answers
  );
}
export function retainedHistoryStats(summaries) {
  const groups = new Map();
  for (const summary of summaries) {
    const source = summary.source;
    const key =
      source.kind === 'bank' ? `bank:${canonicalQuizId(source.id)}` : `custom:${source.instanceId}`;
    const score = (summary.correct / summary.questionCount) * 100;
    const previous = groups.get(key);
    if (!previous)
      groups.set(key, { key, title: source.title, count: 1, best: score, last: summary });
    else {
      previous.count++;
      previous.best = Math.max(previous.best, score);
      if (
        summary.endedAt > previous.last.endedAt ||
        (summary.endedAt === previous.last.endedAt && summary.attemptId > previous.last.attemptId)
      ) {
        previous.last = summary;
        previous.title = source.title;
      }
    }
  }
  return [...groups.values()].sort(
    (a, b) => b.last.endedAt - a.last.endedAt || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  );
}
