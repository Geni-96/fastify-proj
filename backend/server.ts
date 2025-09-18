import Fastify from "fastify";
import wsPlugin from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// (A) Token endpoint for ACS client (issue ACS tokens on the server).
// Replace this stub with @azure/communication-identity createUserAndToken(["voip"]).
// Docs: https://learn.microsoft.com/azure/communication-services/quickstarts/identity/access-tokens
const issueAcsToken = async () => {
  // TODO: use CommunicationIdentityClient with ACS_CONNECTION_STRING
  return { token: process.env.DEMO_FAKE_TOKEN ?? "REPLACE_ME" };
};

const app = Fastify({ logger: true });
await app.register(wsPlugin);

// (1) Token: the Electron renderer will fetch this to create a CallAgent.
app.get("/token", async () => issueAcsToken());

// (2) WebSocket ingest: renderer streams raw PCM frames here.
type Buf = { data: Buffer; ts: number };
const BUFFERS = new Map<string, Buf[]>();

app.get("/ingest", { websocket: true }, (conn, req) => {
  const url = new URL(req.url!, "http://localhost");
  const callId = url.searchParams.get("callId") ?? randomUUID();
  app.log.info({ callId }, "WS connected");
  BUFFERS.set(callId, []);

  const SAMPLE_RATE_IN = Number(url.searchParams.get("inRate") ?? 48000);
  const CHUNK_MS = Number(url.searchParams.get("chunkMs") ?? 30000);
  let windowStart = Date.now();

  conn.socket.on("message", async (msg: Buffer) => {
    BUFFERS.get(callId)!.push({ data: msg, ts: Date.now() });
    const elapsed = Date.now() - windowStart;
    if (elapsed >= CHUNK_MS) {
      const frames = BUFFERS.get(callId)!;
      BUFFERS.set(callId, []);
      const startMs = windowStart;
      windowStart = Date.now();
      try {
        const tmp = await mkdtemp(join(tmpdir(), "acs-"));
        const rawPath = join(tmp, "chunk.raw");
        const wavPath = join(tmp, "chunk.wav");

        // Concatenate raw PCM16LE frames (48k mono) to one file
        const raw = Buffer.concat(frames.map(f => f.data));
        await writeFile(rawPath, raw);

        // (3) Downsample to 16 kHz mono PCM16 → WAV with ffmpeg
        // ffmpeg -f s16le -ar 48000 -ac 1 -i chunk.raw -ar 16000 -ac 1 -c:a pcm_s16le chunk.wav
        await new Promise<void>((resolve, reject) => {
          const ff = spawn("ffmpeg", [
            "-f","s16le","-ar", String(SAMPLE_RATE_IN), "-ac","1","-i", rawPath,
            "-ar","16000","-ac","1","-c:a","pcm_s16le", wavPath, "-y"
          ]);
          ff.on("exit", code => code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`)));
        });

        // (4) Transcribe the 30s chunk with whisper.cpp (or swap provider in whisper.ts)
        const text = await transcribeWithWhisperCpp(wavPath);
        app.log.info({ callId, startMs, endMs: Date.now(), text }, "chunk transcript");
        // TODO: forward to Ozwell or store somewhere

      } catch (err) {
        app.log.error({ err }, "ingest chunk failed");
      }
    }
  });

  conn.socket.on("close", () => {
    app.log.info({ callId }, "WS closed");
    BUFFERS.delete(callId);
  });
});

// --- simple wrapper around whisper.cpp binary ---
async function transcribeWithWhisperCpp(wavPath: string): Promise<string> {
  const model = process.env.WHISPER_MODEL_PATH ?? "./models/ggml-base.en.bin";
  return await new Promise((resolve, reject) => {
    const cli = spawn("./whisper.cpp/build/bin/whisper-cli", [
      "-m", model, "-f", wavPath, "--output-txt", "--language", "en"
    ]);
    let out = ""; let err = "";
    cli.stdout.on("data", d => out += d.toString());
    cli.stderr.on("data", d => err += d.toString());
    cli.on("exit", code => code === 0 ? resolve(out.trim()) : reject(new Error(err || String(code))));
  });
}

app.get("/healthz", async () => ({ ok: true }));

app.listen({ port: 3000, host: "0.0.0.0" }).catch(err => {
  app.log.error(err);
  process.exit(1);
});
