import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createExamSession,
  examStats,
  finishExam,
  initialStudySession,
  questionFingerprint,
  readStudySession,
  sessionKey,
  clearStudySessions,
} from '../src/utils/studySession.js';
import { emptyAnswer } from '../src/utils/questionModel.js';

const questions = [
  { id: 'one', question: 'Pick one', options: { A: 'First', B: 'Second' }, answer: ['A'] },
  {
    id: 'two',
    question: 'Pick two',
    options: { A: 'First', B: 'Second', C: 'Third' },
    answer: ['A', 'C'],
  },
  {
    id: 'three',
    type: 'yes_no',
    question: 'Decide',
    statements: [
      { id: 's1', text: 'First statement' },
      { id: 's2', text: 'Second statement' },
    ],
    options: { Y: 'Yes', N: 'No' },
    answer: { s1: 'Y', s2: 'N' },
  },
];
const storage = () => {
  const values = {};
  Object.defineProperties(values, {
    getItem: { value: (key) => values[key] ?? null },
    setItem: {
      value: (key, value) => {
        values[key] = value;
      },
    },
    removeItem: {
      value: (key) => {
        delete values[key];
      },
    },
  });
  return values;
};

test('Google ACE restores a legacy practice draft within the same account and preserves existing canonical answers', () => {
  const store = storage();
  const legacyKey = 'quiz-study-v1:alice:aws-ace:practice';
  const key = sessionKey('alice', 'gcp-ace', 'practice');
  const draft = {
    signature: questionFingerprint(questions),
    index: 1,
    answers: ['A', ['A', 'C'], {}],
  };
  store.setItem(legacyKey, JSON.stringify(draft));
  assert.equal(sessionKey('alice', 'aws-ace', 'practice'), key);
  assert.deepEqual(readStudySession(store, key, questions, 'practice'), draft);
  assert.equal(
    readStudySession(store, sessionKey('bob', 'gcp-ace', 'practice'), questions, 'practice'),
    null
  );
  assert.equal(
    readStudySession(store, sessionKey(null, 'gcp-ace', 'practice'), questions, 'practice'),
    null
  );
  const canonical = { ...draft, index: 2 };
  store.setItem(key, JSON.stringify(canonical));
  assert.deepEqual(readStudySession(store, key, questions, 'practice'), canonical);
  assert.equal(
    readStudySession(store, key, [...questions, { ...questions[0], id: 'new' }], 'practice'),
    null
  );
  clearStudySessions(store, 'alice');
  assert.equal(store.getItem(legacyKey), null);
  assert.equal(store.getItem(key), null);
});

test('aliased exam links keep the newest draft, exact shuffle, answers, flags and deadline', () => {
  const store = storage();
  const legacyKey = 'quiz-study-v1:alice:aws-ace:exam';
  const key = sessionKey('alice', 'gcp-ace', 'exam');
  const legacy = {
    ...createExamSession(questions, 3, 60, { now: 2000, random: () => 0.25 }),
    freshToken: '2000',
    index: 1,
    flags: [1],
  };
  legacy.answers[0] = ['A'];
  store.setItem(legacyKey, JSON.stringify(legacy));
  store.setItem(
    key,
    JSON.stringify({ ...createExamSession(questions, 2, 60, { now: 1000 }), freshToken: '1000' })
  );
  const neverCreate = () => {
    throw new Error('Must not restart the timer or reshuffle');
  };
  const restored = initialStudySession(store, key, questions, 'exam', neverCreate, {
    fresh: '2000',
  });
  assert.deepEqual(restored.questions, legacy.questions);
  assert.deepEqual(restored.answers, legacy.answers);
  assert.deepEqual(restored.flags, legacy.flags);
  assert.equal(restored.deadline, legacy.deadline);
  const canonical = { ...legacy, freshToken: '3000', deadline: 3603000 };
  store.setItem(key, JSON.stringify(canonical));
  assert.equal(
    initialStudySession(store, key, questions, 'exam', neverCreate, { fresh: '2000' }).deadline,
    canonical.deadline
  );
});

test('an old resume URL does not reset a continued practice draft to its earlier cloud checkpoint', () => {
  const store = storage();
  const oldLink = '#/quiz/aws-ace/practice?resume=1&entry=100';
  const newLink = '#/quiz/gcp-ace/practice?resume=1&entry=100';
  store.setItem(
    'quiz-study-v1:alice:aws-ace:practice',
    JSON.stringify({
      signature: questionFingerprint(questions),
      index: 2,
      answers: ['A', ['A', 'C'], {}],
      entryToken: oldLink,
    })
  );
  const restored = initialStudySession(
    store,
    sessionKey('alice', 'gcp-ace', 'practice'),
    questions,
    'practice',
    () => {
      throw new Error('Must restore');
    },
    { initialIndex: 0, entryToken: newLink }
  );
  assert.equal(restored.index, 2);
  assert.equal(restored.entryToken, newLink);
  assert.deepEqual(restored.answers[1], ['A', 'C']);
});

