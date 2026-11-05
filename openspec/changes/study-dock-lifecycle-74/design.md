# Design

## Context

See [proposal](proposal.md). Baseline StudyNavigation measured through dockRef.current inside ResizeObserver; a late delivery could observe a cleared ref. The callback also writes a root CSS variable used by compact layout. The baseline study-layout tests checked geometry without failing on every uncaught page error.

## Goals / Non-Goals

**Goals:** resolve CQ-DOCK-01/02 with a bounded component correction and an actual lifecycle regression.

**Non-Goals:** change control order, breakpoints, timer ownership, scoring or service/data contracts.

## Decisions

- Capture the mounted element in the effect, guard callbacks with disposed/connected state and disconnect before cleanup. Ignore old deliveries rather than dereferencing a mutable ref. This also prevents an old callback overwriting the next dock's CSS height.
- Keep current height measurement and safe-area CSS. A fixed padding replacement would lose language/timer/zoom adaptation; a generic observer framework is unnecessary for one responsibility.
- Reproduce delayed delivery through the browser boundary while rendering the real app, and separately exercise native navigation/resize. Assert no pageerror and correct current/destination padding, not only a passed build.

## Risks / Trade-offs

- A null guard alone could still let a stale callback write layout → test old-screen delivery after a new dock mounts.
- Teardown timing can be intermittent → control the late-callback test and retain a native production-like route smoke; do not add retries or suppress errors.

## Verification matrix

| Requirement | Planned evidence                                                                                              | Status                            |
| ----------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| CQ-DOCK-01  | studyLayout navigation/resize regression, forced late delivery, pageerror capture, old/new dock CSS ownership | Local/CI pass; production pending |
| CQ-DOCK-02  | Existing viewport/language/theme geometry, timer submission, keyboard focus and safe-area checks              | Local/CI pass; production pending |

Check 320/360/390/412/768/1280px and 844×390, VN/EN, both themes and reduced motion. Include the observed Practice/Exam → Summary path.

Local implementation evidence (2026-11-06): the new controlled regression failed on the old component with two null-ref page errors; the fixed study-layout suite passed all 10 cases, and both late-delivery cases also passed with normal motion. Native route/resize checks and the existing geometry/focus/submit tests cover the stated matrix. yarn verify passed (193 Node tests, strict SDD/catalog/build checks). Rendered samples inspected: 320 VN/dark, 390 EN/light, 1280 EN/light and 844×390 VN/dark. Logs, the original red trace, the corrected responsive Summary-selector diagnostics and final screenshots remain under ignored artifacts/implement-m1/. This is Chromium emulation; production smoke awaits an owner-requested merge/deploy.

## Migration Plan

[Runtime-head CI](https://github.com/tuanvipandpro/quiz-app/actions/runs/42079685372) passed on `84898b8eabaa152455659b712b9b902b7ffc6aad`, including frontend/backend verification, Rules, both E2E shards and the aggregate gate. Staged and outgoing redacted scans were clean. Evidence and the remaining production gate are recorded in [issue #74](https://github.com/tuanvipandpro/quiz-app/issues/74#issuecomment-6665647720). This acceptance-only documentation update must also pass its latest-head CI; it changes no runtime inputs.

One #74 bugfix PR; run yarn verify and relevant E2E, then wait for latest-head CI. Merge on owner request, verify master CI/deploy and repeat the route smoke on production before closing #74. Revert the component/test commit to roll back; no persisted data changes.
