import { SESSION_PREFIX } from './studySession.js';
import { cloudQuizId } from './customQuizModel.js';

export function clearCustomQuizDrafts(storage, uid, quiz) {
  try {
    const prefix = `${SESSION_PREFIX}${uid}:${cloudQuizId(quiz.slotId, quiz.instanceId)}:v`;
    for (const key of Object.keys(storage)) if (key.startsWith(prefix)) storage.removeItem(key);
  } catch {
    /* Browser storage is optional; versioned identities also prevent restoration. */
  }
}
