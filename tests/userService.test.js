import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { keysFromProfile } from '../src/services/llm/credentials.js';

// Exercise the actual service against an in-memory Firestore boundary, never a live profile.
const documents = new Map();
const deleted = Symbol('deleteField');
const writes = [];
let denyWrites = false;
let denyReads = false;
globalThis.__quizFirestore = {
  getFirestore: () => ({}),
  doc: (_, collection, uid) => `${collection}/${uid}`,
  getDoc: async (path) => {
    if (denyReads) throw new Error('Permission denied');
    return { exists: () => documents.has(path), data: () => documents.get(path) };
  },
  setDoc: async (path, data) => documents.set(path, data),
  updateDoc: async (path, fields) => {
    if (denyWrites) throw new Error('Permission denied');
    writes.push({ path, fields });
    const data = structuredClone(documents.get(path));
    for (const [field, value] of Object.entries(fields)) {
      const parts = field.split('.');
      let target = data;
      for (const part of parts.slice(0, -1)) target = target[part] ||= {};
      if (value === deleted) delete target[parts.at(-1)];
      else target[parts.at(-1)] = value;
    }
    documents.set(path, data);
  },
  deleteField: () => deleted,
  serverTimestamp: () => 'server-time',
};
const original = await readFile(new URL('../src/services/userService.js', import.meta.url), 'utf8');
const source = original
  .replace(
    /import\s*\{([\s\S]*?)\}\s*from 'firebase\/firestore';/,
    'const {$1} = globalThis.__quizFirestore;'
  )
  .replace("import app from '../config/firebase';", 'const app = {};')
  .replace(
    "'../data/quizAliases.js'",
    JSON.stringify(new URL('../src/data/quizAliases.js', import.meta.url).href)
  )
  .replace(
    "'../utils/quizProgress.js'",
    JSON.stringify(new URL('../src/utils/quizProgress.js', import.meta.url).href)
  );
const service = (
  await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
).default;
delete globalThis.__quizFirestore;

test('new profiles use the multi-provider schema', async () => {
  const result = await service.createUser({ uid: 'new', email: 'test@example.test' });
  assert.equal(result.success, true);
  assert.deepEqual(keysFromProfile(result.user), { gemini: '', groq: '' });
  assert.deepEqual(result.user.llmProviders, { gemini: { apiKey: null }, groq: { apiKey: null } });
  assert.equal(result.user.geminiApiKey, undefined);
});

test('saving a legacy Gemini key migrates atomically and preserves Groq and quiz progress', async () => {
  documents.set('users/a', {
    geminiApiKey: 'old',
    llmProviders: { groq: { apiKey: 'q' } },
    quizProgress: { sample: 7 },
  });
  assert.equal((await service.saveLlmApiKey('a', 'gemini', 'new')).success, true);
  const profile = documents.get('users/a');
  assert.equal(profile.geminiApiKey, undefined);
  assert.deepEqual(keysFromProfile(profile), { gemini: 'new', groq: 'q' });
  assert.deepEqual(profile.quizProgress, { sample: 7 });
  assert.equal(writes.length, 1);
});
test('clearing a Gemini key stays cleared after the next profile read', async () => {
  documents.set('users/b', { geminiApiKey: 'old' });
  assert.equal((await service.clearGeminiApiKey('b')).success, true);
  assert.equal(await service.getGeminiApiKey('b'), null);
  assert.equal(keysFromProfile(documents.get('users/b')).gemini, '');
});
test('saving Groq keeps existing legacy Gemini available until migration', async () => {
  documents.set('users/c', { geminiApiKey: 'old' });
  await service.saveLlmApiKey('c', 'groq', 'q');
  assert.deepEqual(keysFromProfile(documents.get('users/c')), { gemini: 'old', groq: 'q' });
});
test('profile permission errors are returned to the credential store', async () => {
  documents.set('users/d', { geminiApiKey: 'old' });
  denyWrites = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal((await service.saveLlmApiKey('d', 'gemini', 'new')).success, false);
    assert.equal(await service.getGeminiApiKey('d'), 'old');
  } finally {
    denyWrites = false;
    console.error = originalError;
  }
});

