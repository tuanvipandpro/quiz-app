# Verification and traceability

## Status

Implementation/local acceptance có bằng chứng. **Production chưa được bật hoặc xác minh**: tasks 5.2 (đối chiếu Rules/indexes đang publish) và 5.3 (rollout) còn pending. Giữ feature PR ở Draft đến khi giải quyết các prerequisites. Không đóng #42 hoặc archive chỉ dựa trên local tests/CI.

## Preserved baseline

- `firebase/baseline/firestore.rules` giữ bản do người dùng cung cấp; hash/provenance gốc ở `firebase/rules-baseline.json`, không được refresh để chấp nhận candidate.
- 7 test lịch sử ở `tests/firestore/baseline.test.js` tiếp tục kiểm chứng owner/profile/checkpoints, guest/other UID, enumeration, descendants và unknown paths.
- `firebase/firestore.rules` là candidate. `tests/firestore/customQuizzes.test.js` kiểm chứng bằng SDK thật, gồm quyền profile/checkpoint cũ dưới policy mới. Auth context được mô phỏng; assertions không dùng Admin SDK hoặc rules-disabled access.

## Feature acceptance matrix

Kết quả dưới đây là **local**. Browser tests thay auth/profile/custom IO bằng fixtures; quyền/quota/transaction được kiểm chứng riêng bằng client SDK và Rules trên demo Emulator. Screenshots fixture không chứng minh production đã lưu được.

| ID    | Evidence actually exercised                                                                                                                                                              | Local result                | Production |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------- |
| CQ-01 | SDK owner CRUD/list, deny guest/other UID; hai authenticated SDK contexts đọc cùng nội dung; UI reload/second page, logout và Bob deep link                                              | Passed                      | Pending    |
| CQ-02 | SDK whitelist slot-1..3, deny fourth/arbitrary IDs; deletion frees slot; UI 0/3..3/3, local preview excluded, full quota offers replace/delete                                           | Passed                      | Pending    |
| CQ-03 | Node 1/100 and five formats; reject 0/101, duplicate IDs, bad mappings, malformed JSON; Rules reject forged count; real SDK round-trip five formats                                      | Passed                      | Pending    |
| CQ-04 | UTF-8/envelope size boundary; large valid SDK save and actual server rejection over 1 MiB; UI budget and SIZE/REJECTED failures keep preview                                             | Passed                      | Pending    |
| CQ-05 | Real parallel SDK contenders for last slot; same operation retried concurrently without duplicates; UI lost-response retry                                                               | Passed                      | Pending    |
| CQ-06 | SDK rename preserves instance/contentVersion/questions/checkpoint; UI preserves answered Practice draft and checkpoint through rename                                                    | Passed                      | Pending    |
| CQ-07 | Atomic replace/version/reset and deletion; UI Cancel unchanged, quota stable on replace, only affected drafts invalidated; bank sentinel/profile preserved                               | Passed                      | Pending    |
| CQ-08 | Service rejects stale rename/replace/delete/checkpoint after revision/version change or slot reuse; second-page replacement blocks old study and old links                               | Passed                      | Pending    |
| CQ-09 | Versioned identities/drafts, unversioned URL canonicalized before study; all formats in Practice/Exam; Q1 checkpoint, unchanged deadline/shuffle/answers/flags/mode on refresh; no guide | Passed                      | Pending    |
| CQ-10 | Loading/empty/quota/success; NETWORK/PERMISSION/SIZE/REJECTED/CONFLICT retain candidate; confirmations identify the quiz, responsive geometry, focus, contrast and screenshots           | Passed in browser emulation | Pending    |
| CQ-11 | Store generations reject late reads/listeners/writes; no private reads on bank route, failed private reads retry without blocking bank; logout/Bob isolate content                       | Passed                      | Pending    |
| CQ-12 | Guest local import/Practice retained; login does not auto-save/migrate guest drafts; bank/alias/exam regressions; candidate preserves profile contract                                   | Passed                      | Pending    |

Sources: [model](../../../tests/customQuizModel.test.js), [store](../../../tests/customQuizStore.test.js), [real SDK and Rules](../../../tests/firestore/customQuizzes.test.js), [baseline](../../../tests/firestore/baseline.test.js), [cloud UI](../../../tests/e2e/customQuizzes.spec.js), [bank/guest](../../../tests/e2e/app.spec.js), [exam modes](../../../tests/e2e/examFeedback.spec.js).

