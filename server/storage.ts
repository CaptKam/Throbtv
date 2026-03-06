import { eq, and, desc, asc, ilike, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users, videos, playlists, playlistItems, likes, watchHistory,
  tags, videoTags, performers, videoPerformers, studios, videoStudios,
  type User, type InsertVideo, type Video, type Playlist, type InsertPlaylist,
  type PlaylistItem, type Like, type WatchHistoryEntry,
  type Tag, type Performer, type Studio
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Simple TTL cache for video list queries (avoids hitting DB on every browse/scroll)
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const videoCache = new Map<string, CacheEntry<any>>();
const VIDEO_CACHE_TTL = 60_000; // 1 minute

function getCached<T>(key: string): T | undefined {
  const entry = videoCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    videoCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  // Cap cache size to prevent unbounded growth
  if (videoCache.size > 500) {
    const firstKey = videoCache.keys().next().value;
    if (firstKey) videoCache.delete(firstKey);
  }
  videoCache.set(key, { data, expiry: Date.now() + VIDEO_CACHE_TTL });
}

export function clearVideoCache() {
  videoCache.clear();
}

export interface IStorage {
  // Users
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(email: string, passwordHash: string): Promise<User>;

  // Videos
  getVideos(params: { limit?: number; offset?: number; search?: string; category?: string; tags?: string[]; orientation?: string }): Promise<Video[]>;
  getVideoById(id: string): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  getVideoCount(params?: { search?: string; category?: string; tags?: string[]; orientation?: string; minDuration?: number }): Promise<number>;

  // Tags
  getTagBySlug(slug: string): Promise<Tag | undefined>;
  getPopularTags(limit?: number): Promise<Tag[]>;
  getTagsForVideo(videoId: string): Promise<Tag[]>;
  setVideoTags(videoId: string, tagSlugs: string[]): Promise<void>;

  // Performers
  getPerformers(limit?: number): Promise<Performer[]>;
  getPerformersForVideo(videoId: string): Promise<Performer[]>;

  // Studios
  getStudios(limit?: number): Promise<Studio[]>;
  getStudiosForVideo(videoId: string): Promise<Studio[]>;

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

  async getVideos(params: { limit?: number; offset?: number; search?: string; category?: string; tags?: string[]; orientation?: string; minDuration?: number } = {}): Promise<Video[]> {
    const { limit = 24, offset = 0, search, category, tags: tagSlugs, orientation, minDuration } = params;

    const cacheKey = `v:${limit}:${offset}:${search || ""}:${category || ""}:${(tagSlugs || []).join(",")}:${orientation || ""}:${minDuration || ""}`;
    const cached = getCached<Video[]>(cacheKey);
    if (cached) return cached;

    if (tagSlugs && tagSlugs.length > 0) {
      const result = await this.getVideosByTags(tagSlugs, { limit, offset, search, category, orientation, minDuration });
      setCache(cacheKey, result);
      return result;
    }

    let query = db.select().from(videos);

    // Only return videos with playable trailer URLs (FapHouse blocks iframe embeds)
    const conditions = [sql`${videos.trailerUrl} IS NOT NULL AND ${videos.trailerUrl} != ''`];
    if (search) {
      conditions.push(sql`(
        to_tsvector('english', ${videos.title}) @@ plainto_tsquery('english', ${search})
        OR ${ilike(videos.title, `%${search}%`)}
      )`);
    }
    if (category) {
      conditions.push(eq(videos.category, category));
    }
    if (orientation) {
      conditions.push(eq(videos.orientation, orientation));
    }
    if (minDuration && minDuration > 0) {
      conditions.push(sql`${videos.durationSeconds} >= ${minDuration}`);
    }

    query = query.where(and(...conditions)) as any;

    const result = await query.orderBy(desc(videos.views), desc(videos.createdAt)).limit(limit).offset(offset);
    setCache(cacheKey, result);
    return result;
  }

  /**
   * Find videos that match ALL given tag slugs (intersection query).
   * Uses a JOIN per tag with HAVING COUNT to ensure all tags match.
   */
  private async getVideosByTags(
    tagSlugs: string[],
    opts: { limit: number; offset: number; search?: string; category?: string; orientation?: string; minDuration?: number }
  ): Promise<Video[]> {
    const tagCount = tagSlugs.length;
    const searchCondition = opts.search
      ? sql`AND (to_tsvector('english', v.title) @@ plainto_tsquery('english', ${opts.search}) OR v.title ILIKE ${'%' + opts.search + '%'})`
      : sql``;
    const categoryCondition = opts.category
      ? sql`AND v.category = ${opts.category}`
      : sql``;
    const orientationCondition = opts.orientation
      ? sql`AND v.orientation = ${opts.orientation}`
      : sql``;
    const minDurationCondition = opts.minDuration && opts.minDuration > 0
      ? sql`AND v.duration_seconds >= ${opts.minDuration}`
      : sql``;

    const rows = await db.execute(sql`
      SELECT v.* FROM videos v
      JOIN video_tags vt ON v.id = vt.video_id
      JOIN tags t ON vt.tag_id = t.id
      WHERE t.slug = ANY(${tagSlugs})
      AND v.trailer_url IS NOT NULL AND v.trailer_url != ''
      ${searchCondition}
      ${categoryCondition}
      ${orientationCondition}
      ${minDurationCondition}
      GROUP BY v.id
      HAVING COUNT(DISTINCT t.id) = ${tagCount}
      ORDER BY v.views DESC, v.created_at DESC
      LIMIT ${opts.limit} OFFSET ${opts.offset}
    `);

    return rows.rows as Video[];
  }

  async getVideoById(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return video;
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [created] = await db.insert(videos).values(video).returning();
    return created;
  }

  async getVideoCount(params?: { search?: string; category?: string; tags?: string[]; orientation?: string; minDuration?: number }): Promise<number> {
    const cacheKey = `vc:${params?.search || ""}:${params?.category || ""}:${(params?.tags || []).join(",")}:${params?.orientation || ""}:${params?.minDuration || ""}`;
    const cached = getCached<number>(cacheKey);
    if (cached !== undefined) return cached;

    if (params?.tags && params.tags.length > 0) {
      const tagCount = params.tags.length;
      const searchCondition = params.search
        ? sql`AND (to_tsvector('english', v.title) @@ plainto_tsquery('english', ${params.search}) OR v.title ILIKE ${'%' + params.search + '%'})`
        : sql``;
      const categoryCondition = params.category
        ? sql`AND v.category = ${params.category}`
        : sql``;
      const orientationCondition = params.orientation
        ? sql`AND v.orientation = ${params.orientation}`
        : sql``;
      const minDurationCondition = params.minDuration && params.minDuration > 0
        ? sql`AND v.duration_seconds >= ${params.minDuration}`
        : sql``;

      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM (
          SELECT v.id FROM videos v
          JOIN video_tags vt ON v.id = vt.video_id
          JOIN tags t ON vt.tag_id = t.id
          WHERE t.slug = ANY(${params.tags})
          AND v.trailer_url IS NOT NULL AND v.trailer_url != ''
          ${searchCondition}
          ${categoryCondition}
          ${orientationCondition}
          ${minDurationCondition}
          GROUP BY v.id
          HAVING COUNT(DISTINCT t.id) = ${tagCount}
        ) sub
      `);
      const count = Number((result.rows[0] as any)?.count ?? 0);
      setCache(cacheKey, count);
      return count;
    }

    // Only count videos with playable trailer URLs (FapHouse blocks iframe embeds)
    const conditions: any[] = [sql`${videos.trailerUrl} IS NOT NULL AND ${videos.trailerUrl} != ''`];
    if (params?.search) {
      conditions.push(sql`(
        to_tsvector('english', ${videos.title}) @@ plainto_tsquery('english', ${params.search})
        OR ${ilike(videos.title, `%${params.search}%`)}
      )`);
    }
    if (params?.category) {
      conditions.push(eq(videos.category, params.category));
    }
    if (params?.orientation) {
      conditions.push(eq(videos.orientation, params.orientation));
    }
    if (params?.minDuration && params.minDuration > 0) {
      conditions.push(sql`${videos.durationSeconds} >= ${params.minDuration}`);
    }

    let query = db.select({ count: sql<number>`count(*)` }).from(videos);
    query = query.where(and(...conditions)) as any;
    const [result] = await query;
    const count = Number(result.count);
    setCache(cacheKey, count);
    return count;
  }

  // ---- Tags ----

  async getTagBySlug(slug: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    return tag;
  }

  async getPopularTags(limit = 50): Promise<Tag[]> {
    return db.select().from(tags).orderBy(desc(tags.count)).limit(limit);
  }

  async getTagsForVideo(videoId: string): Promise<Tag[]> {
    const rows = await db.select({ tag: tags })
      .from(videoTags)
      .innerJoin(tags, eq(videoTags.tagId, tags.id))
      .where(eq(videoTags.videoId, videoId));
    return rows.map(r => r.tag);
  }

  async setVideoTags(videoId: string, tagSlugs: string[]): Promise<void> {
    // Remove existing tags
    await db.delete(videoTags).where(eq(videoTags.videoId, videoId));

    if (tagSlugs.length === 0) return;

    // Upsert tags and link them
    for (const slug of tagSlugs) {
      const name = slug.replace(/-/g, " ");
      const [tag] = await db.insert(tags)
        .values({ name, slug, count: 0 })
        .onConflictDoNothing({ target: tags.slug })
        .returning();

      const existing = tag || await this.getTagBySlug(slug);
      if (existing) {
        await db.insert(videoTags).values({ videoId, tagId: existing.id }).onConflictDoNothing();
      }
    }

    // Update tag counts
    await db.execute(sql`
      UPDATE tags SET count = (
        SELECT COUNT(*) FROM video_tags WHERE video_tags.tag_id = tags.id
      ) WHERE slug = ANY(${tagSlugs})
    `);
  }

  // ---- Performers ----

  async getPerformers(limit = 50): Promise<Performer[]> {
    return db.select().from(performers).orderBy(asc(performers.name)).limit(limit);
  }

  async getPerformersForVideo(videoId: string): Promise<Performer[]> {
    const rows = await db.select({ performer: performers })
      .from(videoPerformers)
      .innerJoin(performers, eq(videoPerformers.performerId, performers.id))
      .where(eq(videoPerformers.videoId, videoId));
    return rows.map(r => r.performer);
  }

  // ---- Studios ----

  async getStudios(limit = 50): Promise<Studio[]> {
    return db.select().from(studios).orderBy(asc(studios.name)).limit(limit);
  }

  async getStudiosForVideo(videoId: string): Promise<Studio[]> {
    const rows = await db.select({ studio: studios })
      .from(videoStudios)
      .innerJoin(studios, eq(videoStudios.studioId, studios.id))
      .where(eq(videoStudios.videoId, videoId));
    return rows.map(r => r.studio);
  }

  // ---- Playlists ----

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