test('saving two quizzes preserves both checkpoints, profile keys, and question zero', async () => {
  documents.set('users/progress', { llmProviders: { groq: { apiKey: 'test-key' } } });
  assert.equal((await service.saveQuizProgress('progress', 'quiz-a', 0, 'first')).success, true);
  assert.equal((await service.saveQuizProgress('progress', 'quiz-b', 19, 20)).success, true);
  const checkpoints = await service.getAllQuizProgress('progress');
  assert.equal(checkpoints['quiz-a'].questionIndex, 0);
  assert.equal(checkpoints['quiz-a'].questionId, 'first');
  assert.equal(checkpoints['quiz-b'].questionId, '20');
  assert.equal(documents.get('users/progress').llmProviders.groq.apiKey, 'test-key');
  await service.clearQuizProgress('progress', 'quiz-a');
  assert.equal(await service.getQuizProgress('progress', 'quiz-a'), null);
  assert.equal((await service.getQuizProgress('progress', 'quiz-b')).questionIndex, 19);
});

test('progress write failures do not modify the saved checkpoint', async () => {
  documents.set('users/failure', { quizProgress: { 'quiz-a': { questionIndex: 0 } } });
  denyWrites = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal((await service.saveQuizProgress('failure', 'quiz-a', 5, 'sixth')).success, false);
    assert.equal((await service.clearQuizProgress('failure', 'quiz-a')).success, false);
    assert.equal((await service.getQuizProgress('failure', 'quiz-a')).questionIndex, 0);
  } finally {
    denyWrites = false;
    console.error = originalError;
  }
});

test('failed progress reads reject instead of masquerading as no saved progress', async () => {
  denyReads = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    await assert.rejects(service.getAllQuizProgress('progress'), /Could not load/);
    await assert.rejects(service.getQuizProgress('progress', 'quiz-b'), /Could not load/);
  } finally {
    denyReads = false;
    console.error = originalError;
  }
});

test('ACE reads merge checkpoints without writing and saves/removals clear the legacy key atomically', async () => {
  documents.set('users/ace', {
    quizProgress: {
      'aws-ace': { questionIndex: 10, savedAt: 20 },
      'gcp-ace': { questionIndex: 2, savedAt: 10 },
      unrelated: { questionIndex: 7 },
    },
  });
  const before = writes.length;
  assert.equal((await service.getQuizProgress('ace', 'gcp-ace')).questionIndex, 10);
  assert.equal((await service.getQuizProgress('ace', 'aws-ace')).questionIndex, 10);
  assert.equal(writes.length, before);
  await service.saveQuizProgress('ace', 'aws-ace', 12, 'q13');
  assert.equal(writes.length, before + 1);
  assert.equal(writes.at(-1).fields['quizProgress.aws-ace'], deleted);
  assert.equal(writes.at(-1).fields['quizProgress.gcp-ace'].questionIndex, 12);
  assert.equal((await service.getQuizProgress('ace', 'gcp-ace')).questionIndex, 12);
  documents.get('users/ace').quizProgress['aws-ace'] = { questionIndex: 1 };
  await service.clearQuizProgress('ace', 'gcp-ace');
  assert.equal(writes.at(-1).fields['quizProgress.aws-ace'], deleted);
  assert.deepEqual(await service.getAllQuizProgress('ace'), { unrelated: { questionIndex: 7 } });
});

test('a denied ACE migration cannot partially remove either checkpoint', async () => {
  const profile = {
    quizProgress: {
      'aws-ace': { questionIndex: 8, savedAt: 30 },
      'gcp-ace': { questionIndex: 3, savedAt: 10 },
    },
  };
  documents.set('users/ace-denied', structuredClone(profile));
  denyWrites = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal((await service.saveQuizProgress('ace-denied', 'gcp-ace', 11)).success, false);
    assert.equal((await service.clearQuizProgress('ace-denied', 'aws-ace')).success, false);
    assert.deepEqual(documents.get('users/ace-denied'), profile);
    assert.equal((await service.getQuizProgress('ace-denied', 'gcp-ace')).questionIndex, 8);
  } finally {
    denyWrites = false;
    console.error = originalError;
  }
});
