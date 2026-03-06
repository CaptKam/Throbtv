import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertVideoSchema, insertPlaylistSchema } from "@shared/schema";

const PgSession = connectPgSimple(session);

// FapHouse blocks /embed/ via frame-ancestors CSP; /videos/ works in iframes
function normalizeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return url as null;
  return url.replace('faphouse.com/embed/', 'faphouse.com/videos/');
}

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgSession({ pool: sessionPool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "throb-dev-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // ==================== AUTH ====================

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const { email, password } = parsed.data;

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser(email, passwordHash);

    req.session.userId = user.id;
    return res.status(201).json({ id: user.id, email: user.email });
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }

    const { email, password } = parsed.data;
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.userId = user.id;
    return res.json({ id: user.id, email: user.email });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Failed to log out" });
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    return res.json({ id: user.id, email: user.email, preferences: user.preferences });
  });

  // ==================== VIDEOS ====================

  app.get("/api/videos", async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 24, 100);
    const offset = Number(req.query.offset) || 0;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const orientation = typeof req.query.orientation === "string" ? req.query.orientation : undefined;
    const tagsParam = typeof req.query.tags === "string" ? req.query.tags : undefined;
    const tagSlugs = tagsParam ? tagsParam.split(",").map(t => t.trim()).filter(Boolean) : undefined;
    const minDuration = req.query.minDuration !== undefined ? Number(req.query.minDuration) : 120;

    const [videosList, total] = await Promise.all([
      storage.getVideos({ limit, offset, search, category, tags: tagSlugs, orientation, minDuration }),
      storage.getVideoCount({ search, category, tags: tagSlugs, orientation, minDuration }),
    ]);

    // Normalize embed URLs so FapHouse iframes use /videos/ (allowed) not /embed/ (blocked)
    const normalized = videosList.map(v => ({ ...v, embedUrl: normalizeEmbedUrl(v.embedUrl) }));

    // Cache video listings for 60s — catalog doesn't change often
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json({ videos: normalized, total, limit, offset });
  });

  app.get("/api/videos/:id", async (req: Request, res: Response) => {
    const id = String(String(req.params.id));
    const video = await storage.getVideoById(id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    // Fetch related tags, performers, studios in parallel
    const [relatedTags, relatedPerformers, relatedStudios] = await Promise.all([
      storage.getTagsForVideo(id),
      storage.getPerformersForVideo(id),
      storage.getStudiosForVideo(id),
    ]);

    res.set("Cache-Control", "public, max-age=300");
    return res.json({ ...video, embedUrl: normalizeEmbedUrl(video.embedUrl), videoTags: relatedTags, videoPerformers: relatedPerformers, videoStudios: relatedStudios });
  });

  app.post("/api/videos", requireAuth, async (req: Request, res: Response) => {
    const parsed = insertVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }
    const video = await storage.createVideo(parsed.data);
    return res.status(201).json(video);
  });

  // ==================== TAGS ====================

  app.get("/api/tags", async (_req: Request, res: Response) => {
    const limit = Number(_req.query.limit) || 50;
    const tagsList = await storage.getPopularTags(limit);
    res.set("Cache-Control", "public, max-age=300");
    return res.json(tagsList);
  });

  // ==================== PERFORMERS ====================

  app.get("/api/performers", async (_req: Request, res: Response) => {
    const limit = Number(_req.query.limit) || 50;
    const performersList = await storage.getPerformers(limit);
    res.set("Cache-Control", "public, max-age=300");
    return res.json(performersList);
  });

  // ==================== STUDIOS ====================

  app.get("/api/studios", async (_req: Request, res: Response) => {
    const limit = Number(_req.query.limit) || 50;
    const studiosList = await storage.getStudios(limit);
    res.set("Cache-Control", "public, max-age=300");
    return res.json(studiosList);
  });

  // ==================== PLAYLISTS ====================

  app.get("/api/playlists", requireAuth, async (req: Request, res: Response) => {
    const playlistsList = await storage.getPlaylistsByUser(req.session.userId!);
    return res.json(playlistsList);
  });

  app.post("/api/playlists", requireAuth, async (req: Request, res: Response) => {
    const parsed = insertPlaylistSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }
    const playlist = await storage.createPlaylist(req.session.userId!, parsed.data);
    return res.status(201).json(playlist);
  });

  app.delete("/api/playlists/:id", requireAuth, async (req: Request, res: Response) => {
    const deleted = await storage.deletePlaylist(String(req.params.id), req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Playlist not found" });
    return res.json({ message: "Deleted" });
  });

  app.get("/api/playlists/:id/items", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getPlaylistItems(String(req.params.id));
    return res.json(items);
  });

  app.post("/api/playlists/:id/items", requireAuth, async (req: Request, res: Response) => {
    const { videoId, position } = req.body;
    if (!videoId) return res.status(400).json({ message: "videoId is required" });
    const item = await storage.addPlaylistItem(String(req.params.id), videoId, position ?? 0);
    return res.status(201).json(item);
  });

  app.delete("/api/playlist-items/:id", requireAuth, async (req: Request, res: Response) => {
    const removed = await storage.removePlaylistItem(String(req.params.id));
    if (!removed) return res.status(404).json({ message: "Item not found" });
    return res.json({ message: "Removed" });
  });

  // ==================== LIKES ====================

  app.post("/api/likes/toggle", requireAuth, async (req: Request, res: Response) => {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ message: "videoId is required" });
    const liked = await storage.toggleLike(req.session.userId!, videoId);
    return res.json({ liked });
  });

  app.get("/api/likes", requireAuth, async (req: Request, res: Response) => {
    const likesList = await storage.getLikesByUser(req.session.userId!);
    return res.json(likesList);
  });

  // ==================== WATCH HISTORY ====================

  app.post("/api/history", requireAuth, async (req: Request, res: Response) => {
    const { videoId, durationSeconds, completed } = req.body;
    if (!videoId) return res.status(400).json({ message: "videoId is required" });
    const entry = await storage.addWatchHistory(req.session.userId!, videoId, durationSeconds, completed);
    return res.status(201).json(entry);
  });

  app.get("/api/history", requireAuth, async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 50;
    const history = await storage.getWatchHistory(req.session.userId!, limit);
    return res.json(history);
  });

  return httpServer;
}
