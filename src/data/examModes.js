export const EXAM_FEEDBACK_MODES = [
  {
    id: 'standard',
    label: 'Standard exam',
    description: 'See answers after submitting or when time is up.',
    perQuestion: false,
  },
  {
    id: 'learning',
    label: 'Learning exam',
    description: 'See feedback after answering each question. The timer keeps running.',
    perQuestion: true,
  },
];

export function getExamFeedbackMode(value) {
  return EXAM_FEEDBACK_MODES.find((mode) => mode.id === value) || EXAM_FEEDBACK_MODES[0];
}
