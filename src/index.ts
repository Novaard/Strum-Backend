import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { initMQTT } from "./mqtt.js";
import { authRoutes } from "./routes/auth.js";
import { apiRoutes } from "./routes/api.js";

// Jalankan background service
initMQTT();

const app = new Elysia()
  .use(cors())
  .use(authRoutes) // Endpoint Public (Login/Logout)
  .use(apiRoutes) // Endpoint Protected
  .listen(3000);

console.log(
  `🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`,
);
