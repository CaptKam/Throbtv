import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  // Ensure DB schema is up to date before any queries run
  const pg = await import("pg");
  const migrationPool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
  await migrationPool.query(`ALTER TABLE videos ADD COLUMN IF NOT EXISTS trailer_url text`);
  // Performance indexes for 139K+ video catalog
  await migrationPool.query(`CREATE INDEX IF NOT EXISTS videos_category_idx ON videos (category)`);
  await migrationPool.query(`CREATE INDEX IF NOT EXISTS videos_created_at_idx ON videos (created_at DESC)`);
  await migrationPool.query(`CREATE INDEX IF NOT EXISTS videos_category_created_idx ON videos (category, created_at DESC)`);
  // pg_trgm for fast ILIKE text search (ignore if extension unavailable)
  await migrationPool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`).catch(() => {});
  await migrationPool.query(`CREATE INDEX IF NOT EXISTS videos_title_trgm_idx ON videos USING gin (title gin_trgm_ops)`).catch(() => {});
  await migrationPool.end();

  const { seedVideos } = await import("./seed");
  await seedVideos().catch(err => console.error("Seed error:", err));

  const { setupSocket } = await import("./socket");
  setupSocket(httpServer);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
