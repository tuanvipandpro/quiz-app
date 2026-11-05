# Spec Delta

## Purpose

Keep study controls and their reserved viewport space correct while screens mount, resize and leave, including delayed browser layout notifications.

## ADDED Requirements

### Requirement: CQ-DOCK-01 Safe control lifetime

Study controls SHALL stop measuring or updating layout after their owning screen is removed, without throwing uncaught errors.

#### Scenario: Leave while a measurement is pending

- **WHEN** a pending measurement arrives after Practice or Exam has navigated to Summary, Library or another screen
- **THEN** it is ignored without accessing a removed element or changing the destination layout

#### Scenario: Replace the active study screen

- **WHEN** an old screen's pending measurement arrives after a new study screen mounts
- **THEN** only the current controls determine their reserved space

### Requirement: CQ-DOCK-02 Accurate reachable layout

Active compact controls SHALL reserve their actual height, respect safe areas and retain reachable navigation/explanation actions as viewport, language or timer layout changes.

#### Scenario: Resize or change language

- **WHEN** a learner changes orientation, crosses the compact breakpoint or switches VN/EN
- **THEN** controls stay within the viewport with 44px minimum touch targets, and content can scroll clear of them

#### Scenario: Finish or leave an exam

- **WHEN** timer content disappears on submission, or the study screen unmounts
- **THEN** reserved space is recalculated or removed without stale padding, lost focus or changed answers/deadlines
