import {
  collection,
  doc,
  documentId,
  getDocFromServer,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
} from 'firebase/firestore';
import { EXAM_HISTORY_LIMIT, EXAM_HISTORY_PAGE_SIZE } from '../data/examHistoryLimits.js';
import {
  decodeHistorySnapshot,
  HISTORY_SUMMARY_FIELDS,
  validateHistorySummary,
} from '../utils/examHistorySnapshot.js';
import { historyError, normalizeHistoryError } from '../utils/examHistoryErrors.js';
import { UUID_PATTERN } from '../utils/secureId.js';

const validId = (id) => typeof id === 'string' && UUID_PATTERN.test(id);
const stored = (snapshot, fields) => {
  const data = snapshot.data();
  if (
    !data ||
    Object.keys(data).length !== fields.length + 1 ||
    !fields.every((field) => Object.hasOwn(data, field)) ||
    typeof data.createdAt?.toMillis !== 'function'
  )
    throw historyError('INVALID');
  return Object.fromEntries(fields.map((field) => [field, data[field]]));
};
const readSummary = (snapshot) => validateHistorySummary(stored(snapshot, HISTORY_SUMMARY_FIELDS));
const readPayload = (snapshot) =>
  stored(snapshot, ['schemaVersion', 'attemptId', 'payloadHash', 'payload']);
const readQuota = (snapshot) => {
  if (!snapshot.exists()) return { count: 0, revision: 0 };
  const data = snapshot.data();
  if (
    !Number.isSafeInteger(data.count) ||
    data.count < 0 ||
    data.count > EXAM_HISTORY_LIMIT ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 1
  )
    throw historyError('INVALID');
  return data;
};

