# Spec Delta

## Purpose

Let guests and signed-in learners discover real quiz-bank additions and changes through reviewed metadata with useful bank links and honest release provenance.

## ADDED Requirements

### Requirement: CQ-UPDATES-01 Reviewed catalog changes

Public update entries SHALL identify the canonical bank, added/updated kind, verified content date, concise summary and source revision; a UI build alone SHALL NOT create a content-update claim.

#### Scenario: Publish an entry

- **WHEN** a maintainer adds an update entry
- **THEN** its date, bank and summary are checked against the actual source change, and the linked bank exists under its stable identity

#### Scenario: Missing or invalid metadata

- **WHEN** an entry has an invalid date, unknown bank or unsupported claim
- **THEN** validation rejects it before publication rather than inventing history or silently relabelling the bank

### Requirement: CQ-UPDATES-02 Public discovery and navigation

Quiz Bank SHALL expose a discoverable public updates view that works for guests, uses existing navigation guards and remains readable with no entries.

#### Scenario: Browse updates

- **WHEN** a learner opens updates and selects a bank
- **THEN** entries appear in deterministic newest-first order and open the correct existing quiz overview without requiring sign-in

#### Scenario: Empty list or active exam

- **WHEN** there are no reviewed entries, or updates navigation would leave an active exam
- **THEN** the empty state is useful and existing Cancel/Leave/Resume behavior remains predictable
