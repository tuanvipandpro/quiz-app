# App AI explanations

## Purpose

Cung cấp lời giải AI có quota cho tài khoản đăng nhập, giữ BYOK cho guest và quyền chọn nguồn AI rõ ràng.

## ADDED Requirements

### Requirement: CQ-AI-01 Authenticated access

The system SHALL require a valid Firebase ID token for every App AI request and isolate quota and results by verified UID. Guests SHALL use BYOK.

#### Scenario: Forged or absent authentication

- **WHEN** a guest or caller with invalid signature, issuer, audience or expired claims calls App AI
- **THEN** access is denied before consuming quota or invoking inference

### Requirement: CQ-AI-02 Free bounded inference

The system SHALL validate structured questions, construct its own VN/EN prompt and enforce an allowlisted free model with bounded input/output. It SHALL remain unavailable until configured and enabled after free-plan and quality verification.

#### Scenario: Oversized or arbitrary model request

- **WHEN** a caller sends invalid questions, excessive bytes or an unsupported payload field
- **THEN** the server rejects the request without inference

### Requirement: CQ-AI-03 Atomic usage limits

The system SHALL enforce daily user and application attempt limits, one pending request per user, and a UTC reset. User-visible counters SHALL reflect server state, including counted failed attempts after dispatch.

#### Scenario: Concurrent last allowance

- **WHEN** requests concurrently compete for the final user or global allowance
- **THEN** only permitted reservations invoke AI and the others receive an actionable limit response

### Requirement: CQ-AI-04 Retry and result privacy

The system SHALL reuse the outcome of the same request ID and payload within its retained daily window, reject ID reuse with changed payload, and scope cached results to the owner. Regenerate SHALL explicitly create a new attempt.

#### Scenario: Response lost or pending

- **WHEN** a caller retries an already reserved request
- **THEN** the server returns the saved result or pending/failed status without another inference call

### Requirement: CQ-AI-05 Explicit source selection

The system SHALL let authenticated users choose App AI or BYOK and SHALL never automatically spend their own provider quota when App AI fails. Guest keys SHALL not be transferred into another account.

#### Scenario: App allowance exhausted

- **WHEN** an authenticated user exhausts App AI quota
- **THEN** the UI shows reset time and allows an explicit switch to BYOK

### Requirement: CQ-AI-06 Account and study compatibility

The system SHALL discard late responses after account, question, language or source changes, preserve Standard Exam answer timing, and leave stored quiz answers and progress unchanged.

#### Scenario: Logout during inference

- **WHEN** Alice logs out or Bob becomes active before Alice's response arrives
- **THEN** Alice's result is not displayed or cached for the new session

### Requirement: CQ-AI-07 Accessible state feedback

The system SHALL provide meaningful loading, remaining quota, reset, unavailable, validation and retry states in VN/EN, light/dark, with usable controls at 320px and larger widths.

#### Scenario: Phone quota failure

- **WHEN** App AI fails on a phone
- **THEN** the error and explicit BYOK choice remain readable, keyboard reachable and within the viewport

#### Scenario: Compact BYOK setup and contextual help

- **WHEN** a user switches the key provider or opens and closes setup help
- **THEN** settings shows one labelled key editor, preserves unsaved provider inputs and keeps save/test/error states accessible on phones in both languages and themes

#### Scenario: Consistent sign-in from AI settings

- **WHEN** a guest selects Sign in from AI settings
- **THEN** the app opens its shared provider sign-in dialog without starting OAuth until Continue with Google is selected, and cancelling returns focus to settings without losing typed keys

#### Scenario: Reduced motion and preference changes

- **WHEN** reduced motion is enabled before loading the app or the preference changes with settings/help open
- **THEN** modal close actions complete, keyboard focus returns to the opener and unsaved provider keys are preserved
