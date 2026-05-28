import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes";
import { logger } from "./lib/logger";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    userRole?: string;
    userName?: string;
    userEmail?: string;
    franchiseId?: number | null;
    linkedFranchiseIds?: number[];
  }
}

const PgSession = connectPgSimple(session);

const app: Express = express();

// Behind a TLS-terminating proxy (Render, etc.) so secure session cookies work.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "pontob-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use("/api", router);

// In production the same service also serves the built React frontend.
// The frontend lives at artifacts/pontob/dist/public relative to the repo
// root (Render runs from the repo root). Override with CLIENT_DIST if needed.
if (process.env.NODE_ENV === "production") {
  const clientDist = process.env.CLIENT_DIST
    ? path.resolve(process.env.CLIENT_DIST)
    : path.resolve(process.cwd(), "artifacts/pontob/dist/public");

  app.use(express.static(clientDist));

  // SPA fallback: any non-API GET request returns index.html so client-side
  // routing (wouter) can take over.
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

export default app;
