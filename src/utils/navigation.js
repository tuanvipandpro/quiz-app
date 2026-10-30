import { canonicalQuizId } from '../data/quizAliases.js';

export function canonicalQuizHash(hash) {
  return hash.replace(/^(#\/quiz\/)([^/?]+)/, (match, prefix, encodedId) => {
    try {
      const id = decodeURIComponent(encodedId);
      return id === canonicalQuizId(id) ? match : prefix + encodeURIComponent(canonicalQuizId(id));
    } catch {
      return match;
    }
  });
}

export function parseRoute(hash) {
  try {
    const [path, query = ''] = hash.replace(/^#/, '').split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'my-quizzes')
      return { page: 'my-quizzes', params: new URLSearchParams(query) };
    if (parts[0] === 'quiz' && parts[1])
      return {
        page: 'quiz',
        quizId: canonicalQuizId(parts[1]),
        mode: ['practice', 'exam', 'summary'].includes(parts[2]) ? parts[2] : 'overview',
        params: new URLSearchParams(query),
      };
  } catch {
    /* Unknown and malformed links return to the library. */
  }
  return { page: 'library', params: new URLSearchParams() };
}

export function quizUrl(id, mode = 'overview', params = {}) {
  const query = new URLSearchParams(params).toString();
  return `#/quiz/${encodeURIComponent(canonicalQuizId(id))}${mode === 'overview' ? '' : '/' + mode}${query ? '?' + query : ''}`;
}

export function resolveLoadedQuiz(loaded, quizId, uid) {
  if (!loaded || loaded.id !== quizId) return null;
  if ((loaded.id === 'custom' || loaded.kind === 'cloud-custom') && loaded.owner !== uid)
    return null;
  return loaded;
}
