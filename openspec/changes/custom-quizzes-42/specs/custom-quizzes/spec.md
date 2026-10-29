# Custom quizzes delta

## Purpose

Cho phép người dùng lưu và quản lý quiz cá nhân riêng tư, tiếp tục học trên nhiều thiết bị, với quota và quy tắc tiến trình rõ ràng. Đây là hợp đồng cho phần triển khai tiếp theo của issue #42, chưa mô tả chức năng đã có trong PR setup.

## ADDED Requirements

### Requirement: CQ-01 Private account ownership

The system SHALL require sign-in for cloud save/management and SHALL restrict each saved quiz to its owner, including direct client SDK requests.

#### Scenario: Guest or another account accesses a quiz

- **WHEN** a guest or Bob attempts to read, list, create, change or delete Alice's private quizzes
- **THEN** access is denied without disclosing quiz contents

#### Scenario: Owner returns on another device

- **WHEN** Alice signs in on another device and opens My quizzes
- **THEN** her saved quizzes are available with their names, counts and progress

### Requirement: CQ-02 Three-quiz quota

The system SHALL permit at most three saved custom quizzes per account; bank quizzes and local previews SHALL NOT consume slots. Quota enforcement SHALL not rely solely on UI state.

#### Scenario: Account is full

- **WHEN** an account with three saved quizzes tries to create a fourth, including through direct SDK writes
- **THEN** creation is denied, existing quizzes remain intact, and the UI offers replacement or deletion

#### Scenario: A deletion releases capacity

- **WHEN** the owner successfully deletes one saved quiz
- **THEN** the UI shows the released capacity and another quiz can be saved

### Requirement: CQ-03 Supported content validation

The system SHALL accept only valid quizzes with 1–100 questions and SHALL validate unique IDs, supported formats, options and answers on import and stored-content reads. Rules SHALL enforce the actual list size and matching questionCount independently of the client.

#### Scenario: Valid boundary files

- **WHEN** the owner saves valid 1-question or 100-question content
- **THEN** it is accepted and each supported question format can be studied

#### Scenario: Invalid or forged content

- **WHEN** content is empty, has 101 questions, malformed JSON, duplicate IDs, invalid answer mappings or a forged questionCount
- **THEN** the relevant validation rejects it and explains the failing field/question where applicable

### Requirement: CQ-04 Document size handling

The system SHALL check the serialized save candidate against a documented byte budget below the Firestore document limit, and SHALL handle server size rejection without reporting success or losing the preview.

#### Scenario: Too large despite an allowed question count

- **WHEN** a quiz has at most 100 questions but exceeds the save budget or server document-size limit
- **THEN** saving fails with an actionable size message and the candidate remains available for correction

### Requirement: CQ-05 Concurrent creation and retries

The system SHALL allocate remaining capacity without overwriting another quiz. Retrying the same save operation SHALL NOT create duplicate saved instances.

#### Scenario: Two tabs compete for one slot

- **WHEN** two different quiz uploads concurrently claim the last free slot
- **THEN** exactly one succeeds and the other receives a conflict/quota result without modifying the winner

#### Scenario: Save response is lost

- **WHEN** a save committed but the response was lost and the user retries the same candidate
- **THEN** the app finds the committed instance instead of consuming another slot

### Requirement: CQ-06 Rename preserves identity

The system SHALL rename a quiz without changing its questions, identity, content version, quota usage or saved learning state.

#### Scenario: Rename a quiz with progress

- **WHEN** the owner changes its title
- **THEN** subsequent listing and study show the new title and the same checkpoint/draft remains valid

### Requirement: CQ-07 Replacement and deletion reset related state

The system SHALL confirm replacement/deletion, explain the progress impact, and reset or remove only the affected quiz's checkpoint and drafts. Replacement SHALL keep the occupied-slot count unchanged.

#### Scenario: Replace content

- **WHEN** the owner confirms a valid replacement JSON
- **THEN** the content version changes, its checkpoint is reset atomically, and old-version drafts cannot resume against the new questions

#### Scenario: Cancel a mutation

- **WHEN** the owner cancels confirmation
- **THEN** content and progress remain unchanged

#### Scenario: Delete the quiz

- **WHEN** the owner confirms deletion
- **THEN** the quiz and its saved checkpoint disappear without changing bank progress

### Requirement: CQ-08 Stale mutation protection

The system SHALL reject stale app updates/deletes that target an older instance or revision of a reused slot; a stale request SHALL NOT modify the slot's new occupant.

#### Scenario: A slot is deleted and reused

- **WHEN** tab A holds the old quiz while tab B deletes it and creates a new quiz in that slot, then tab A submits rename/replace/delete/checkpoint
- **THEN** the request is rejected and tab A is prompted to refresh

### Requirement: CQ-09 Study and progress compatibility

The system SHALL support Practice and Exam for saved custom quizzes and SHALL distinguish bank, tab-upload and cloud-quiz identities. Checkpoints and drafts SHALL be scoped to account, quiz instance and content version.

#### Scenario: Resume or reload

- **WHEN** the owner resumes a saved custom checkpoint or reloads an unchanged active exam
- **THEN** the correct quiz/position is restored; exam shuffle, answers, flags and deadline are retained

#### Scenario: No published guide

- **WHEN** a custom quiz has no corresponding published guide
- **THEN** the UI does not offer a usable Quick Summary action

### Requirement: CQ-10 Clear and responsive management UI

The system SHALL show quota, title/count preview and truthful loading/success/error states, with accessible upload, rename, replace and delete actions following AGENTS.md mobile, VN/EN and theme rules.

#### Scenario: A failed save can be retried

- **WHEN** saving fails due to network, permission, quota, size or conflict
- **THEN** the UI shows the reason, retains valid input and avoids false success or silent overwrite

#### Scenario: Phone management

- **WHEN** the user manages quizzes on 320/390/412px viewports in either language/theme
- **THEN** controls and confirmations remain reachable and meaningful without horizontal overflow or hover-only actions

### Requirement: CQ-11 Account changes and private state

The system SHALL clear private in-memory/tab content on logout/account change and SHALL ignore responses belonging to an earlier account. Bank navigation SHALL remain usable when private-data loading fails.

#### Scenario: Late response after account change

- **WHEN** an Alice request completes after Bob or a guest becomes active
- **THEN** Alice's quiz data is not rendered or applied to the new session

### Requirement: CQ-12 Existing uploads and bank behavior

The system SHALL retain guest tab-upload practice and bank behavior, and SHALL save a local candidate to cloud only after sign-in and an explicit save action. Cloud save SHALL assign cloud identity without silently converting a guest draft/checkpoint.

#### Scenario: Existing local upload

- **WHEN** the user opens a tab containing a local upload
- **THEN** it remains local until explicitly saved, and saving respects validation and available quota

#### Scenario: Existing profile operations

- **WHEN** existing bank checkpoints or AI settings are read/updated after rollout
- **THEN** their existing owner-only profile access continues to work
