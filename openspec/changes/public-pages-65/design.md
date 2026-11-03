# Design

## Context

Inspected master `397f6b9`; see the [proposal](proposal.md) for goals. `useHashRoute` defaults to `#/library` in initial state, popstate and hashchange. `parseRoute` falls back to Library; `AppHeader` sends the logo to Library and marks Quiz Bank active everywhere except My quizzes. Tests in `tests/e2e/app.spec.js` and other suites using `./` to open Library need classification by intent.

`App.jsx` owns theme, title, exam leave guards, account transitions and screen selection. Tokens already provide navy/dark, blue and Inter/system fonts. `useCustomQuizzes` runs only on private quiz routes; public pages need no new service. The current specs include only `user-profile-access`, with no duplicate landing/donation spec.

## Goals / Non-Goals

**Goals:** add public screens through existing boundaries; make entry routes/preferences explicit; support donations without secrets/background services; divide work into reviewable tasks within one feature PR.

**Non-Goals:** replace the router/framework, add SSR or a hashless `/donate` route, redesign Library/quiz, change quiz/profile schema/version, alter App AI/Firebase deployment or integrate transaction notifications.

## Decisions

The owner confirmed on 01/11/2026 that root shows landing for everyone, Start practicing opens Library, and Donate V1 only displays VietQR/transfer details without automatically confirming receipt. These decisions are settled and match the current specs.

### 1. Reuse existing hash navigation

| URL                          | Trang                     |
| ---------------------------- | ------------------------- |
| Root without a hash, `#/`    | Home                      |
| `#/library`                  | Existing Quiz Bank        |
| `#/donate`                   | Donate                    |
| `#/my-quizzes`, `#/quiz/...` | Existing behavior         |
| Malformed/unsupported hash   | Existing Library fallback |

Accept only valid `#/` and `#/donate` routes; do not interpret unknown paths as donation pages. Preserve queries/canonical aliases and history position. Every CTA uses `go`/the guard; the logo and Donate Back buttons return Home, while Quiz Bank remains directly accessible. Donate has prominent header/hero buttons and a final CTA; mobile navigation wraps as needed. Section controls scroll/focus within the page without writing section hashes such as `#features` into the router.

