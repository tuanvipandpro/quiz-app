import { AI_POLICY, ApiError, utcDay, resetAt } from './config.js';

export function createUsageRepository(db) {
  const get = (uid, id) =>
    db.prepare('SELECT * FROM ai_requests WHERE uid = ? AND request_id = ?').bind(uid, id).first();
  return {
    get,
    async usage(uid, now) {
      const day = utcDay(now);
      const row = await db
        .prepare(
          'SELECT count(*) AS total, sum(CASE WHEN uid = ? THEN 1 ELSE 0 END) AS personal FROM ai_requests WHERE day = ?'
        )
        .bind(uid, day)
        .first();
      return {
        remaining: Math.max(0, AI_POLICY.userLimit - Number(row.personal || 0)),
        limit: AI_POLICY.userLimit,
        available: Number(row.total) < AI_POLICY.globalLimit,
        resetAt: resetAt(now),
        serverTime: now,
      };
    },
    async reserve(uid, id, fingerprint, now) {
      await db
        .prepare(
          "UPDATE ai_requests SET state = 'failed', error = 'TIMEOUT' WHERE uid = ? AND state = 'pending' AND created_at < ?"
        )
        .bind(uid, now - AI_POLICY.pendingLeaseMs)
        .run();
      const previous = await get(uid, id);
      if (previous) return previous;
      try {
        await db
          .prepare(
            "INSERT INTO ai_requests(uid, request_id, day, fingerprint, state, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
          )
          .bind(uid, id, utcDay(now), fingerprint, now)
          .run();
        return null;
      } catch (error) {
        // Another instance may have committed this operation before this insert.
        const committed = await get(uid, id);
        if (committed) return committed;
        const code = ['USER_LIMIT', 'GLOBAL_LIMIT', 'BUSY'].find((value) =>
          error.message.includes(value)
        );
        if (code) throw new ApiError(code, 429);
        throw error;
      }
    },
    async finish(uid, id, result, error = null) {
      await db
        .prepare(
          "UPDATE ai_requests SET state = ?, result = ?, error = ? WHERE uid = ? AND request_id = ? AND state = 'pending'"
        )
        .bind(error ? 'failed' : 'done', result ? JSON.stringify(result) : null, error, uid, id)
        .run();
    },
    async cleanup(now) {
      await db
        .prepare('DELETE FROM ai_requests WHERE created_at < ?')
        .bind(now - AI_POLICY.retentionDays * 86_400_000)
        .run();
    },
  };
}
