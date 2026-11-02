# Proposal

## Why

[Issue #53](https://github.com/tuanvipandpro/quiz-app/issues/53): signed-in users need AI explanations without creating an API key. Guests retain BYOK; Cloudflare must remain on the Free plan.

## What Changes

- Add a Firebase-authenticated Worker API with a fixed free model and shared validation.
- App AI and BYOK always explain in Vietnamese while preserving English technical terms; the VN/EN toggle controls only the interface. Explanations must analyze the question, identify answers, justify every correct choice and explain every wrong/less-suitable alternative.
- D1 manages atomic quota, request identity and private result caching; experimental defaults are 20 attempts/user/day, 100 attempts/app/day and 1536 output tokens.
- Provide explicit App AI/BYOK selection and VN/EN quota/reset/error states; retain guest BYOK without automatic fallback.
- Add local tests, UI evidence and Cloudflare setup/rollout instructions; production enablement awaits account setup and benchmarking.

## Capabilities

### New Capabilities

- `app-ai-explanations`: access control, bounded inference, quota/retry/cache and AI-source selection.

### Modified Capabilities

No user-profile-access changes. Existing Firebase/Firestore and hosting remain in use.

## Impact

Adds a Worker, Wrangler/Miniflare/jose dependencies, AI service/hook/dialog/settings and browser tests. It does not migrate storage #52, change bank answers or add a general chatbot. The user requested implementation; SDD was prepared before code in the same feature PR. Production setup and model quality require separate evidence.
