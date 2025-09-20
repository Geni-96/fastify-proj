import { Features } from "@azure/communication-calling";

// After join, when call is connected:
const raw = call.feature(Features.RawAudio);

// Ask for mixed incoming remote PCM16 @ 48k, mono (common default; verify on your SDK)
const mixed = await raw.startIncomingMixedAudio({
  format: { sampleRate: 48000, channels: 1, pcm16: true }
});

// Stream frames out (to your Fastify WS endpoint, for example)
const ws = new WebSocket(`wss://your-server/ingest?callId=xyz&inRate=48000&chunkMs=30000`);
ws.binaryType = "arraybuffer";

mixed.on("audioFrame", (buf /* ArrayBuffer */) => {
  if (ws.readyState === ws.OPEN) ws.send(buf);
});