test('reopening a new-exam URL restores the exact order, choices, answers and deadline', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'exam');
  const make = () => createExamSession(questions, 3, 60, { now: 1000, random: () => 0.25 });
  const first = initialStudySession(store, key, questions, 'exam', make, { fresh: 'new-exam-1' });
  first.index = 1;
  first.answers[1] = ['A'];
  first.flags = [1];
  store.setItem(key, JSON.stringify(first));
  const restored = initialStudySession(
    store,
    key,
    questions,
    'exam',
    () => {
      throw new Error('Must restore, not recreate');
    },
    { fresh: 'new-exam-1' }
  );
  assert.deepEqual(restored, first);
  assert.equal(restored.deadline, 3601000);
  const fresh = initialStudySession(store, key, questions, 'exam', make, { fresh: 'new-exam-2' });
  assert.equal(fresh.index, 0);
  assert.deepEqual(fresh.answers, fresh.questions.map(emptyAnswer));
});

test('returning to an older exam link cannot reset a newer running exam', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'exam');
  const make = () => createExamSession(questions, 3, 60, { now: 1000 });
  const running = initialStudySession(store, key, questions, 'exam', make, { fresh: '2000' });
  running.answers[0] = 'A';
  store.setItem(key, JSON.stringify(running));
  const restored = initialStudySession(
    store,
    key,
    questions,
    'exam',
    () => {
      throw new Error('Must keep the running exam');
    },
    { fresh: '1000' }
  );
  assert.deepEqual(restored, running);
});

test('cloud resume sets a position once; refreshing keeps the subsequent local position', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'practice');
  const make = () => ({
    signature: questionFingerprint(questions),
    index: 0,
    answers: questions.map(emptyAnswer),
  });
  const resumed = initialStudySession(store, key, questions, 'practice', make, {
    initialIndex: 1,
    entryToken: 'resume-1',
  });
  resumed.index = 2;
  resumed.answers[0] = 'A';
  store.setItem(key, JSON.stringify(resumed));
  const refreshed = initialStudySession(store, key, questions, 'practice', make, {
    initialIndex: 1,
    entryToken: 'resume-1',
  });
  assert.equal(refreshed.index, 2);
  assert.equal(refreshed.answers[0], 'A');
  assert.equal(
    initialStudySession(store, key, questions, 'practice', make, {
      initialIndex: 1,
      entryToken: 'resume-2',
    }).index,
    1
  );
});

test('content changes, corrupted storage and invalid sessions never restore a different quiz', () => {
  const store = storage();
  const key = sessionKey(null, 'bank', 'exam');
  const session = createExamSession(questions, 80, 60, { now: 1000 });
  store.setItem(key, JSON.stringify(session));
  assert.equal(session.questions.length, questions.length);
  const changed = questions.map((question, index) =>
    index === 0 ? { ...question, answer: ['B'] } : question
  );
  assert.equal(readStudySession(store, key, changed, 'exam'), null);
  for (const corrupt of [
    '{',
    JSON.stringify({ ...session, questions: [{ ...questions[0], id: 'unknown' }] }),
    JSON.stringify({ ...session, index: 900 }),
    JSON.stringify({ ...session, answers: [] }),
    JSON.stringify({ ...session, flags: [-1] }),
  ]) {
    store.setItem(key, corrupt);
    assert.equal(readStudySession(store, key, questions, 'exam'), null);
  }
  assert.equal(
    readStudySession(
      {
        getItem() {
          throw new Error('Denied');
        },
      },
      key,
      questions,
      'exam'
    ),
    null
  );
});

test('expiry and manual submission lock the same exam once, without extending its deadline', () => {
  const session = createExamSession(questions, 2, 60, { now: 1000 });
  assert.equal(finishExam(session, session.deadline - 1), session);
  const expired = finishExam(session, session.deadline);
  assert.equal(expired.submitted, true);
  assert.equal(expired.timeExpired, true);
  assert.equal(expired.deadline, session.deadline);
  assert.equal(finishExam(expired, session.deadline + 10000), expired);
  const submitted = finishExam(session, 2000, true);
  assert.equal(submitted.submitted, true);
  assert.equal(submitted.timeExpired, false);
});

test('result counts distinguish incorrect answers from incomplete and unanswered questions', () => {
  assert.deepEqual(examStats({ questions, answers: ['B', ['A'], { s1: 'Y' }] }), {
    correct: 0,
    answered: 1,
    incorrect: 1,
    unanswered: 2,
  });
  assert.deepEqual(examStats({ questions, answers: ['A', ['A', 'C'], { s1: 'Y', s2: 'N' }] }), {
    correct: 3,
    answered: 3,
    incorrect: 0,
    unanswered: 0,
  });
});