## Actual verification

- `yarn verify:all`: passed, 132 Node tests, strict OpenSpec 3/3, skill integrity, 20-bank checks, production build/isolation, 16 Emulator tests and 96 Playwright tests, retries=0.
- `yarn test:rules`: subsequently **17/17 passed**, adding explicit SDK round-trip of every format and another authenticated client reading persisted content. The policy did not change.
- Focused browser checks cover final layout/copy, destructive-dialog names/contrast, removal of old success status and confirmed-delete focus recovery. Final CI status is recorded on the PR.
- Four guide-review warnings and existing bundle-size warning remain visible. No public quiz/guide data, reviewed fingerprints, dependencies or lockfile changed.
- Failure artifacts are kept under ignored `artifacts/custom-quizzes-42/`: text-scoping for unnamed Ant Design confirm dialogs; waiting for actual geometry after animation; modal-mask synchronization for account menu; explicit focus after a removed delete trigger. No forced clicks, arbitrary sleeps or retries hide failures.

## UI evidence

Automated matrix: 320×844, 390×844, 412×915, 768×1024, 1280×900 and 844×390, all VN/EN × light/dark combinations. New card/reload controls and rename input meet 44px checks without horizontal overflow. Cancel returns focus to its trigger; confirmed deletion returns focus to the list. Replace/delete dialogs show the targeted name.

Rendered samples reviewed: owner list 1280/390 EN/light; long-name list 320 VN/dark, 412 EN/dark, 768 VN/light; rename/delete 320 VN/dark; delete 844×390 VN/dark. These captures are test-generated from the real app on service fixtures, then visually inspected. Guest/empty/preview were also inspected in the local in-app browser at 320/412px. No physical iPhone/Samsung, Safari/WebKit, virtual-keyboard or full screen-reader certification is claimed.

New danger controls use semantic tokens; the browser matrix measures rendered foreground/background contrast, at least **7.19:1** for card Delete and its primary confirmation in the checked themes. [Measurements](evidence/contrast.json). This is not a full-app contrast audit. UI/UX Pro Max query `error recovery retry` returned Error Recovery, Error Messages and Error Placement: applied actionable errors near the operation, role=alert and input-preserving retry.

| View                        | Evidence                                                                      |
| --------------------------- | ----------------------------------------------------------------------------- |
| Guest 412px EN/light before | [Earlier production smoke screenshot](evidence/before-guest-412-en-light.png) |
| Guest 412px EN/light after  | [Final local guest page](evidence/after-guest-412-en-light.png)               |
| Owner desktop EN/light      | [1280px](evidence/saved-normal-desktop.png)                                   |
| Owner phone EN/light        | [390px](evidence/saved-normal-phone.png)                                      |
| Long name VN/dark           | [320px](evidence/saved-320-vi-dark.png)                                       |
| Long name EN/dark           | [412px](evidence/saved-412-en-dark.png)                                       |
| Tablet VN/light             | [768px](evidence/saved-768-vi-light.png)                                      |
| Rename phone VN/dark        | [320px](evidence/rename-320-vi-dark.png)                                      |
| Delete phone VN/dark        | [320px](evidence/delete-320-vi-dark.png)                                      |
| Delete landscape VN/dark    | [844×390](evidence/delete-844-vi-dark.png)                                    |

Before is the historical production My quizzes upload page before this feature. After is explicitly local/emulated using a test account/sample content, not a production persistence test.

## Production prerequisites — unfinished

- Firebase CLI authorized-account count was **0**; no credential values printed. Read-only project Console navigation redirected to Google Sign in; no login/grant performed.
- Current published Rules revision/hash and complete indexes/field overrides have **not** been independently retrieved or compared. The supplied baseline provenance remains unchanged.
- `firestore.indexes.fragment.json` is only a questions exemption fragment, not a complete deploy configuration. Reconcile with full production indexes; no fragment/empty indexes were deployed.
- No Firebase production policy/data deployment or production cloud save occurred. Publish and verify compatible Rules before merging/enabling the client, then smoke test with an explicitly designated test account. [Release/rollback procedure](../../../firebase/README.md).

Implementation/local acceptance and release readiness are separate. Keep #42 open until production prerequisites and post-deploy evidence are complete.
