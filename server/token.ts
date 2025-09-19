// server/token.ts
// import Fastify from "fastify";
// import { CommunicationIdentityClient } from "@azure/communication-identity";

// const app = Fastify();
// const identity = new CommunicationIdentityClient(process.env.ACS_CONNECTION_STRING!);

// app.get("/token", async (_req, _res) => {
//   // Least-privilege: join existing meetings only
//   const { user, token } = await identity.createUserAndToken(["voip.join"]);
//   return { userId: user.communicationUserId, token: token.token, expiresOn: token.expiresOn };
// });

// app.listen({ port: 3000 });
