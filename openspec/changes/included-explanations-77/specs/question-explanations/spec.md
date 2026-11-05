# Spec Delta

## Purpose

Let learners read bank-supplied explanations directly and choose generated assistance explicitly while preserving study-mode answer visibility and private AI state.

## ADDED Requirements

### Requirement: CQ-EXPLAIN-01 Included content without generation

Explain SHALL open included content in Practice and submitted-exam review without initiating credential/profile reads, quota requests or inference for that action.

#### Scenario: Guest without a key

- **WHEN** a guest opens Explain for a question with included content
- **THEN** the reference is readable, no setup/sign-in dialog is forced and the action makes no credential, quota or inference request

#### Scenario: No included content

- **WHEN** an eligible question has an empty or missing explanation
- **THEN** the panel states that no explanation is included and offers an explicit AI action without starting it

### Requirement: CQ-EXPLAIN-02 Explicit generated assistance

AI generation SHALL require a separate learner action and preserve current source selection, authentication, quota, cache, retry and Vietnamese-output policies.

#### Scenario: Request AI help

- **WHEN** the learner chooses the AI action
- **THEN** existing setup/permission/quota rules apply and included content remains distinguishable from generated content

#### Scenario: Generation fails

- **WHEN** generation fails, is cancelled or exhausts the selected source's quota
- **THEN** included content stays usable and retry does not silently switch sources or consume an unrelated attempt

### Requirement: CQ-EXPLAIN-03 Mode and account boundaries

Active Standard and Learning exams SHALL retain their current Explain-access restriction; question/account changes SHALL clear stale generated state.

#### Scenario: Active exam

- **WHEN** either exam mode is still running
- **THEN** Explain does not expose included or generated answers, even if the current answer is complete

#### Scenario: Navigate or switch account

- **WHEN** the question or account changes while the panel/request is open
- **THEN** stale content cannot appear under the new question/account and closing restores focus to the current valid trigger

### Requirement: CQ-EXPLAIN-04 Readable source-labelled content

The panel SHALL label included content as supplied with the quiz, render it safely and preserve its language, readable long content and keyboard/phone accessibility.

#### Scenario: Long or unsafe Markdown

- **WHEN** included content contains long tokens, links or HTML-like markup
- **THEN** the established sanitizer rules apply, content stays within the viewport and the source is not presented as independently verified