test('account changes clear only that account’s drafts and preserve unrelated preferences', () => {
  const store = storage();
  const alice = sessionKey('alice', 'bank', 'practice');
  const bob = sessionKey('bob', 'bank', 'exam');
  assert.notEqual(alice, sessionKey('bob', 'bank', 'practice'));
  store.setItem(alice, '{}');
  store.setItem(bob, '{}');
  store.setItem('quiz-app-language', 'vi');
  clearStudySessions(store, 'alice');
  assert.equal(store.getItem(alice), null);
  assert.equal(store.getItem(bob), '{}');
  assert.equal(store.getItem('quiz-app-language'), 'vi');
});

test('new exams default to Standard unless Learning is explicitly recognized', () => {
  for (const feedbackMode of [undefined, null, '', 'unknown', 'constructor', {}, ['learning']]) {
    const session = createExamSession(questions, 2, 60, { now: 1000, feedbackMode });
    assert.equal(session.feedbackMode, 'standard');
    assert.equal(session.deadline, 3601000);
  }
  assert.equal(
    createExamSession(questions, 2, 60, { feedbackMode: 'learning' }).feedbackMode,
    'learning'
  );
});

test('legacy and invalid feedback values keep a valid draft as Standard without resetting it', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'exam');
  const draft = {
    ...createExamSession(questions, 3, 60, { now: 1000 }),
    index: 1,
    flags: [1],
    freshToken: '1000',
  };
  draft.answers[0] = 'B';
  for (const feedbackMode of [undefined, null, 'invalid', {}, ['learning']]) {
    store.setItem(key, JSON.stringify({ ...draft, feedbackMode }));
    assert.deepEqual(readStudySession(store, key, questions, 'exam'), draft);
  }
});

test('resume keeps the stored feedback mode and only a new exam uses changed settings', () => {
  for (const feedbackMode of ['standard', 'learning']) {
    const store = storage();
    const key = sessionKey('alice', 'bank', 'exam');
    const create = (value) => () =>
      createExamSession(questions, 3, 60, { now: 1000, feedbackMode: value });
    const draft = initialStudySession(store, key, questions, 'exam', create(feedbackMode), {
      fresh: '2000',
    });
    draft.index = 1;
    draft.flags = [1];
    draft.answers[0] = 'B';
    store.setItem(key, JSON.stringify(draft));
    const otherMode = feedbackMode === 'standard' ? 'learning' : 'standard';
    for (const fresh of [null, '2000', '1000']) {
      assert.deepEqual(
        initialStudySession(store, key, questions, 'exam', create(otherMode), { fresh }),
        draft
      );
    }
    const next = initialStudySession(store, key, questions, 'exam', create(otherMode), {
      fresh: '3000',
    });
    assert.equal(next.feedbackMode, otherMode);
    assert.equal(next.index, 0);
    assert.deepEqual(next.flags, []);
    assert.deepEqual(next.answers, next.questions.map(emptyAnswer));
  }
});

test('learning drafts never cross quiz or account boundaries and logout clears their state', () => {
  const store = storage();
  const key = sessionKey('alice', 'one-bank', 'exam');
  store.setItem(
    key,
    JSON.stringify(createExamSession(questions, 3, 60, { feedbackMode: 'learning' }))
  );
  for (const otherKey of [
    sessionKey('bob', 'one-bank', 'exam'),
    sessionKey(null, 'one-bank', 'exam'),
    sessionKey('alice', 'another-bank', 'exam'),
    sessionKey('alice', 'custom', 'exam'),
  ]) {
    const next = initialStudySession(store, otherKey, questions, 'exam', () =>
      createExamSession(questions, 3, 60)
    );
    assert.equal(next.feedbackMode, 'standard');
    assert.deepEqual(next.answers, next.questions.map(emptyAnswer));
  }
  clearStudySessions(store, 'alice');
  assert.equal(store.getItem(key), null);
});

test('both feedback modes retain final answers, mode and deadline after submit or expiry', () => {
  for (const feedbackMode of ['standard', 'learning']) {
    const session = createExamSession([questions[0]], 1, 60, { now: 1000, feedbackMode });
    session.answers[0] = 'B';
    assert.equal(examStats(session).incorrect, 1);
    session.answers[0] = 'A';
    for (const finished of [
      finishExam(session, 2000, true),
      finishExam(session, session.deadline),
    ]) {
      assert.equal(finished.feedbackMode, feedbackMode);
      assert.equal(finished.deadline, session.deadline);
      assert.equal(examStats(finished).correct, 1);
      assert.equal(finishExam(finished, session.deadline + 1000), finished);
    }
  }
});
