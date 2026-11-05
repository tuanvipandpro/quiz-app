export function validateQuizUpdates(entries, catalog) {
  if (!Array.isArray(entries)) throw new Error('Quiz updates must be an array.');
  const ids = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id))
      throw new Error('Quiz update IDs must be nonempty and unique.');
    ids.add(entry.id);
    if (!catalog.some((bank) => bank.id === entry.bankId))
      throw new Error('Quiz updates must reference a canonical bank.');
    if (!['added', 'updated'].includes(entry.kind)) throw new Error('Unknown quiz update kind.');
    const date = new Date(`${entry.date}T00:00:00.000Z`);
    if (
      typeof entry.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      Number.isNaN(date.valueOf()) ||
      date.toISOString().slice(0, 10) !== entry.date
    )
      throw new Error('Quiz updates need a valid ISO content date.');
    if (typeof entry.summary !== 'string' || !entry.summary.trim() || entry.summary.length > 600)
      throw new Error('Quiz updates need a concise reviewed summary.');
    if (typeof entry.sourceRevision !== 'string' || !/^[a-f0-9]{40}$/.test(entry.sourceRevision))
      throw new Error('Quiz updates need a full Git source revision.');
  }
  return [...entries].sort(
    (left, right) => right.date.localeCompare(left.date) || left.id.localeCompare(right.id)
  );
}
