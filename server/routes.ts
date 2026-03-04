import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertVideoSchema, insertPlaylistSchema } from "@shared/schema";

const PgSession = connectPgSimple(session);

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
      secret: process.env.SESSION_SECRET || "noog-dev-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
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
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;

    const [videosList, total] = await Promise.all([
      storage.getVideos({ limit, offset, search, category }),
      storage.getVideoCount({ search, category }),
    ]);

    return res.json({ videos: videosList, total, limit, offset });
  });

  app.get("/api/videos/:id", async (req: Request, res: Response) => {
    const video = await storage.getVideoById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    return res.json(video);
  });

  app.post("/api/videos", requireAuth, async (req: Request, res: Response) => {
    const parsed = insertVideoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0].message });
    }
    const video = await storage.createVideo(parsed.data);
    return res.status(201).json(video);
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
    const deleted = await storage.deletePlaylist(req.params.id, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Playlist not found" });
    return res.json({ message: "Deleted" });
  });

  app.get("/api/playlists/:id/items", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getPlaylistItems(req.params.id);
    return res.json(items);
  });

  app.post("/api/playlists/:id/items", requireAuth, async (req: Request, res: Response) => {
    const { videoId, position } = req.body;
    if (!videoId) return res.status(400).json({ message: "videoId is required" });
    const item = await storage.addPlaylistItem(req.params.id, videoId, position ?? 0);
    return res.status(201).json(item);
  });

  app.delete("/api/playlist-items/:id", requireAuth, async (req: Request, res: Response) => {
    const removed = await storage.removePlaylistItem(req.params.id);
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
