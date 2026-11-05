# Spec Delta

## Purpose

Provide a clear account workspace for Google identity, existing QuizMos preferences and private quiz management without changing current identity or data-access contracts.

## ADDED Requirements

### Requirement: CQ-ACCOUNT-01 Profile and preferences

An authenticated Profile view SHALL show the current Google identity and expose QuizMos language/theme settings using existing device-local persistence in M1.

#### Scenario: Current account opens Profile

- **WHEN** a signed-in learner opens Profile
- **THEN** the current name, email/avatar where available and Google account source are shown read-only alongside labelled QuizMos settings

#### Scenario: Change a preference or storage is blocked

- **WHEN** the learner changes language/theme or browser preference storage fails
- **THEN** the interface applies the choice through existing controls, retains their defaults and explains device-local scope without changing Google identity or cloud profile fields

### Requirement: CQ-ACCOUNT-02 Guarded account navigation

The account menu SHALL expose Profile and Manage quizzes while retaining AI Settings and Sign out; all navigation SHALL use current exam-leave and focus rules.

#### Scenario: Manage existing quizzes

- **WHEN** a learner chooses Manage quizzes
- **THEN** the existing My quizzes workspace opens with its current owner isolation, quotas and CRUD behavior

#### Scenario: Cancel leaving an exam

- **WHEN** a learner chooses an account destination during an active exam and cancels the leave dialog
- **THEN** the exam, absolute deadline, answers and menu/dialog focus behavior remain intact

### Requirement: CQ-ACCOUNT-03 Loading and account isolation

Profile SHALL avoid previous-account data during auth loading, sign-out and account changes, with a useful guest sign-in entry and recoverable failures.

#### Scenario: Guest deep link or account switch

- **WHEN** a guest opens Profile or the active account changes
- **THEN** no previous identity/private quiz data is displayed, and existing sign-in/account-transition rules determine the destination safely
