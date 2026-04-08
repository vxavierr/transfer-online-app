import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env["VITE_API_BASE_URL"] ?? "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) => {
  return c.json({ status: "ok", version: "0.1.0" });
});

const port = Number(process.env["API_PORT"]) || 3001;

export default {
  port,
  fetch: app.fetch,
};

console.log(`Uhuru OS API running on http://localhost:${port}`);
