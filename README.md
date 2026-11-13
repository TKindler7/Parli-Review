# Parli Review

[Open Parli Review](https://tkindler7.github.io/Teddy-Kindler/parli-review/) · [Portfolio](https://tkindler7.github.io/Teddy-Kindler/)

A private, browser-local review room for two-team parliamentary debate. Record or upload a round, check its transcript, and get detailed team and speaker feedback. Judging is optional and runs as a separate request.

## What works

- Microphone recording with pause/resume, input meter, elapsed time, interruption warnings and five-second local recovery chunks.
- A built-in **Microphone & AI check** in AI connection: record a 15-second clip, listen locally, then opt into actual transcription and feedback. The test clip and results disappear when the panel closes.
- MP3, M4A, WAV and WebM uploads, browser codec validation, explicit speech ordering and role assignment. Current limit: 50 MB per file and 120 minutes per round.
- Five-minute, 16 kHz mono WAV transcription requests. Completed chunks persist and are reused after interrupted processing. Speaker labels are local to each chunk; users confirm speech roles.
- Editable timestamped transcript with original text retained. Manual speech transcript entry is also supported.
- Structured feedback: overview, argument flow, both teams, individual speakers, missed opportunities, coaching rewrites and practice priorities.
- Separate opt-in adjudication. Incomplete rounds, missing roles, uncertain passages and unresolved recording gaps force abstention before a model is called.
- Feedback-only responses exclude verdict and scoring fields. Switching mode invalidates in-flight requests; exports and report history respect the current mode.
- Clickable report citations, local audio playback, immutable report snapshots, version selection, Markdown export and per-round/report deletion.
- A clearly labeled, fully browsable sample review. No sample result is presented as analysis of uploaded audio.

## Published portfolio edition

The GitHub Pages edition runs the same review logic directly in the browser and sends requests straight to OpenAI using a key held only in tab memory. No app proxy or cloud database is used. Never enter someone else’s key or a production organization key into a shared device. The sample works without a key.

Build the portable edition with `npm run build:portfolio`; serve the generated `portfolio-dist/` directory from a static host. The relative asset paths allow it to live at a portfolio subpath. The Sites-ready server edition is also included, but its publication was blocked by the source-upload host being unreachable in the build session.

## Run locally

Requires Node.js 22.13+.

```sh
npm ci
npm run dev
```

Open the printed local URL. Then use **AI connection** to enter your OpenAI API key. The key is held in React state for that tab, sent via an HTTP header to the same-origin API, used for the requested provider call, and never persisted. API usage is billed separately to the key's account. No server secret is required for this bring-your-own-key release.

```sh
npm run typecheck
npm test
npm run build
```

The application uses React, TypeScript, Vinext and Cloudflare Workers. Sites build integration is retained. Dependency overrides pin compatible cached versions; `.npmrc` keeps peer-dependency resolution consistent with the lockfile.

## Data and privacy

Rounds, audio, transcript history and reports are stored in IndexedDB in the current browser. This release does **not** offer cross-device sync or a cloud round database. People sharing a browser profile can see that profile's rounds. Clearing browser data deletes them. Export reports you want to keep.

Raw local audio expires after 30 days and is removed on the next app launch; transcripts and reports remain until deleted. Interrupted recording chunks follow the same local retention window. Provider processing has its own retention terms. No raw audio, transcripts or API keys are logged by the application. Text generation requests set `store: false`; this is not a claim of provider-wide zero retention.

The public app shell and sample contain no student recordings. Real reviews only run after the user provides a key and checks the processing notice. This is a practice aid, not an official tournament judging service.

## Rules and model choices

The default is an explicitly labeled, editable general two-team practice profile (PM, LO, MG, MO, LOR, PMR). It is not a verified preset for a named league. There is no speaker-point scale. Delivery feedback is limited because the review stage receives a transcript, not the original audio.

Provider endpoints: OpenAI `/v1/audio/transcriptions` with `gpt-4o-transcribe-diarize`, and `/v1/responses` with `gpt-4.1-mini` plus strict JSON Schema. The diarization model remains usable until February 26, 2027 according to the documentation reviewed at implementation; migrate the adapter before that retirement. All provider access lives in `lib/ai-server.ts` and `app/api/transcribe/route.ts`.

- [Speech-to-text documentation](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs)

## Verification and scope

See `TESTING.md` for checks actually completed and limits. Real paid transcription and generated review quality require a funded key and consented recordings; demo content is never used as proof of model accuracy. A coach-reviewed 50-round pilot, cloud account isolation, server background jobs, automatic speech-boundary recognition and resumable server uploads remain beyond this browser-local release. The original product requirements are preserved in `PRD.md`.

## Check your microphone and AI connection

1. Open **AI connection** and enter your own funded OpenAI API key. It stays only in tab memory.
2. In **Microphone & AI check**, choose **Record 15-second test**, allow your browser's microphone prompt, and read the example aloud. Stop early if desired, then play the recording to check clarity.
3. Check the notice authorizing OpenAI processing and API charges, then choose **Run live AI check**. The app shows the actual transcript and generated feedback. Judging remains off for this short clip.
4. Close the panel to discard test audio and results. Start a round to record and review a full debate.

The microphone check is local and free. The live AI check makes billable requests to OpenAI; a ChatGPT subscription does not supply API credit. No requests are retried automatically. Cancelling or closing stops local work, but a provider request already received may still be billed. Retrying after successful transcription reuses the transcript. Changing the key resets both AI service checks.

## Repository build

The verify-and-build workflow runs the tests, strict typecheck, and portable build on main. It saves the generated portfolio files on a separate branch named after the source commit. The main branch remains source-only. Generated builds can be copied into the portfolio after the checks pass.
