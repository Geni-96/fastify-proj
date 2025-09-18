## Teams listening via Azure Communication Services (ACS) with 30-sec Whisper transcription

### What you’ll build

#### A small two-part app:
- Client (browser) — joins a Microsoft Teams meeting as an ACS user using the ACS Calling SDK and accesses raw incoming audio (mixed and/or up to several dominant speakers, per SDK capabilities).
- Backend (Node/Fastify) — receives audio frames from the client, buffers into 30-second chunks, normalizes to 16 kHz mono PCM, and runs Whisper (e.g., whisper.cpp) to produce text; optionally forwards each chunk’s transcript to your downstream system.

#### How To
🧭 ACS join is supported with meeting link / meeting ID+passcode. The meeting tenant must allow anonymous/external join and admit you from the lobby if configured. Raw media access is preview—great for POCs, test thoroughly before production. 

#### Architecture (high level)
- Browser: CallClient → CallAgent.join(locator) → subscribe to raw incoming audio stream(s) → send PCM frames to backend over WebSocket. 

- Backend: per-call buffer → 30s window → write WAV (16 kHz, mono, PCM16) → run Whisper → emit JSON { text, startMs, endMs } (and push to your endpoint if needed).
- Policies: success depends on organizer’s tenant settings (anonymous join allowed; ACS not blocked). Raw media access is preview; mixed stream may reflect top ~4 dominant speakers depending on platform/SDK. 

#### Prerequisites
- Azure subscription (to create an ACS resource).
- ACS resource & connection string.
- Node 18+ (for backend & token server).
- A Teams meeting link / meeting ID+passcode that allows anonymous/external join (organizer lobby policies still apply). 

#### Whisper transcription engine:
Easiest local path: whisper.cpp CLI (CPU/GPU). 
GitHub
If you later want post-meeting Graph transcripts instead of live audio, that requires the organizer’s tenant to grant app/RSC permissions; ACS join alone doesn’t grant transcript API access.