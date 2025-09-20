// public/main.js
import { CallClient, Features } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";

const TOKEN_URL = "http://localhost:3000/token"; // ABSOLUTE URL — avoid relative '/token'

const meetingLinkInput = document.getElementById("teams-link-input");
const joinBtn = document.getElementById("join-meeting-button");
const hangUpBtn = document.getElementById("hang-up-button");
const callStateEl = document.getElementById("call-state");
const recordingStateEl = document.getElementById("recording-state");

let callClient, callAgent, call;

async function getAcsToken() {
  const res = await fetch(TOKEN_URL, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text(); // helps debug when we accidentally get HTML
    throw new Error(`Token fetch failed ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json().catch(async () => {
    const txt = await res.text();
    throw new Error(`Token was not JSON. Got: ${txt.slice(0, 200)}`);
  });

  const tokenStr = typeof data.token === "string" ? data.token : data?.token?.token;
  if (!tokenStr) throw new Error("Bad token payload: expected { token: string }");
  return tokenStr;
}

async function init() {
  try {
    callClient = new CallClient();
    const tokenStr = await getAcsToken();
    const cred = new AzureCommunicationTokenCredential(tokenStr);
    callAgent = await callClient.createCallAgent(cred, { displayName: "ACS Client" });

    // Optional: debug connectivity issues
    callAgent.on("connectionStateChanged", (e) => {
      console.log("callAgent connection:", e.oldState, "→", e.newState, "reason:", e.reason);
    });

    joinBtn.disabled = false;
  } catch (e) {
    console.error("Init failed:", e);
    alert(e.message || e);
  }
}
init();

joinBtn.addEventListener("click", async () => {
  try {
    const link = meetingLinkInput.value.trim();
    if (!link) return alert("Paste a Teams meeting link");
    if (link.includes("teams.live.com")) {
      return alert("This is a consumer (personal) Teams link; ACS can only join work/school meetings.");
    }

    // Join (start muted to avoid device prompts while testing)
    call = callAgent.join({ meetingLink: link }, { audioOptions: { muted: true } });

    call.on("stateChanged", () => {
      callStateEl.innerText = call.state;
      console.log("call.state:", call.state);
      if (call.state === "Disconnected") {
        console.log("callEndReason:", call.callEndReason);
        alert(`Call ended (${call.callEndReason?.code}/${call.callEndReason?.subCode})`);
        joinBtn.disabled = false;
        hangUpBtn.disabled = true;
      }
    });

    // Show when recording is active (read-only)
    const recording = call.feature(Features.Recording);
    recording.on("isRecordingActiveChanged", () => {
      recordingStateEl.innerText = recording.isRecordingActive ? "This call is being recorded" : "";
    });

    // (Optional) Pull mixed remote audio (preview) once connected
    call.on("stateChanged", async () => {
      if (call.state !== "Connected") return;
      try {
        const raw = call.feature(Features.RawAudio);
        const mixed = await raw.startIncomingMixedAudio({
          format: { sampleRate: 48000, channels: 1, pcm16: true }
        });
        // For now just count frames; later send to WS backend
        let frames = 0;
        mixed.on("audioFrame", () => { if (++frames % 100 === 0) console.log("frames:", frames); });
      } catch (err) {
        console.warn("Raw audio not available on this platform/SDK:", err);
      }
    });

    joinBtn.disabled = true;
    hangUpBtn.disabled = false;
  } catch (e) {
    console.error("Join failed:", e);
    alert(e.message || e);
  }
});

hangUpBtn.addEventListener("click", async () => {
  try { await call?.hangUp(); } catch {}
  hangUpBtn.disabled = true;
  joinBtn.disabled = false;
  callStateEl.innerText = "-";
});
