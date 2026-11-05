export const historyError = (code) =>
  Object.assign(new Error(`HISTORY_${code}`), { code: `HISTORY_${code}` });
export function normalizeHistoryError(error) {
  if (typeof error?.code === 'string' && error.code.startsWith('HISTORY_')) return error;
  const code = error?.code?.replace('firestore/', '');
  return historyError(
    code === 'permission-denied'
      ? 'PERMISSION'
      : code === 'unauthenticated'
        ? 'AUTH'
        : ['unavailable', 'deadline-exceeded', 'aborted'].includes(code)
          ? 'NETWORK'
          : code === 'invalid-argument'
            ? 'REJECTED'
            : 'UNAVAILABLE'
  );
}
export const HISTORY_MESSAGES = {
  HISTORY_AUTH: 'Sign in to use your exam history.',
  HISTORY_INVALID: 'This exam archive is invalid or uses an unsupported format.',
  HISTORY_QUOTA: 'Your history is full. Delete an older attempt, then retry this result.',
  HISTORY_SIZE: 'This result is too large to archive. It remains in this tab.',
  HISTORY_PERMISSION: 'History access was denied. Please retry later.',
  HISTORY_NETWORK: 'Could not reach exam history. Check your connection and retry.',
  HISTORY_REJECTED: 'The history service rejected this result. It remains in this tab.',
  HISTORY_CONFLICT: 'This attempt already has a different archive. It was not overwritten.',
  HISTORY_SOURCE_CHANGED: 'The saved quiz changed or was removed. This result remains in this tab.',
  HISTORY_DELETED: 'This archive was deleted. This tab result will not recreate it.',
  HISTORY_MISSING: 'This exam archive is no longer available.',
  HISTORY_UNAVAILABLE: 'Exam history is unavailable. Please retry later.',
  HISTORY_SESSION_CHANGED: 'The account changed. Open history from the current account.',
  HISTORY_BUSY: 'Please wait for the current history action.',
};
