const quickSummaries = {
  'anthropic-cca-f': {
    status: 'published',
    metadataPath: 'summaries/anthropic-cca-f/meta.json',
  },
  'anthropic-ccar-p': {
    status: 'published',
    metadataPath: 'summaries/anthropic-ccar-p/meta.json',
  },
  'anthropic-ccao-f': {
    status: 'published',
    metadataPath: 'summaries/anthropic-ccao-f/meta.json',
  },
  'anthropic-ccdv-f': {
    status: 'published',
    metadataPath: 'summaries/anthropic-ccdv-f/meta.json',
  },
  'aws-aip-c01': {
    status: 'published',
    metadataPath: 'summaries/aws-aip-c01/meta.json',
  },
};

export function getQuickSummary(quizId) {
  const entry = Object.hasOwn(quickSummaries, quizId) ? quickSummaries[quizId] : null;
  return entry?.status === 'published' ? entry : null;
}
