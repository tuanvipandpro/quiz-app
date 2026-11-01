# Account menu and UI readiness audit

Base: `7cf3a6aba86b5bba1aa6e7a4131d31e9d5fdadfe` (PR #57). Scope: unblock reliable validation of the QuizMos domain deployment while correcting account-menu interaction defects found during the audit.

## Why the earlier correction was incomplete

The earlier helper allowed two animation frames before collecting Web Animations. That does not establish readiness for rc-motion: its prepare/start/active phases span several frames, and preparation can have no animation to collect. A click can therefore use a transient position; a contrast reading can sample intermediate colors. Passing one run did not demonstrate stability across this lifecycle.

Reviewed evidence includes the [first post-domain deployment run](https://github.com/tuanvipandpro/quiz-app/actions/runs/41232060519), the [sign-in failure during PR #57](https://github.com/tuanvipandpro/quiz-app/actions/runs/41234405389), and the [post-merge account-menu failure](https://github.com/tuanvipandpro/quiz-app/actions/runs/41256806335). The sign-in trace recorded a click at x=1052 on a 1280px page while the settled modal action was centered. The account trace showed the menu remained open and no sign-out confirmation appeared. That trace alone does not identify which event handler lost the click.

The dependency audit used installed Ant Design 5.27.0, rc-dropdown 4.2.1 and rc-motion 2.9.5. No dependency versions changed.

## Findings and corrections

| Finding                                                                                                                                                                                                 | Correction and regression evidence                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two frames can finish before rc-motion begins a transition.                                                                                                                                             | Wait for visible prepare/start/active phases and finite animations in the popup region and its ancestors. Include sibling layout changes; ignore infinite decoration. A six-frame preparation regression failed on the original helper and passes with the correction. |
| The account dropdown used the default hover trigger. Enter on the closed profile button did not open it.                                                                                                | Use an explicit click trigger, controlled open state, accessible name/state/relationship and menu autofocus. The keyboard regression failed on the original app in both browser projects.                                                                              |
| Moving focus from a menu item back to its trigger during Enter can issue a native click and reopen the menu.                                                                                            | Prevent the handled menu event's default action before transferring focus and opening a dialog. Test that the menu closes when Settings or sign-out opens.                                                                                                             |
| Settings was immediately unmounted on close, bypassing the dialog's focus restoration.                                                                                                                  | Keep the lazy dialog mounted through its closing lifecycle; unmount after `afterClose`. Escape returns focus to the profile button.                                                                                                                                    |
| Reduced-motion CSS forces zero-duration animations, but rc-motion was still waiting for animation completion. A phone-emulation case left the confirmation in `ant-zoom-leave-active` beyond 8 seconds. | Pass the actual system preference to Ant Design's `motion` token through a subscribed media-query hook. Normal-motion cases retain animations; both preferences exercise the complete menu/dialog flow.                                                                |
| Long account names could expand the desktop menu to 1206px; actions were 40px tall, and sign-out text contrast was below 4.5:1.                                                                         | Bound the right-aligned menu to the viewport, wrap account names, allow vertical scrolling, use 44px targets and existing semantic color tokens. Reuse the existing destructive-dialog palette for sign-out and cloud deletion.                                        |
| The existing contrast helper ignored alpha.                                                                                                                                                             | Composite text and background alpha through the ancestor chain. Four golden-value unit tests cover opaque, translucent and transparent colors. An unsettled group opacity fails measurement. The required 4.5:1 threshold is retained.                                 |

## Measured UI evidence

All screenshots use synthetic fixture accounts and Chromium emulation. They are not physical-device results.

| Viewport / language / theme | Before                                               | After                                                     |
| --------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| 320 × 844 / EN / light      | [Hover menu](account-before-hover-320-en-light.png)  | [Keyboard menu](account-after-keyboard-320-en-light.png)  |
| 844 × 390 / VN / dark       | [Hover menu](account-before-hover-844-vi-dark.png)   | [Keyboard menu](account-after-keyboard-844-vi-dark.png)   |
| 1280 × 900 / EN / light     | [Hover menu](account-before-hover-1280-en-light.png) | [Keyboard menu](account-after-keyboard-1280-en-light.png) |

[The original 320px keyboard case](account-before-keyboard-320-vi-dark.png) shows the focused trigger without an opened menu.

After correction, the profile target is 44 × 44px, the long-name menu is 288px wide, and actionable rows are at least 44px high. Settled sign-out text measures 7.20:1 in light mode and 8.99:1 in dark mode; the account name measures 5.47:1 and 7.99:1 respectively. The menu remains within the measured viewport, including landscape.

The automated interaction matrix covers 320/390/412/768/1280px widths and 844 × 390 landscape, VN/EN and light/dark, each with normal and reduced motion. It checks keyboard opening/selection/Escape, real Playwright tap events in the touch project, outside dismissal, Settings close/focus, sign-out cancellation/focus, target geometry and contrast. Separate cases cover sign-in pending/error/retry without duplicate requests, missing profile metadata and an SDK-like account change while the menu is open. Existing tests retain sign-out failure/success, exam deadlines, draft cleanup and private-quiz account isolation.

## Guidance applied

Used the local UI/UX Pro Max skill at pinned upstream revision `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`. Query: `hover tap --domain ux`; relevant result 1: **Animation / Hover vs Tap**. Applied click/tap for primary interaction, plus the bundled keyboard-navigation, visible-focus, target-size, wrapping, reduced-motion and contrast guidance. The repository's 44 CSS-pixel target requirement controls the web implementation; native platform units are not substituted. Existing React/Ant Design components, translations, tokens and header alignment are retained.

## Verification and limits

Before editing production code, the keyboard-opening and delayed-preparation regressions failed in both projects (4 failures total). Expanded checks also exposed the Enter, Settings-focus and reduced-motion defects described above. Failure logs, screenshots and traces are retained under ignored `artifacts/ci-audit/` for diagnosis.

Final command results and Linux CI runs are recorded in the PR. Required commands are `VITE_BASE=/ yarn verify` and `CI=true VITE_BASE=/ yarn test:e2e --repeat-each=2 --workers=2`, with zero retries. CI configuration, acceptance thresholds and fixture boundaries are unchanged.

No real Google sign-in, Firestore production write, Rules rollout, provider-key operation or billable AI call is exercised. The production-domain smoke check must follow a successful master deployment; local/PR checks do not establish that the domain is live. Existing catalog guide-review warnings remain outstanding with their reviewed hashes preserved.
