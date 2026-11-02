# Tasks

Tracking: [#65](https://github.com/tuanvipandpro/quiz-app/issues/65). Implementation/local verification follow this checklist; the owner confirmed the QR recipient/account number. Donate V1 does not automatically confirm transactions; see the [proposal](proposal.md). The requirement-to-test matrix is in [design](design.md#verification-plan); the issue records evidence, PR/CI and rollout.

## 1. Content and layout

- [x] 1.1 Finalize EN/VN copy and Home/Donate wireframes using dark navy/blue accents; review the primary CTA, illustrative preview, featured banks and support explanation with the owner before coding. Output: copy/layout review in the issue, not a separate document bundle. CQ-HOME-02, CQ-DONATE-01/04.

## 2. Routing and shell

- [x] 2.1 Add Home/Donate to parsing/default hashes while preserving malformed-link Library fallback. Add unit cases in `tests/uiCatalog.test.js` for root, Donate, alias/query and malformed links, plus reload/Back/Forward E2E. CQ-HOME-01, CQ-DONATE-01.
- [x] 2.2 Wire page components, logo/Home, footer/Donate, active navigation, titles and focus/scroll through existing guards. E2E covers CTAs, exam Leave/Cancel/resume/rapid clicks and auth loading/account transitions; move legacy Library-intent tests to explicit routes where appropriate. CQ-HOME-01/04, CQ-DONATE-01.
- [x] 2.3 Add dark-first public entry, preserving saved themes and direct-study system defaults. Unit cases cover saved/empty/invalid/storage-error preferences; E2E covers saved light, fresh dark, theme switching and EN/VN. CQ-HOME-03.

## 3. Landing page

- [x] 3.1 Build the hero, lightweight product preview and primary CTA with tokens/Ant Design. Verify 320px/1280px rendering, keyboard/contrast and start-as-guest; the preview starts no quiz session or AI call. CQ-HOME-02/04.
- [x] 3.2 Add Practice/Exam/guides, registry-based AIP-C01/CCAR-P and a final CTA; update shared metadata. Verify content/capability accuracy, overview links, EN/VN and section scrolling without route changes. CQ-HOME-02/04.
- [x] 3.3 Divide landing into 4 full-width/min-viewport sections with scroll snap and section controls; E2E covers geometry, small 120px wheel/keyboard/navigation, unchanged hashes, uncropped mobile/zoom content and cleanup on leaving Home. CQ-HOME-05.
- [x] 3.4 Add contrasting backgrounds and appropriate reveal/orbit/transitions respecting reduced motion; review contrast, focus and readable content when observers/motion are unavailable. CQ-HOME-04/05.

- [x] 3.5 Polish review: ambient gradient/accent crossfades, inter-section transitions, desktop catalog/learning details and a matching finale palette; test desktop/mobile density, reduced motion, contrast and rendered screenshots. CQ-HOME-07.

## 4. Donate page

- [x] 4.1 Create public-recipient schema/config with disabled default from owner-supplied local draft information; test missing/invalid config and leading-0 accounts. Prepare a QR without a fixed amount, decode BIN/account/memo and have the owner verify the recipient before activation. Record evidence in the issue; receiving account details alone does not complete this task or verify the recipient. CQ-DONATE-02/04.
- [x] 4.2 Build Donate layout, white-background QR, recipient details, amount-entry instructions and unavailable/image-error states. Use fixtures while 4.1 is pending; E2E covers guest/direct URL/reload, missing config, image failure and no donation API/profile I/O. CQ-DONATE-01/02/04.
- [x] 4.3 Add account/note copying, same-origin QR download and manual phone fallback. E2E covers clipboard success/denial, leading-0 preservation, asset-matching downloads, repeated clicks/unmount and no receipt claims. CQ-DONATE-03/04.
- [x] 4.4 Make Donate prominent in header/hero/final CTA and return all Donate Back buttons Home. E2E covers visible phone/desktop entries, top/bottom Back buttons and exam guards through Donate. CQ-HOME-06, CQ-DONATE-01.

- [x] 4.5 Present Donate as a coffee invitation, retaining all recipient details/QR/copy/download/error states and Back Home. Test EN/VN, both themes, mobile/desktop and absence of a misleading amount picker. CQ-DONATE-05.

## 5. Integration and release

- [x] 5.1 Review the full-screen revision across Home → Library → quiz → Donate; cover 320/390/412/768/1280px and landscape, EN/VN, both themes, keyboard/text zoom/reduced motion through a selected matrix. Record requirement-to-test status in the issue and keep production-review images outside Git. CQ-HOME-01..06, CQ-DONATE-01..04.
- [ ] 5.2 Run `yarn verify` and relevant E2E, review the diff and redacted staged/outgoing secret scans before pushing. Open one feature PR with `Refs #65`, link the issue and wait for exact-head required CI; do not create a PR per task or rerun without cause. Output: PR/commit links, check results and unverified scope.
- [ ] 5.3 When the user requests merge and CI passes, merge and wait for post-merge CI/deploy; smoke-test HTTPS root/Home/Library/Donate, legacy deep links, QR/download and recipient confirmation on the deployed build. Close #65 only after accepted scope passes; keep it open if QR verification or rollout is missing. CQ-HOME-01..04, CQ-DONATE-01..04.

Dependencies: 1.1 → 2.1 → 2.2; 2.3 → 3.1 → 3.2. Prepare 4.1 independently while building landing; 4.2/4.3 use fixtures, but activation requires completed 4.1. 2.x + 3.x + 4.x → 5.1 → 5.2 → 5.3. Tasks are small work/review units, not requirements for multiple branches or agents.

## Workflow follow-up

- Sync/archive OpenSpec after feature acceptance through the project workflow; planning completion is not implementation completion.