Revision 02/11/2026: 4 full-width Intro/Features/Featured/CTA sections with `min-height: calc(100svh - header)` and readable inner containers. Apply document CSS scroll snap only on Home and remove it on unmount; long sections remain fully scrollable on phones/landscape/zoom, following [snap-area overflow](https://www.w3.org/TR/css-scroll-snap-1/#snap-overflow). Accumulate small wheel deltas to advance exactly one section, then wait for motion to settle; apply this only on Home. Preserve native behavior for Ctrl/Meta zoom, horizontal wheels, inputs/dialogs/dropdowns and nested scrollers. Long sections scroll their content before advancing; touch/keyboard remain native. Clean up listeners/timers on leaving Home. CSS snap alone is insufficient because 120/240px wheel steps return to the current section. Desktop uses a right-side pager; mobile uses an in-content Next button to avoid covering CTAs. Buttons expose accessible names/current state and controlled smooth scrolling; reduced motion uses instant/proximity. Reuse the footer inside the final section. Donate Back clears only Home scroll position before returning to the introduction; browser Back/Forward preserve existing restoration.

Follow-up review 02/11/2026: crossfade blue/teal/purple ambient layers and change accents with the active section; use selective enter/exit reveal/transitions while keeping focused content clear. The finale uses related navy/soft-blue colors rather than solid primary. Desktop adds registry-based catalog counts, learning hints/paths and provider details; mobile hides supporting content to retain its density. Donate uses a vector coffee illustration, subtle steam and warm colors; preserve recipient/QR/copy/download/error/manual-status behavior and Back Home. Do not add an amount picker because the static QR does not lock an amount. Reduced motion disables color/reveal/steam transitions. UI/UX queries: `learning platform dark editorial` → Product Demo + Features (not the AI-Native skin); `subtle gradient dark` → Aurora UI with subtle blending; `color transition reduced motion` → Reduced Motion / Color Only / Excessive Motion. Reuse tokens/Ant Design without adding fonts or an animation library.

Rationale: hash routes reload on GitHub Pages without rewrites/404 workarounds. Trade-off: do not promise separate SEO or link previews for each hash route. Home has brand title/description/metadata; client titles update for Home/Donate/quiz. New-route navigation handles heading focus/scroll without breaking existing Back/Forward restoration.

### 2. Dark-first with existing interface reuse

Use a valid saved `quiz-app-theme` as before. Without one, Home/Donate entry initializes dark; direct Library/quiz entry retains the system fallback. Keep the current theme across CTAs and persist it through existing storage; do not force dark on every route change. Blocked storage must not produce a blank page. EN/VN use the existing catalog.

Visual direction: existing navy backgrounds, clear typography, the QuizMos logo, blue accents and subtle orbital motifs suggesting Mos/cosmos. Landing prioritizes content and a compact quiz preview; no autoplay video, animation library or new font. Dark is the primary design, with complete light support. QR remains black/white with a quiet zone, without theme inversion or a logo obscuring the code.

Proposed wireframe:

1. Existing header: logo/Home, Quiz Bank, My quizzes; utilities aligned right.
2. Hero: Small quizzes. Big confidence. (draft copy), one description and Start practicing; split content/preview on desktop and stack on mobile.
3. Three benefits: explained Practice, timed Exam and supported bank-specific study guides.
4. Featured AIP-C01/CCAR-P banks using registry metadata/links.
5. Practice CTA, a small support invitation and footer.

The preview uses labelled illustrative components/mockups without starting a quiz session or calling AI. Do not advertise unlimited App AI or fully rolled-out custom cloud quizzes. Check actual rollout issues before finalizing feature claims.

UI/UX search: `quiz exam landing dark --design-system` returned **Product Demo + Features**, fitting the layout, but **Claymorphism**/children's fonts did not fit. Retry `developer tool dark minimal --design-system` returned **Dark Mode (OLED)**, fitting the dark direction; **FAQ/Documentation Landing** did not fit and was not applied. Use local contrast/focus/44px/reduced-motion references; retain tokens/Ant Design rather than adopting the generator's palette, fonts, analytics or dark-only behavior wholesale. Do not persist a new design system.

### 3. Static QR donations

A proposed public configuration module contains `enabled`, bank/BIN, account number as a string, recipient name, suggested transfer note and a local asset path. The owner verifies the standard QR PNG from a banking app/VietQR; it has no fixed amount. V1 needs no new generator/package. Amount-dependent QR is separate scope requiring generator/payload review and independent decoding tests.

The owner supplied TPBank, a recipient name and account number on 01/11/2026, then requested the donation page. Required transfer-recipient information belongs in the public configuration module; issues/docs do not repeat account details. There are no banking credentials.

Bank code `TPB` / BIN `970423` was checked against the [VietQR banks API](https://api.vietqr.io/v2/banks). Preserve the account number as a string, including its leading 0. A 540px QR PNG was generated offline with an encoder already in Ant Design dependencies, without Generate/Quicklink calls or new app packages. CRC was checked against a [VietQR](https://www.vietqr.io/generate) reference vector; independent jsQR 1.4.0 decoding matched BIN/account/memo, static initiation and no amount tag. One-off tools/decoder remain outside Git. The owner scanned the QR and confirmed the correct recipient/account number on 01/11/2026, so Donate configuration is enabled. No transaction or account-lookup API was used.

These are transfer-recipient details, not sign-in credentials. Do not collect passwords/OTPs/API tokens or store publicly displayed values in GitHub Secrets expecting privacy. Any future integration credential belongs in a backend/Worker, not `VITE_*`.

Decode the asset, compare BIN/account/no-fixed-amount and have the owner inspect the banking app's recipient-confirmation screen before publishing. Do not send money as a test. Suggested notes must match QR memo content when present; otherwise instruct manual entry. Recipient changes update configuration and asset together in one commit/build, using a new versioned asset name to avoid stale cached images.

The page shows the support rationale, QR, account details, Copy account, Copy transfer note, Download QR, instructions for selecting a gallery image in supported banking apps and manual-copy alternatives. A same-origin static asset supports downloading without sending account/amount data to a QR service on page load. QR failure exposes textual fallback; missing/unapproved configuration shows unavailable rather than a sample account. There is no I have paid button or automatic receipt notification.

### 4. Boundaries and state

`LandingPage`/`DonatePage` render content; a small helper validates public configuration and a clipboard hook manages async results when needed. Do not put large page logic in `App.jsx`. Assets use `BASE_URL`. Public content neither waits for auth nor reads private study data; retain existing auth hooks/account isolation.

IDs/versions/drafts/checkpoints are unchanged. There is no external QR request, so no QR-generation race; async clipboard completion must be ignored after unmount and avoid stale toasts. Reuse the exam guard, including logo/Home navigation, for one confirmation during rapid clicks, Back and Cancel. Client configuration validation prevents incorrect display; it does not verify banks or replace Firestore Rules. Rules/cloud permissions are unchanged.

## Risks / Trade-offs

- Root changes break older tests → use `./#/library` for Library-intent tests and retain separate root/Home tests without weakening assertions.
- New navigation loses an exam or mishandles account changes → add guard/Back/Cancel/resume regressions and preserve fixture account isolation.
- Incorrect/cropped/stale-cached QR → verify payload and owner preview, quiet zone and versioned assets; block activation until verified.
- QR does not report incoming money automatically → explain manual reconciliation outside the app. Do not promise that every banking service/transfer is free; V1 adds no QR subscription/backend.
- Hash-route metadata limits → promise only shared metadata/client titles; separate prerendering/SEO remains future scope.

## Verification plan

Follow-up [#74](https://github.com/tuanvipandpro/quiz-app/issues/74) reuses `useReducedMotion` and adds CSS digit strips with one finite transform animation. The accessible count stays at the catalog value. Selective hero/card entry animations yield to existing section transitions after finishing; focused content bypasses entry animation. No animation dependency or generated statistics are introduced.

| Requirements | Implementation verification                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ-HOME-01   | Unit route/alias/query/fallback; E2E root/CTA/deep link/refresh/Back-Forward                                                                                                                       |
| CQ-HOME-02   | Content/featured-link review; E2E start-as-guest; no quiz/AI fetch for previews                                                                                                                    |
| CQ-HOME-03   | Unit preferences: saved/empty/invalid/storage-error; E2E dark-first and saved light/EN/VN                                                                                                          |
| CQ-HOME-04   | E2E leave/cancel/resume/rapid-click, auth loading/error/account transition; focus/contrast/overflow                                                                                                |
| CQ-HOME-05   | E2E wheel/keyboard/section navigation, panel geometry, unchanged hash, reduced motion, snap cleanup; mobile/zoom visual review                                                                     |
| CQ-HOME-06   | Donate visible in header/hero, pointer/keyboard use, Home return from both Back buttons                                                                                                            |
| CQ-HOME-07   | `publicPages.spec.js`: real catalog counts, one-shot digit motion, final reduced-motion digits, existing color/focus/section tests; study layout regressions for #74 live in `studyLayout.spec.js` |
| CQ-DONATE-01 | E2E direct route, refresh and Home/Library links as a guest                                                                                                                                        |
| CQ-DONATE-02 | Unit configuration/missing/invalid; asset decoding and owner review of recipient, amount and memo                                                                                                  |
| CQ-DONATE-03 | Clipboard success/denied, image error, download identity, leading-zero account, unmount                                                                                                            |
| CQ-DONATE-04 | Fixture network assertions show no donation I/O; review confirms no fabricated receipt state                                                                                                       |

Planning runs only SDD validation, formatting and link checks. Implementation runs `yarn verify`, UI-skill integrity and relevant E2E using fixtures, without live banking/Firebase/AI calls. Browser review covers 320/390/412/768/1280px and landscape, EN/VN × light/dark through a selected matrix, reduced motion and keyboard/text zoom. Reuse viewport helpers rather than multiplying every test across every combination. CI selects its profile from the diff; do not change the pipeline in this feature. Batch coherent changes before pushing instead of triggering CI per task.

## Migration Plan

Use one feature PR `Refs #65`, only after the user requests implementation. Start with disabled configuration/fixtures; the owner may supply QR while landing is developed. Enable real donations only after verification; if inputs are missing, report them and keep the issue open instead of redefining accepted scope as a completed placeholder.

After exact-head CI passes, merge only when requested. Check post-merge CI/deployment, HTTPS root/Home/Library/Donate, legacy deep links, QR download in the production build and owner recipient preview. Close the issue only after all accepted scope is verified. Roll back by reverting the PR, or disabling donation configuration for a QR-only failure; no data migration needs reversal.

## Open Questions

- The static QR payload was checked and the owner confirmed the recipient; Donate is enabled. EN/VN copy/layout exist in the implementation for PR review. No product input blocks implementation; CI, merge and rollout still follow delivery gates.
