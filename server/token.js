// backend/server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { CommunicationIdentityClient } from "@azure/communication-identity";
import dotenv from "dotenv";

dotenv.config(); // load .env file into process.env
const app = Fastify({ logger: true });
await app.register(cors, {
  origin: ["http://localhost:5173"],   // or true for all origins in dev
  methods: ["GET","POST","OPTIONS"],
  // credentials: true,                // only if you use cookies/credentials
});

const conn = process.env.ACS_CONNECTION_STRING; // endpoint=...communication.azure.com/;accesskey=...
if (!conn) throw new Error("Missing ACS_CONNECTION_STRING");

const identity = new CommunicationIdentityClient(conn);

// Mint a join-only calling token and return JSON
app.get("/token", async (_req, _rep) => {
  const { user, token } = await identity.createUserAndToken(["voip.join"]);
  return {
    token: token,
  };
});

app.listen({ port: 3000, host: "0.0.0.0" });
