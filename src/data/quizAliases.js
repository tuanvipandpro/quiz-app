// The old AWS entry contained exactly the same questions as Google ACE.
export const QUIZ_ID_ALIASES = Object.freeze({ 'aws-ace': 'gcp-ace' });

export const canonicalQuizId = (id) =>
  typeof id === 'string' && Object.hasOwn(QUIZ_ID_ALIASES, id) ? QUIZ_ID_ALIASES[id] : id;

export const legacyQuizIds = (id) =>
  Object.keys(QUIZ_ID_ALIASES).filter((alias) => QUIZ_ID_ALIASES[alias] === canonicalQuizId(id));
