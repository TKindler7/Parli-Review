# Verification

## Passed

- TypeScript strict typecheck (`npm run typecheck`).
- Eleven regression tests (`npm test`): valid sample citations; immutable feedback-only projection; no ballot in feedback exports; abstention for partial/missing/uncertain/gapped rounds; invalid citations rejected; unexpected verdict fields rejected; malformed inputs rejected; feedback-mode judging denied; verdict-seeking follow-up blocked; no-key recovery action; feedback-only provider schema; cross-origin request rejected.
- Vinext production build including all four server API routes.
- Static portfolio build with the same validation/review adapters and relative asset paths.
- Hosted Chrome checks: dashboard loads; the illustrative sample opens; argument flow, speaker feedback and practice sections render; a passage citation selects the corresponding transcript passage.
- Visual inspection at desktop width and a 390 × 844 mobile viewport. The temporary viewport override was reset afterward.
- The AI connection dialog correctly identifies the direct browser-to-OpenAI behavior of the portfolio edition and the separate API charges.
- The published portfolio contains the app card and new source repository link; opening its app link loads Parli Review successfully.

## Current verification limits

- The local preview server cannot open a network listener in this execution environment (EPERM). Browser checks used the hosted GitHub Pages build instead.
- The browser download check timed out, so the actual report download was not verified. Markdown generation and feedback-only export filtering are covered by regression tests.
- No real paid AI calls were made. A funded OpenAI key and consented debate recording are needed to verify transcription quality, generated review accuracy, cost, latency, and real-world provider behavior.
- Hardware microphone capture, background interruption behavior, mobile codec handling, 120-minute recordings, storage quota failures and the proposed coach-audited 50-round pilot have not been tested here.
- Feedback-only text has prompt constraints, a strict non-ballot schema, and conservative phrase checks. Model behavior still needs adversarial evaluation; this is not a claim of zero possible semantic verdict leakage.

The sample report is written fixture content, clearly identified in the app and exports. It does not demonstrate the quality of actual model output.

## Publication

- App: https://tkindler7.github.io/Teddy-Kindler/parli-review/
- Source: https://github.com/TKindler7/Parli-Review
- Portfolio: https://tkindler7.github.io/Teddy-Kindler/
- Sites project initialization succeeded, but its required Git upload could not resolve the remote host from this execution environment. No Sites deployment is claimed. The working portfolio release uses GitHub Pages; the repository also includes the Vinext server build for a future Sites deployment.

## Microphone and AI setup update

- Twenty-six automated tests passed locally: eleven original review safeguards, nine recorder lifecycle checks, and six AI adapter/client checks.
- Recorder checks simulate browser devices and cover pause/resume timing, recovery chunks, pending permission cancellation, permission denial, setup failure cleanup, automatic stop, disconnection, active cancellation, errors, and final-chunk ordering.
- AI integration checks use simulated provider responses through the same adapters as the live app. They cover transcription followed by validated feedback, multipart parameters, invalid timestamps, silence, file rejection, cancellation, billing/key/permissions failures, and network errors.
- The updated setup panel offers a local 15-second recording/playback check followed by an explicitly authorized paid transcription-and-feedback check. There is no canned success state.
- The computer disconnected after local tests and builds, before publication. GitHub runs fresh checks and produces the final deployable build.
- Real microphone quality and paid provider processing still require a user's recording and funded key. The automated tests do not claim either was verified.
