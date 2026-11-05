import { EXAM_HISTORY_LIMIT, EXAM_HISTORY_PAGE_SIZE } from '../data/examHistoryLimits.js';
import { historyError, normalizeHistoryError } from '../utils/examHistoryErrors.js';
import { validateHistorySummary } from '../utils/examHistorySnapshot.js';

const empty = (uid) => ({
  uid,
  summaries: [],
  loading: false,
  error: null,
  pending: null,
  record: null,
  recordLoading: false,
  recordError: null,
  sourceStatus: null,
  readId: null,
});
export function createExamHistoryStore(service) {
  let state = empty(null),
    active = false,
    epoch = 0,
    listRequest = 0,
    readRequest = 0;
  const listeners = new Set();
  const publish = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const current = (version) => active && epoch === version;
  async function reload() {
    if (!active) return;
    const uid = state.uid,
      version = epoch,
      token = ++listRequest;
    readRequest++;
    const live = () => current(version) && token === listRequest;
    publish({
      loading: true,
      error: null,
      summaries: [],
      record: null,
      readId: null,
      recordLoading: false,
      recordError: null,
      sourceStatus: null,
    });
    try {
      for (let consistency = 0; consistency < 2; consistency++) {
        const before = await service.state(uid);
        if (!live()) return;
        const rows = [];
        let after = null;
        do {
          const page = await service.listPage(uid, after);
          if (!live()) return;
          if (
            !Array.isArray(page.summaries) ||
            page.summaries.length > EXAM_HISTORY_PAGE_SIZE ||
            (page.next && page.summaries.length !== EXAM_HISTORY_PAGE_SIZE)
          )
            throw historyError('INVALID');
          page.summaries.forEach(validateHistorySummary);
          rows.push(...page.summaries);
          after = page.next;
          if (
            rows.length > EXAM_HISTORY_LIMIT ||
            new Set(rows.map((row) => row.attemptId)).size !== rows.length
          )
            throw historyError('INVALID');
        } while (after);
        const latest = await service.state(uid);
        if (!live()) return;
        if (before.revision === latest.revision && rows.length === latest.count) {
          publish({ summaries: rows, loading: false, error: null });
          return;
        }
      }
      throw historyError('NETWORK');
    } catch (error) {
      if (live()) publish({ loading: false, error: normalizeHistoryError(error), summaries: [] });
    }
  }
  async function read(id) {
    if (!active) return;
    const uid = state.uid,
      version = epoch,
      token = ++readRequest;
    listRequest++;
    const live = () => current(version) && token === readRequest;
    publish({
      readId: id,
      record: null,
      loading: false,
      recordLoading: true,
      recordError: null,
      sourceStatus: null,
    });
    try {
      const record = await service.get(uid, id);
      if (!live()) return;
      validateHistorySummary(record.summary);
      if (record.summary.attemptId !== id) throw historyError('INVALID');
      publish({ record, recordLoading: false, sourceStatus: { state: 'checking' } });
      try {
        const sourceStatus = await service.sourceStatus(uid, record.summary.source);
        if (live()) publish({ sourceStatus });
      } catch {
        if (live()) publish({ sourceStatus: { state: 'unavailable' } });
      }
    } catch (error) {
      if (live()) publish({ recordLoading: false, recordError: normalizeHistoryError(error) });
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    activate(uid, enabled) {
      const next = !!uid && !!enabled;
      if (state.uid === (uid || null) && active === next) return;
      epoch++;
      listRequest++;
      readRequest++;
      active = next;
      publish({ ...empty(uid || null), loading: next });
    },
    reload,
    read,
    async remove(id) {
      if (!active) throw historyError('AUTH');
      if (state.pending) throw historyError('BUSY');
      const uid = state.uid,
        version = epoch;
      publish({ pending: id });
      try {
        await service.remove(uid, id);
        if (!current(version)) throw historyError('SESSION_CHANGED');
        publish({
          summaries: state.summaries.filter((row) => row.attemptId !== id),
          record: state.record?.summary.attemptId === id ? null : state.record,
        });
        await reload();
      } catch (error) {
        throw normalizeHistoryError(error);
      } finally {
        if (current(version)) publish({ pending: null });
      }
    },
  };
}
