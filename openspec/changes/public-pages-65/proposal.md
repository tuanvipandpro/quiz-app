# Proposal

## Why

QuizMos currently opens Quiz Bank directly, leaving new users without an introduction to studying or a way to support the project. A dark-first landing page and donation page help users understand the product, start practicing and support application maintenance.

Tracking: [issue #65](https://github.com/tuanvipandpro/quiz-app/issues/65). Type `feature`, medium risk because it changes the entry route and shared navigation. The owner requested implementation on `codex/public-pages-65`; merge/deployment are not yet complete.

## What Changes

- Follow-up review on 02/11/2026: smoother inter-section color/animation, useful desktop support content from the catalog/learning flow, compact mobile content and a final CTA matching the landing background palette. Donate becomes a coffee invitation while retaining all transfer details/actions.

- Root without a hash and `#/` open Home; CTAs open `#/library`. Preserve existing quiz paths, aliases, queries and checkpoints. Do not automatically redirect returning users based on cookies or usage history.
- Landing includes a hero, product preview, Practice/Exam/study guides, featured AIP-C01/CCAR-P banks and a final CTA. Keep the official name **QuizMos**, not QuizMoss.
- Owner revision on 02/11/2026: landing has 4 full-width sections, each at least the viewport height below the header, with scroll snap; add reveal/transitions, contrasting backgrounds, section navigation and a reduced-motion fallback. Donate is prominent in the header/hero; Donate Back buttons return Home.
- Public `#/donate` explains support, shows verified static VietQR and recipient details, and supports copying the account/transfer note and downloading the QR for use on the same phone.
- Public pages default to dark without an existing theme choice; retain saved light/dark preferences, EN as default and VN availability. Do not change defaults for direct Library/quiz entry.
- Do not automatically confirm transactions, store donors, set funding goals, unlock content, call banking APIs or add a backend. Users enter the amount in their banking app; the selected QR does not lock an amount.

The owner confirmed on 01/11/2026 that everyone opening the main domain should see landing, Start practicing opens Library, and Donate V1 shows VietQR/transfer details without automatically confirming receipt. Landing and Donate are implemented for PR review. The QR was generated offline, decoded against its payload and scanned by the owner to confirm the recipient/account number. Donate is enabled in configuration; [design](design.md#3-static-qr-donations) records verification. Merge and post-deployment verification remain open.

## Capabilities

### New Capabilities

- `public-home`: landing, entry route, navigation, theme and the QuizMos introduction.
- `donation-support`: static VietQR donation page, transfer details and unavailable states.

### Modified Capabilities

No changes to `user-profile-access` requirements or rollout scope for #42, #52 or #53.

## Impact

- Add page components; update `App.jsx`, `AppHeader.jsx`, `useHashRoute.js`, `utils/navigation.js`, translations, tokens/styles and metadata where needed.
- Classify tests using root as a Library shortcut by their intent; add Home/Donate, deep-link, theme and exam-leave-guard regressions.
- Retain React/Ant Design, GitHub Pages, hash routing and `BASE_URL`; no new dependency, API key or infrastructure is needed. The QR is an owner-approved public source asset, not a credential.
- Reuse routing, auth and CI infrastructure. Both pages and the donation asset exist, with owner-verified recipient details; post-deployment verification remains open. Use one feature PR for this change; small tasks do not require separate PRs.

VietQR.io announced that Generate API stops on 01/01/2027, Quicklink prioritizes SVG and the portal stops accepting new templates. V1 uses a verified static QR to avoid dependence on those APIs; amount-dependent dynamic QR is future scope if requested. Sources: [official announcement](https://www.vietqr.io/thong-bao-cap-nhat), [Quicklink](https://www.vietqr.io/qr-dong).