/** Online owner-scoped IO. Receipts make deletion terminal for an attempt ID. */
export function createExamHistoryRepository(db, { transact = runTransaction } = {}) {
  const root = (uid) => {
    if (typeof uid !== 'string' || !uid || uid.includes('/')) throw historyError('AUTH');
    return doc(db, 'users', uid);
  };
  const refs = (uid, id) => {
    if (!validId(id)) throw historyError('INVALID');
    const owner = root(uid);
    return {
      summary: doc(collection(owner, 'examAttempts'), id),
      snapshot: doc(collection(owner, 'examAttemptSnapshots'), id),
      receipt: doc(collection(owner, 'examAttemptReceipts'), id),
      quota: doc(collection(owner, 'examHistoryState'), 'quota'),
    };
  };
  const safe =
    (operation) =>
    async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        throw normalizeHistoryError(error);
      }
    };
  const quotaValue = (current, id, operation) => ({
    count: current.count + (operation === 'create' ? 1 : -1),
    revision: current.revision + 1,
    attemptId: id,
    operation,
    updatedAt: serverTimestamp(),
  });
  async function mutate(target, operation) {
    for (let retry = 0; retry < 3; retry++) {
      let observedRevision = null;
      try {
        return await transact(db, async (tx) => {
          const [receipt, summary, snapshot, quota] = await Promise.all([
            tx.get(target.receipt),
            tx.get(target.summary),
            tx.get(target.snapshot),
            tx.get(target.quota),
          ]);
          const current = readQuota(quota);
          observedRevision = current.revision;
          return operation(tx, { receipt, summary, snapshot, current });
        });
      } catch (error) {
        // Coupled Rules may see the winner before a stale transaction's version
        // precondition is checked. Retry only after a server-confirmed revision
        // change; genuine permission denial is never treated as authorization.
        if (
          observedRevision !== null &&
          ['permission-denied', 'firestore/permission-denied'].includes(error?.code)
        ) {
          let latest;
          try {
            latest = readQuota(await getDocFromServer(target.quota));
          } catch {
            throw error;
          }
          if (latest.revision !== observedRevision) continue;
        }
        throw error;
      }
    }
    throw historyError('NETWORK');
  }
  return {
    state: safe(async (uid) => {
      const current = readQuota(
        await getDocFromServer(doc(collection(root(uid), 'examHistoryState'), 'quota'))
      );
      return { count: current.count, revision: current.revision };
    }),
    listPage: safe(async (uid, after = null) => {
      const constraints = [orderBy('endedAt', 'desc'), orderBy(documentId(), 'desc')];
      if (after) {
        if (!Number.isSafeInteger(after.endedAt) || !validId(after.attemptId))
          throw historyError('INVALID');
        constraints.push(startAfter(after.endedAt, after.attemptId));
      }
      constraints.push(limit(EXAM_HISTORY_PAGE_SIZE));
      const snapshot = await getDocsFromServer(
        query(collection(root(uid), 'examAttempts'), ...constraints)
      );
      const summaries = snapshot.docs.map(readSummary),
        last = summaries.at(-1);
      return {
        summaries,
        next:
          summaries.length === EXAM_HISTORY_PAGE_SIZE
            ? { endedAt: last.endedAt, attemptId: last.attemptId }
            : null,
      };
    }),
    get: safe(async (uid, id) => {
      const target = refs(uid, id);
      const [summary, snapshot] = await Promise.all([
        getDocFromServer(target.summary),
        getDocFromServer(target.snapshot),
      ]);
      if (!summary.exists() || !snapshot.exists()) throw historyError('MISSING');
      const record = readSummary(summary);
      return {
        summary: record,
        payload: await decodeHistorySnapshot(record, readPayload(snapshot)),
      };
    }),
    save: safe(async (uid, attempt) => {
      validateHistorySummary(attempt.summary);
      await decodeHistorySnapshot(attempt.summary, attempt.snapshot);
      const id = attempt.summary.attemptId,
        target = refs(uid, id);
      return mutate(target, async (tx, { receipt, summary, snapshot, current }) => {
        if (receipt.exists()) {
          if (receipt.data().state === 'deleted') throw historyError('DELETED');
          if (receipt.data().state !== 'saved' || !summary.exists() || !snapshot.exists())
            throw historyError('INVALID');
          const existing = readSummary(summary),
            envelope = readPayload(snapshot);
          await decodeHistorySnapshot(existing, envelope);
          if (
            existing.payloadHash !== attempt.summary.payloadHash ||
            envelope.payload !== attempt.snapshot.payload ||
            receipt.data().payloadHash !== existing.payloadHash
          )
            throw historyError('CONFLICT');
          return existing;
        }
        if (summary.exists() || snapshot.exists()) throw historyError('INVALID');
        if (current.count >= EXAM_HISTORY_LIMIT) throw historyError('QUOTA');
        const source = attempt.summary.source;
        if (source.kind === 'custom') {
          const currentSource = await tx.get(
            doc(collection(root(uid), 'customQuizzes'), source.slotId)
          );
          if (
            !currentSource.exists() ||
            currentSource.data().instanceId !== source.instanceId ||
            currentSource.data().contentVersion !== source.contentVersion
          )
            throw historyError('SOURCE_CHANGED');
        }
        tx.set(target.summary, { ...attempt.summary, createdAt: serverTimestamp() });
        tx.set(target.snapshot, { ...attempt.snapshot, createdAt: serverTimestamp() });
        tx.set(target.receipt, {
          state: 'saved',
          payloadHash: attempt.summary.payloadHash,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tx.set(target.quota, quotaValue(current, id, 'create'));
        return attempt.summary;
      });
    }),
    remove: safe(async (uid, id) => {
      const target = refs(uid, id);
      return mutate(target, async (tx, { receipt, summary, snapshot, current }) => {
        if (
          receipt.exists() &&
          receipt.data().state === 'deleted' &&
          !summary.exists() &&
          !snapshot.exists()
        )
          return;
        if (!receipt.exists() || !summary.exists()) throw historyError('MISSING');
        const record = readSummary(summary);
        if (
          receipt.data().state !== 'saved' ||
          receipt.data().payloadHash !== record.payloadHash ||
          current.count < 1
        )
          throw historyError('INVALID');
        tx.delete(target.summary);
        tx.delete(target.snapshot);
        tx.set(target.receipt, {
          state: 'deleted',
          createdAt: receipt.data().createdAt,
          deletedAt: serverTimestamp(),
        });
        tx.set(target.quota, quotaValue(current, id, 'delete'));
      });
    }),
  };
}
