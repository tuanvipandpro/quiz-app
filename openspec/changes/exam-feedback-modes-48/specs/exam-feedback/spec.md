# Spec Delta

## Purpose

Let users choose how answers are revealed in mock exams, preserve that policy throughout the session and distinguish feedback-assisted learning results from standard exams.

## ADDED Requirements

### Requirement: CQ48-01 Explicit exam feedback selection

The application SHALL offer Standard exam or Learning exam before a Mock exam starts, defaulting to Standard. The choice applies only to Mock exams and supports existing bank or custom quizzes.

#### Scenario: New exam setup

- **WHEN** a user opens Mock exam setup for a bank or upload
- **THEN** Standard is selected, both options have labels/descriptions, and Practice and Quick Summary retain their behavior

### Requirement: CQ48-02 Standard feedback boundary

Standard SHALL hide correctness, answers and explanations in the UI until the exam ends; submission or expiry opens review.

#### Scenario: Answer before submission

- **WHEN** an answer is complete or incomplete in Standard
- **THEN** feedback, correct-answer styles, explanations and navigator correctness indicators are not shown

#### Scenario: Finished standard exam

- **WHEN** the exam is submitted or its deadline passes
- **THEN** answers are revealed and responses can no longer be edited

### Requirement: CQ48-03 Learning feedback matches answer completeness

Learning SHALL show per-question feedback for complete answers, allow edits until completion and grade final answers. This applies to single, multiple, yes/no and both dropdown formats; it does not invoke AI automatically.

#### Scenario: Complete and incomplete answers

- **WHEN** a single answer is selected, the required number of multiple choices is selected, or every yes/no or dropdown part is completed
- **THEN** the current question shows correctness and answers; incomplete questions do not reveal answers

#### Scenario: Edit after feedback

- **WHEN** an answer is edited and the exam is submitted
- **THEN** results use final answers, identify Learning exam and lock editing

### Requirement: CQ48-04 Preserve exam lifecycle and identity

Both modes SHALL preserve the timer, randomized order, answers, flags, leave/submit confirmations and immutability after completion. Refresh, Back and Resume do not change draft configuration; changing mode requires a new exam and confirmation when replacing an active draft.

#### Scenario: Resume after changing setup

- **WHEN** a user changes setup selection and Resumes an active exam, or reopens a legacy URL with a different value
- **THEN** the draft's mode, deadline, questions and answers are retained; only a new exam uses the new selection

#### Scenario: Expiry races with input

- **WHEN** the deadline passes during input or navigation away
- **THEN** the exam finishes once, without extra time or answers recorded after the deadline; review remains available

### Requirement: CQ48-05 Safe compatibility and account isolation

Drafts/URLs with a missing or invalid mode SHALL use Standard without resetting other valid data. Sessions remain isolated by account and quiz; browser storage errors must use the existing draft-status feedback.

#### Scenario: Legacy and invalid values

- **WHEN** a legacy draft or URL contains an unrecognized mode value
- **THEN** Standard is used, valid deadline/order/answers/flags are retained and feedback is not revealed early

#### Scenario: Account or quiz changes

- **WHEN** the account changes or an exam for another quiz starts
- **THEN** the previous session's mode/answers are not reused, and the old account's state is cleaned up through existing behavior

### Requirement: CQ48-06 Accessible responsive mode communication

The UI SHALL identify the mode during exams and in results, supporting VN/EN and light/dark. Selection groups require accessible labels, clear keyboard focus, targets of at least 44×44px and no horizontal overflow from 320px.

#### Scenario: Phone and keyboard use

- **WHEN** setup, dialogs and active/results screens are used at 320/390/412/768/1280px or in landscape
- **THEN** labels/feedback are clear, controls support touch/keyboard and focus remains usable across dialogs
