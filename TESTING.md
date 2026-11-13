# Verification

## Passed

- TypeScript strict typecheck (`npm run typecheck`).
- Eleven regression tests (`npm test`): valid sample citations; immutable feedback-only projection; no ballot in feedback exports; abstention for partial/missing/uncertain/gapped rounds; invalid citations rejected; unexpected verdict fields rejected; malformed inputs rejected; feedback-mode judging denied; verdict-seeking follow-up blocked; no-key recovery action; feedback-only provider schema; cross-origin request rejected.
- Vinext production build including all four server API routes.
- Static portfolio build with the same validation/review adapters and relative asset paths.

## Current verification limits

- The local preview server cannot open a network listener in this execution environment (EPERM). Browser checks are pending a hosted deployment.
- No real paid AI calls were made. A funded OpenAI key and consented debate recording are needed to verify transcription quality, generated review accuracy, cost, latency, and real-world provider behavior.
- Hardware microphone capture, background interruption behavior, mobile codec handling, 120-minute recordings, storage quota failures and the proposed coach-audited 50-round pilot have not been tested here.
- Feedback-only text has prompt constraints, a strict non-ballot schema, and conservative phrase checks. Model behavior still needs adversarial evaluation; this is not a claim of zero possible semantic verdict leakage.

The sample report is written fixture content, clearly identified in the app and exports. It does not demonstrate the quality of actual model output.
