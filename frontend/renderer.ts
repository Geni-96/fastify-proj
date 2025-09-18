import pkgCalling from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
const { CallClient, Features } = pkgCalling as any;

(async () => {
  const cfg = JSON.parse(decodeURIComponent(location.hash.slice(1) || "{}"));
  const tokenResp = await fetch(cfg.BACKEND_TOKEN).then(r => r.json());
  const cred = new AzureCommunicationTokenCredential(tokenResp.token);

  const callClient = new CallClient();
  const callAgent = await callClient.createCallAgent(cred, { displayName: "ACS Headless" });

  // Join by link; coordinates (ID+passcode) are also supported per docs.
  // Docs: join with link or coordinates. https://learn.microsoft.com/azure/communication-services/how-tos/calling-sdk/teams-interoperability
  const locator = { meetingLink: cfg.MEETING_LINK };
  const call = callAgent.join(locator);

  // Enable raw mixed incoming audio (preview). Mixed stream typically includes top dominant speakers.
  // Preview notes: https://learn.microsoft.com/azure/communication-services/concepts/voice-video-calling/media-access
  const rawAudio = call.feature(Features.RawAudio);
  const mixed = await rawAudio.startIncomingMixedAudio({
    // Many builds deliver PCM16 @ 48000 mono; verify at runtime on your SDK version.
    format: { sampleRate: 48000, channels: 1, pcm16: true }
  });

  const ws = new WebSocket(`${cfg.BACKEND_WS}?callId=${crypto.randomUUID()}&inRate=48000&chunkMs=30000`);
  ws.binaryType = "arraybuffer";

  mixed.on("audioFrame", (buf: ArrayBuffer) => {
    if (ws.readyState === ws.OPEN) ws.send(buf);
  });

  call.on("stateChanged", () => console.log("call state:", call.state));
})();
