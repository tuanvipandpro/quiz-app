# User profile access

## Purpose

Ghi nhận hợp đồng truy cập profile hiện tại từ rules do người dùng cung cấp. Setup chỉ kiểm chứng baseline bằng Emulator; không xác nhận đã đọc lại rules production qua API và không thay đổi quyền production.

## Requirements

### Requirement: Owner access to profile documents

The system SHALL allow an authenticated user to create, read, update and delete their own `users/{uid}` document.

#### Scenario: Owner updates a checkpoint

- **WHEN** Alice updates a checkpoint inside `users/alice`
- **THEN** the update succeeds and unrelated checkpoint/profile fields remain intact

#### Scenario: Owner manages a profile

- **WHEN** Alice creates, reads or deletes `users/alice`
- **THEN** the operation is permitted

### Requirement: Profile isolation

The system SHALL deny profile access to guests and to authenticated users whose UID differs from the document ID.

#### Scenario: Another account attempts access

- **WHEN** Bob tries to read, update or delete `users/alice`, or create a profile for another UID
- **THEN** each operation is denied

#### Scenario: Guest attempts access

- **WHEN** an unauthenticated client attempts a profile operation
- **THEN** the operation is denied

### Requirement: Explicit authorization for descendant documents

Profile ownership SHALL NOT implicitly grant access to descendant documents; each supported subcollection SHALL have its own explicit authorization policy.

#### Scenario: Current baseline has no custom-quiz rule

- **WHEN** Alice accesses `users/alice/customQuizzes/slot-1` under the supplied baseline
- **THEN** the operation is denied even though Alice owns the parent profile

### Requirement: Unknown collections remain closed

The system SHALL deny access to paths not covered by an explicit allow rule.

#### Scenario: Client accesses an unspecified collection

- **WHEN** a client reads or writes a document under `unconfigured/`
- **THEN** the operation is denied
