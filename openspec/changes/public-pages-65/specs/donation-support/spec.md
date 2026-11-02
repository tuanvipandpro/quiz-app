# Spec Delta

## Purpose

Allow voluntary support for QuizMos through VietQR bank transfers, with transparent recipient details and usable desktop/phone interactions.

## ADDED Requirements

### Requirement: CQ-DONATE-05 Coffee invitation with complete transfer details

Donate SHALL use coffee-invitation imagery/copy while retaining QR, bank, recipient, account number, transfer note, copy/download, mobile instructions and manual-transfer status. Users still enter the amount in their banking app; no amount selector may misrepresent the static QR.

#### Scenario: Support with a coffee

- **WHEN** Donate opens in EN/VN on desktop/phone or encounters image/copy/download errors
- **THEN** the coffee presentation and complete details/fallbacks remain readable, Back returns Home and transfer behavior stays unchanged

### Requirement: CQ-DONATE-01 Optional public support

The application SHALL provide public `#/donate` without sign-in, explaining the support purpose; every Back button on the page SHALL return Home/landing. Donations SHALL be voluntary and neither block nor unlock study features.

#### Scenario: Visit and refresh

- **WHEN** a guest opens Donate, refreshes or navigates from the footer/landing
- **THEN** Donate opens correctly with EN/VN content and light/dark following shared preferences, and practice remains available without a transfer

#### Scenario: Return from donation

- **WHEN** either the top or bottom Donate Back button is selected
- **THEN** navigation returns Home/landing, and Library remains accessible through main navigation

### Requirement: CQ-DONATE-02 Verified static transfer details

The page SHALL provide only QR/recipient information verified and approved for publication by the owner. The QR SHALL match the bank/account without locking an amount; a displayed name is not bank-provided recipient-verification evidence.

#### Scenario: Verified recipient is available

- **WHEN** valid recipient configuration and QR have been checked in the build
- **THEN** the page shows bank, recipient name, intact account number, suggested transfer note and a clear QR on white, with instructions to verify the recipient and enter an amount in the banking app

#### Scenario: Missing or invalid configuration

- **WHEN** configuration is missing, the asset is unverified or data is invalid
- **THEN** the page shows unavailable without QR/transfer actions for a sample account, while Home/Library remain usable

### Requirement: CQ-DONATE-03 Copy and same-device use

The page SHALL support copying the account number/suggested note and downloading the QR for use on the same phone, with feedback matching the actual action outcome. Transfer information SHALL always remain available as readable text.

#### Scenario: Copy or download succeeds

- **WHEN** the user copies a leading-0 account number, suggested note or downloads the QR
- **THEN** data remains intact, the downloaded image matches the recipient and UI confirms only copy/download actions, not payment

#### Scenario: Clipboard or image fails

- **WHEN** clipboard permission is denied, QR download fails or the image cannot load
- **THEN** UI explains the error near the action and supports manual text selection/copy; failed images are not presented as valid QR, and navigation back to Library remains available

#### Scenario: Repeated action followed by navigation

- **WHEN** users repeatedly copy and leave before async work completes
- **THEN** stale results neither cause errors/misleading notifications on the new page nor create transactions

### Requirement: CQ-DONATE-04 Honest status and data boundaries

V1 SHALL NOT infer receipt from opening the page, scanning/downloading QR or client-side confirmation. The page SHALL NOT request banking credentials, API keys, sender information or receipt images, or write donor/transaction data into profiles.

#### Scenario: User has scanned or transferred

- **WHEN** users scan the QR or transfer independently in their banking app
- **THEN** QuizMos shows no unverified payment-success state and clearly explains that transactions are not tracked automatically

#### Scenario: Guest or account change

- **WHEN** a guest or any account opens the page, signs out or switches accounts
- **THEN** only owner-approved public recipient information appears, without adding Firestore or Worker donation reads/writes
