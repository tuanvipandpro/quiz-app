let enabled = false;
try {
  enabled = sessionStorage.getItem('quiz-e2e-history-enabled') === '1';
} catch {
  /* Fail closed. */
}
export const EXAM_HISTORY_ENABLED = enabled;
