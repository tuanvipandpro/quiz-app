const quickSummaries = {
  'anthropic-ccar-p': {
    status: 'published',
    metadataPath: 'summaries/anthropic-ccar-p/meta.json',
  },
};

export function getQuickSummary(quizId) {
  const entry = Object.hasOwn(quickSummaries, quizId) ? quickSummaries[quizId] : null;
  return entry?.status === 'published' ? entry : null;
}
