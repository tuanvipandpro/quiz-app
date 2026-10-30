import { customQuizError, normalizeCustomError } from '../utils/customQuizModel.js';

export function createCustomQuizStore(service, { onInvalidate = () => {} } = {}) {
  let state = { uid: null, quizzes: [], loading: false, error: null, pending: null };
  let active = false,
    session = 0,
    request = 0,
    stop = null;
  const listeners = new Set();
  const publish = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const stopWatching = () => {
    request++;
    stop?.();
    stop = null;
  };
  const receive = (quizzes) => {
    for (const previous of state.quizzes) {
      const next = quizzes.find((quiz) => quiz.slotId === previous.slotId);
      if (
        !next ||
        next.instanceId !== previous.instanceId ||
        next.contentVersion !== previous.contentVersion
      )
        onInvalidate(state.uid, previous);
    }
    publish({ quizzes, loading: false, error: null });
  };
  function watch(uid, epoch, token) {
    if (!active || session !== epoch || request !== token || !service.subscribe) return;
    stop = service.subscribe(
      uid,
      (quizzes) => {
        if (session === epoch && request === token) receive(quizzes);
      },
      (error) => {
        if (session === epoch && request === token)
          publish({ error: normalizeCustomError(error), loading: false });
      }
    );
  }
  async function reload() {
    if (!active || !state.uid) return;
    stopWatching();
    const uid = state.uid,
      epoch = session,
      token = request;
    publish({ loading: true, error: null });
    try {
      const quizzes = await service.list(uid);
      if (session !== epoch || request !== token) return;
      receive(quizzes);
      watch(uid, epoch, token);
    } catch (error) {
      if (session === epoch && request === token)
        publish({ error: normalizeCustomError(error), loading: false });
    }
  }
  async function mutate(method, ...args) {
    const uid = state.uid,
      epoch = session;
    if (!uid) throw customQuizError('AUTH');
    if (state.pending) throw customQuizError('BUSY');
    stopWatching();
    publish({ pending: method });
    try {
      const slot = await service[method](uid, ...args);
      if (session !== epoch) throw customQuizError('SESSION_CHANGED');
      if (method === 'replace' || method === 'remove') onInvalidate(uid, args[0]);
      const quizzes = await service.list(uid);
      if (session !== epoch) throw customQuizError('SESSION_CHANGED');
      receive(quizzes);
      return quizzes.find((quiz) => quiz.slotId === slot) || null;
    } catch (error) {
      throw normalizeCustomError(error);
    } finally {
      if (session === epoch) {
        publish({ pending: null });
        watch(uid, epoch, request);
      }
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    activate(uid, enabled) {
      stopWatching();
      active = !!uid && enabled;
      if (state.uid !== (uid || null)) {
        session++;
        publish({ uid: uid || null, quizzes: [], error: null, pending: null, loading: active });
      }
      if (active) return reload();
      publish({ loading: false });
    },
    reload,
    create: (...args) => mutate('create', ...args),
    rename: (...args) => mutate('rename', ...args),
    replace: (...args) => mutate('replace', ...args),
    remove: (...args) => mutate('remove', ...args),
    checkpoint: (...args) => mutate('checkpoint', ...args),
  };
}
