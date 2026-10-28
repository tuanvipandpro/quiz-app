import { canonicalQuizId } from '../data/quizAliases.js';

function checkpointTime(checkpoint) {
  const value = checkpoint.savedAt;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function isCheckpoint(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    ((Number.isInteger(value.questionIndex) && value.questionIndex >= 0) ||
      ((typeof value.questionId === 'string' || typeof value.questionId === 'number') &&
        String(value.questionId).length > 0))
  );
}

export function normalizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const merged = new Map();
  for (const [id, checkpoint] of Object.entries(value)) {
    if (!isCheckpoint(checkpoint)) continue;
    const canonicalId = canonicalQuizId(id);
    const previous = merged.get(canonicalId);
    if (
      !previous ||
      checkpointTime(checkpoint) > checkpointTime(previous) ||
      (checkpointTime(checkpoint) === checkpointTime(previous) && id === canonicalId)
    ) {
      merged.set(
        canonicalId,
        id === canonicalId ? checkpoint : { ...checkpoint, quizId: canonicalId }
      );
    }
  }
  return Object.fromEntries(merged);
}

export function resolveCheckpoint(questions, checkpoint) {
  if (!questions.length || !isCheckpoint(checkpoint)) return null;
  const hasId = checkpoint.questionId !== undefined && checkpoint.questionId !== null;
  if (hasId) {
    const index = questions.findIndex(
      (question) => String(question.id) === String(checkpoint.questionId)
    );
    if (index !== -1)
      return { index, adjusted: index !== checkpoint.questionIndex, reason: 'moved' };
  }
  const previousIndex =
    Number.isInteger(checkpoint.questionIndex) && checkpoint.questionIndex >= 0
      ? checkpoint.questionIndex
      : 0;
  const index = Math.min(previousIndex, questions.length - 1);
  return {
    index,
    adjusted: hasId || index !== checkpoint.questionIndex,
    reason: hasId ? 'missing' : 'clamped',
  };
}

export function checkpointLabel(checkpoint) {
  return Number.isInteger(checkpoint?.questionIndex) && checkpoint.questionIndex >= 0
    ? `Saved: Q${checkpoint.questionIndex + 1}`
    : 'Saved progress';
}

export function latestSavedQuiz(progress, availableIds) {
  return (
    Object.entries(normalizeProgress(progress))
      .filter(([id]) => availableIds.includes(id))
      .sort((a, b) => checkpointTime(b[1]) - checkpointTime(a[1]))[0]?.[0] || null
  );
}
