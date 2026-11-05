import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.GCLOUD_PROJECT, 'demo-quiz-app');
let env;
const db = (uid) =>
  uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore();
before(async () => {
  const observation = JSON.parse(
    await fs.readFile(
      new URL('../../firebase/production-observation.json', import.meta.url),
      'utf8'
    )
  );
  const rules = await fs.readFile(
    new URL('../../firebase/' + observation.rules.snapshot, import.meta.url),
    'utf8'
  );
  assert.equal(
    createHash('sha256').update(rules.replaceAll('\r\n', '\n')).digest('hex'),
    observation.rules.sha256Lf
  );
  assert.equal(observation.rules.managementApiExport, false);
  env = await initializeTestEnvironment({
    projectId: 'demo-quiz-app',
    firestore: { host: '127.0.0.1', port: 8080, rules },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice'), {
      displayName: 'Observed policy fixture',
    });
    await setDoc(doc(context.firestore(), 'users/alice/customQuizzes/slot-1'), {
      title: 'Synthetic content only',
    });
  });
});
after(async () => env?.cleanup());

test('the Console-observed published policy preserves only owner profile CRUD', async () => {
  const ref = doc(db('alice'), 'users/alice');
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, { quizProgress: { 'gcp-ace': { questionIndex: 0 } } }));
  await assertSucceeds(deleteDoc(ref));
  await assertSucceeds(setDoc(ref, { displayName: 'Restored fixture' }));
  for (const actor of ['bob', null]) {
    await assertFails(getDoc(doc(db(actor), 'users/alice')));
    await assertFails(setDoc(doc(db(actor), 'users/alice'), { displayName: 'Forbidden' }));
  }
});

test('the observed policy rejects production-client custom-quiz paths for owner, Bob and guest', async () => {
  for (const actor of ['alice', 'bob', null]) {
    const client = db(actor);
    await assertFails(getDoc(doc(client, 'users/alice/customQuizzes/slot-1')));
    await assertFails(getDocs(collection(client, 'users/alice/customQuizzes')));
    await assertFails(
      setDoc(doc(client, 'users/alice/customQuizzes/slot-2'), { title: 'Not enabled' })
    );
    await assertFails(
      updateDoc(doc(client, 'users/alice/customQuizzes/slot-1'), { title: 'Forbidden' })
    );
    await assertFails(deleteDoc(doc(client, 'users/alice/customQuizzes/slot-1')));
  }
});
