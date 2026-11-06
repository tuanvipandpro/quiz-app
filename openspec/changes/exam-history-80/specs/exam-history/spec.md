# Spec Delta

## Purpose

Preserve a learner's completed exam outcomes across sessions with private, version-aware archives that can be reviewed without changing the original scoring context.

## ADDED Requirements

### Requirement: CQ-HISTORY-01 Exam-only archive scope

M1 history SHALL archive submitted/expired Standard and Learning exams for signed-in learners on bank or explicitly saved private quizzes. Practice, guests and unsaved uploads SHALL retain existing tab/checkpoint behavior.

#### Scenario: Eligible exam ends

- **WHEN** a current-account eligible exam is submitted or expires
- **THEN** its terminal result is offered for the account archive with visible saving/saved/failure state

#### Scenario: Guest, Practice or unsaved upload

- **WHEN** these flows are used, or a guest later signs in
- **THEN** no answers or local-upload content are silently copied into cloud history or another account

### Requirement: CQ-HISTORY-02 Immutable idempotent attempts

Each new exam SHALL have a stable attempt identity, and archiving the same terminal result repeatedly SHALL create one immutable result while conflicting payloads are rejected.

#### Scenario: Retry or duplicate submission

- **WHEN** refresh, two tabs or a lost response causes the same attempt to be saved again
- **THEN** identical data resolves to the existing record without consuming another slot, while different data cannot overwrite it

#### Scenario: Resume an older draft

- **WHEN** an active pre-history draft is resumed
- **THEN** an additive attempt identity preserves its questions, answers, mode and deadline; old completed drafts are not automatically backfilled

#### Scenario: Retry an intentionally deleted attempt

- **WHEN** an attempt was saved and then deleted before a stale tab retries or refreshes its terminal draft
- **THEN** a private non-content lifecycle receipt prevents recreation; the result remains local and quota/content deletion is not reversed

### Requirement: CQ-HISTORY-03 Private bounded storage

History SHALL be owner-only with an enforced 50-attempt account cap, immutable archive schema and bounded payloads; queries SHALL load paginated summaries separately from full snapshots.

#### Scenario: Last available slot is contested

- **WHEN** concurrent creates compete for the fiftieth saved attempt
- **THEN** only available capacity is consumed, and direct client writes or quota resets cannot bypass the cap

#### Scenario: Guest, another account or malformed write

- **WHEN** an unauthorized client accesses history, or an owner forges an invalid archive/quota transition
- **THEN** the data policy rejects the operation without changing existing profile, quiz or checkpoint access

### Requirement: CQ-HISTORY-04 Historical scoring context

Historical review SHALL use the archived questions, selected/correct answers, mode and grading-policy version without regrading against the current bank or a reused private slot.

#### Scenario: Bank changes or a private slot is replaced

- **WHEN** a learner opens an older result after source content changes
- **THEN** the original score and question context remain readable with an appropriate source-status label and no mutation of current study state

#### Scenario: Source quiz or illustration is removed

- **WHEN** the original source or referenced image is unavailable
- **THEN** the archive is clearly labelled, the stored text/answers remain usable and a different current question/image is not substituted

### Requirement: CQ-HISTORY-05 Recoverable saves and account transitions

Save failures SHALL preserve the current account's terminal result for explicit tab retry. Account changes SHALL cancel stale work and prevent another account from seeing or retrying private payloads.

#### Scenario: Offline, permission, size or quota failure

- **WHEN** an archive write fails or exceeds the declared snapshot budget
- **THEN** the result remains available in the current tab with a useful error, retry/deletion choice and no fake saved status

#### Scenario: Sign out during a request

- **WHEN** the account changes before a save/read completes
- **THEN** late data cannot populate the next account's UI and existing sign-out draft clearing still applies

### Requirement: CQ-HISTORY-06 History dashboard and deletion

History SHALL show recent attempts and per-bank statistics over retained summaries, with 20-item pages, clear empty/error states and confirmed owner-controlled deletion without silent eviction.

#### Scenario: View or page results

- **WHEN** a learner browses retained history
- **THEN** ordering is deterministic, statistics describe the retained attempts and private banks group by their stable instance rather than a reused slot name

#### Scenario: Delete an archive or fill capacity

- **WHEN** a learner confirms deletion or the account reaches capacity
- **THEN** deletion removes the result and snapshot consistently and frees capacity; a full archive requests an explicit choice rather than overwriting older records
- **AND** deletion retains only the disclosed private anti-replay receipt, with no questions, answers or payload fingerprint
