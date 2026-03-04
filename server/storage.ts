import { eq, and, desc, asc, ilike, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users, videos, playlists, playlistItems, likes, watchHistory,
  type User, type InsertVideo, type Video, type Playlist, type InsertPlaylist,
  type PlaylistItem, type Like, type WatchHistoryEntry
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, passwordHash: string): Promise<User>;

  // Videos
  getVideos(params: { limit?: number; offset?: number; search?: string; category?: string; tags?: string[] }): Promise<Video[]>;
  getVideoById(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  getVideoCount(params?: { search?: string; category?: string }): Promise<number>;

  // Playlists
  getPlaylistsByUser(userId: string): Promise<Playlist[]>;
  getPlaylistById(id: string): Promise<Playlist | undefined>;
  createPlaylist(userId: string, data: InsertPlaylist): Promise<Playlist>;
  deletePlaylist(id: string, userId: string): Promise<boolean>;
  getPlaylistItems(playlistId: string): Promise<(PlaylistItem & { video: Video })[]>;
  addPlaylistItem(playlistId: string, videoId: string, position: number): Promise<PlaylistItem>;
  removePlaylistItem(id: string): Promise<boolean>;

  // Likes
  toggleLike(userId: string, videoId: string): Promise<boolean>;
  getLikesByUser(userId: string): Promise<Like[]>;
  isLiked(userId: string, videoId: string): Promise<boolean>;

  // Watch History
  addWatchHistory(userId: string, videoId: string, durationSeconds?: number, completed?: boolean): Promise<WatchHistoryEntry>;
  getWatchHistory(userId: string, limit?: number): Promise<(WatchHistoryEntry & { video: Video })[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return user;
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const [user] = await db.insert(users).values({ email: email.toLowerCase(), passwordHash }).returning();
    return user;
  }

  async getVideos(params: { limit?: number; offset?: number; search?: string; category?: string; tags?: string[] } = {}): Promise<Video[]> {
    const { limit = 24, offset = 0, search, category } = params;
    let query = db.select().from(videos);

    const conditions = [];
    if (search) {
      conditions.push(ilike(videos.title, `%${search}%`));
    }
    if (category) {
      conditions.push(eq(videos.category, category));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return query.orderBy(desc(videos.createdAt)).limit(limit).offset(offset);
  }

  async getVideoById(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return video;
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [created] = await db.insert(videos).values(video).returning();
    return created;
  }

  async getVideoCount(params?: { search?: string; category?: string }): Promise<number> {
    const conditions = [];
    if (params?.search) {
      conditions.push(ilike(videos.title, `%${params.search}%`));
    }
    if (params?.category) {
      conditions.push(eq(videos.category, params.category));
    }

    let query = db.select({ count: sql<number>`count(*)` }).from(videos);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const [result] = await query;
    return Number(result.count);
  }

  async getPlaylistsByUser(userId: string): Promise<Playlist[]> {
    return db.select().from(playlists).where(eq(playlists.userId, userId)).orderBy(desc(playlists.createdAt));
  }

  async getPlaylistById(id: string): Promise<Playlist | undefined> {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
    return playlist;
  }

  async createPlaylist(userId: string, data: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db.insert(playlists).values({ ...data, userId }).returning();
    return playlist;
  }

  async deletePlaylist(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(playlists).where(and(eq(playlists.id, id), eq(playlists.userId, userId))).returning();
    return result.length > 0;
  }

  async getPlaylistItems(playlistId: string): Promise<(PlaylistItem & { video: Video })[]> {
    const items = await db.select().from(playlistItems)
      .innerJoin(videos, eq(playlistItems.videoId, videos.id))
      .where(eq(playlistItems.playlistId, playlistId))
      .orderBy(asc(playlistItems.position));

    return items.map(row => ({
      ...row.playlist_items,
      video: row.videos,
    }));
  }

  async addPlaylistItem(playlistId: string, videoId: string, position: number): Promise<PlaylistItem> {
    const [item] = await db.insert(playlistItems).values({ playlistId, videoId, position }).returning();
    return item;
  }

  async removePlaylistItem(id: string): Promise<boolean> {
    const result = await db.delete(playlistItems).where(eq(playlistItems.id, id)).returning();
    return result.length > 0;
  }

  async toggleLike(userId: string, videoId: string): Promise<boolean> {
    const existing = await db.select().from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(likes).where(eq(likes.id, existing[0].id));
      return false;
    } else {
      await db.insert(likes).values({ userId, videoId });
      return true;
    }
  }

  async getLikesByUser(userId: string): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.userId, userId)).orderBy(desc(likes.createdAt));
  }

  async isLiked(userId: string, videoId: string): Promise<boolean> {
    const [result] = await db.select().from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1);
    return !!result;
  }

  async addWatchHistory(userId: string, videoId: string, durationSeconds?: number, completed?: boolean): Promise<WatchHistoryEntry> {
    const [entry] = await db.insert(watchHistory).values({
      userId,
      videoId,
      watchDurationSeconds: durationSeconds,
      completed: completed ?? false,
    }).returning();
    return entry;
  }

  async getWatchHistory(userId: string, limit = 50): Promise<(WatchHistoryEntry & { video: Video })[]> {
    const items = await db.select().from(watchHistory)
      .innerJoin(videos, eq(watchHistory.videoId, videos.id))
      .where(eq(watchHistory.userId, userId))
      .orderBy(desc(watchHistory.watchedAt))
      .limit(limit);

    return items.map(row => ({
      ...row.watch_history,
      video: row.videos,
    }));
  }
}

export const storage = new DatabaseStorage();
