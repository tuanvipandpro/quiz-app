# Custom quiz Rules and release procedure

`baseline/firestore.rules` preserves the exact user-supplied published baseline (LF-normalized SHA-256 in `rules-baseline.json`). This source was supplied in chat, not exported from Firebase. `firestore.rules` is the proposed custom-quiz policy under review; its presence in Git does not establish that it is deployed.

## Contract and cost

- Existing owner-only profile operations remain unchanged. Custom content lives only in `users/{uid}/customQuizzes/slot-1..slot-3`, with explicit child Rules; no recursive public grant is added.
- Rules enforce ownership, three allowed document IDs, allowed envelope fields/types, actual question-list length 1–100, matching count, immutable instance/creation timestamp and valid revision/content-version transitions. They do not inspect all nested question semantics. The shared validator rejects malformed stored content before study; the UI offers replacement/deletion.
- App mutations use online transactions. Create reads all three slots and reuses a stable operation UUID on retry. Rename/replace/delete require the expected instance/revision; checkpoint writes require the expected instance/contentVersion. A legitimate owner can directly delete their own data; this is not an anti-malicious-owner system.
- Checkpoints stay in the custom document. Rename keeps progress; replacement increments contentVersion and resets its checkpoint atomically; deletion removes the document/checkpoint. Bank progress stays in the profile map. Draft keys include account, instance and content version.
- Listing reads content too, at most three documents, only on personal routes. A server-confirmed listener keeps active identities fresh; cached snapshots do not validate stale study. Saves use a 750 KiB UTF-8 JSON envelope budget as a conservative estimate, not exact Firestore sizing. The actual server can still reject a document; errors keep the preview for retry.
- `firestore.indexes.fragment.json` is **only a fragment** suggesting that `customQuizzes.questions` be exempted from indexing. It is not a complete index configuration and is not referenced by a deploy command. The app does not query question content; index exemptions avoid unnecessary fanout/storage. Preserve all unrelated indexes/overrides.

## Verify locally

`yarn test:rules` starts loopback Firestore with `demo-quiz-app`, tests both the historical baseline and candidate Rules through client SDK contexts, and stops it. Auth contexts are simulated; Rules-disabled contexts only seed fixtures. `yarn verify:all` also runs Node, browser and build-isolation checks. No real user accounts, production writes or paid AI calls belong in these tests.

## Before merge and production enablement

1. Review the feature PR and acceptance matrix. Keep issue #42 open until rollout is verified.
2. With an already authorized owner/admin connection, read the **current published Rules and complete indexes/field overrides** for `quiz-app-f70d5`. Record source, revision/hash and timestamp in the release evidence. Compare with the supplied baseline and inspect broad allow rules. Never replace changed production policies blindly.
3. Merge the proposed policy with any legitimate production changes and run the emulator suite against the reconciled policy. Merge the questions exemption into the complete existing index configuration; do not deploy the fragment by itself or an empty indexes file.
4. After explicit rollout authorization, publish compatible Rules first, wait for propagation and verify the ownership/quota policy is effective. Verify the exemption is active where applicable. Never log credentials or put admin keys in Vite variables.
5. Only then merge/enable the client and let the existing verified website pipeline deploy. Smoke test private save/reload/resume/management with an explicitly designated test account; record what was actually checked. Do not use incidental personal accounts for routine testing.

## Rollback

Revert/disable the cloud client first while preserving saved documents. Bank and local uploads remain independent. Evaluate old/new client compatibility before reverting Rules; do not make private content public or delete quizzes as rollback. Keep the original baseline/provenance for comparison. No Firebase deployment is performed automatically by this repository's CI.

## Current rollout status

Implementation branch only. No authorized Firebase CLI accounts were available during development (`login:list` inspected for count only); read-only Firebase Console navigation also redirected to Google Sign in. Production drift/index review and Rules deployment are **pending**. No production policy export, Firebase login, Rules deployment or production data write has been performed.
