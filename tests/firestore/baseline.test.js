import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

// Fail before creating a client if the runner did not start the local demo emulator.
assert.equal(
  process.env.FIRESTORE_EMULATOR_HOST,
  '127.0.0.1:8080',
  'Use yarn test:rules (loopback emulator only).'
);
assert.equal(
  process.env.GCLOUD_PROJECT,
  'demo-quiz-app',
  'Production project IDs are forbidden in these tests.'
);
let environment;
const owner = () => environment.authenticatedContext('alice').firestore();
const other = () => environment.authenticatedContext('bob').firestore();
const guest = () => environment.unauthenticatedContext().firestore();
const profile = {
  displayName: 'Fixture Alice',
  llmProviders: { gemini: { apiKey: 'fixture-only' } },
  quizProgress: { 'aws-saa': { questionIndex: 2 } },
};

before(async () => {
  const rules = await fs.readFile(
    new URL('../../firebase/baseline/firestore.rules', import.meta.url),
    'utf8'
  );
  const provenance = JSON.parse(
    await fs.readFile(new URL('../../firebase/rules-baseline.json', import.meta.url), 'utf8')
  );
  assert.equal(
    createHash('sha256').update(rules.replaceAll('\r\n', '\n')).digest('hex'),
    provenance.sha256Lf
  );
  assert.equal(provenance.source, 'user-supplied-deployed-rules');
  assert.equal(provenance.managementApiVerified, false);
  environment = await initializeTestEnvironment({
    projectId: 'demo-quiz-app',
    firestore: { host: '127.0.0.1', port: 8080, rules },
  });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/alice'), profile);
    await setDoc(doc(db, 'users/alice/customQuizzes/slot-1'), {
      title: 'Fixture only',
      questions: [],
    });
  });
});
after(async () => environment?.cleanup());

test('owner can read, update and delete their profile and create it again', async () => {
  const ref = doc(owner(), 'users/alice');
  assert.equal((await assertSucceeds(getDoc(ref))).data().displayName, profile.displayName);
  await assertSucceeds(updateDoc(ref, { displayName: 'Updated' }));
  await assertSucceeds(deleteDoc(ref));
  await assertSucceeds(setDoc(ref, profile));
});

test('bank checkpoint writes preserve unrelated profile and checkpoint fields', async () => {
  const ref = doc(owner(), 'users/alice');
  await assertSucceeds(
    updateDoc(ref, { 'quizProgress.gcp-ace': { questionIndex: 9, questionId: 'q10' } })
  );
  const saved = (await getDoc(ref)).data();
  assert.deepEqual(saved.llmProviders, profile.llmProviders);
  assert.deepEqual(saved.quizProgress['aws-saa'], profile.quizProgress['aws-saa']);
  assert.equal(saved.quizProgress['gcp-ace'].questionIndex, 9);
});

for (const actor of [
  { name: 'another account', db: other },
  { name: 'guest', db: guest },
]) {
  test(`${actor.name} cannot read, create, update or delete another profile`, async () => {
    const db = actor.db();
    await assertFails(getDoc(doc(db, 'users/alice')));
    await assertFails(setDoc(doc(db, 'users/charlie'), profile));
    await assertFails(updateDoc(doc(db, 'users/alice'), { displayName: 'Forbidden' }));
    await assertFails(deleteDoc(doc(db, 'users/alice')));
  });
}

test('a signed-in user cannot enumerate all profiles', async () => {
  await assertFails(getDocs(collection(owner(), 'users')));
});

test('parent profile ownership does not grant custom-quiz subcollection access in the baseline', async () => {
  const db = owner();
  await assertFails(getDoc(doc(db, 'users/alice/customQuizzes/slot-1')));
  await assertFails(getDocs(collection(db, 'users/alice/customQuizzes')));
  await assertFails(setDoc(doc(db, 'users/alice/customQuizzes/slot-2'), { title: 'Not enabled' }));
  await assertFails(updateDoc(doc(db, 'users/alice/customQuizzes/slot-1'), { title: 'Forbidden' }));
  await assertFails(deleteDoc(doc(db, 'users/alice/customQuizzes/slot-1')));
});

test('unknown collections remain denied', async () => {
  await assertFails(getDoc(doc(owner(), 'unconfigured/example')));
  await assertFails(setDoc(doc(owner(), 'unconfigured/example'), { value: 1 }));
});
