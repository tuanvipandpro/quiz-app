import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistorySourceReader } from '../src/services/examHistorySource.js';
import { historyAttempt, historyQuestions } from './fixtures/historyAttempt.js';

test('bank source checks respect BASE_URL, canonical aliases, changed content and missing assets', async () => {
  const { summary } = await historyAttempt();
  let current = historyQuestions,
    status = 200;
  const urls = [];
  const read = createHistorySourceReader(null, {
    baseUrl: '/quiz-app',
    fetchImpl: async (url) => {
      urls.push(url);
      return { ok: status === 200, status, json: async () => current };
    },
  });
  assert.equal((await read('alice', summary.source)).state, 'current');
  assert.match(urls[0], /^\/quiz-app\/quiz\/Google\//);
  current = historyQuestions.map((question) => ({ ...question, question: 'Changed current bank' }));
  assert.equal((await read('alice', summary.source)).state, 'changed');
  status = 404;
  assert.equal((await read('alice', summary.source)).state, 'missing');
  status = 503;
  assert.equal((await read('alice', summary.source)).state, 'unavailable');
  assert.equal((await read('alice', { ...summary.source, id: 'missing-bank' })).state, 'missing');
  await assert.rejects(read(null, summary.source), { code: 'HISTORY_AUTH' });
});
