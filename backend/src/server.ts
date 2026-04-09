import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import adminRoutes from "./routes/admin.js";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
const host = process.env.HOST ?? "0.0.0.0";
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
const localhostRegex = /^http:\/\/localhost:\d+$/;
const lanRegex = /^http:\/\/(\d{1,3}\.){3}\d{1,3}:\d+$/;

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients/tests without Origin.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (origin === frontendUrl || localhostRegex.test(origin) || lanRegex.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "ji-backend",
    endpoints: ["/health", "/api/admin/properties"],
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ji-backend" });
});

app.use("/api/admin", adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, host, () => {
  console.log(`[ji-backend] Listening on http://localhost:${port}`);
});
