import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  preferences: jsonb("preferences").$type<{
    defaultBufferSeconds: number;
    autoAdvance: boolean;
    queueBehavior: "loop" | "stop" | "shuffle";
  }>().default({ defaultBufferSeconds: 5, autoAdvance: true, queueBehavior: "loop" }),
});

export const videos = pgTable("videos", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  sourceUrl: text("source_url").notNull(),
  embedUrl: text("embed_url"),
  videoIdOnSource: text("video_id_on_source"),
  sourceDomain: text("source_domain"),
  title: text("title").notNull(),
  duration: text("duration"),
  durationSeconds: integer("duration_seconds"),
  tags: text("tags").array(),
  category: text("category"),
  thumbnailUrl: text("thumbnail_url"),
  trailerUrl: text("trailer_url"),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("videos_category_idx").on(table.category),
  index("videos_created_at_idx").on(table.createdAt),
  index("videos_category_created_idx").on(table.category, table.createdAt),
]);

export const playlists = pgTable("playlists", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playlistItems = pgTable("playlist_items", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id", { length: 64 }).notNull().references(() => playlists.id, { onDelete: "cascade" }),
  videoId: varchar("video_id", { length: 64 }).notNull().references(() => videos.id),
  position: integer("position").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id),
  videoId: varchar("video_id", { length: 64 }).notNull().references(() => videos.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("likes_user_video_idx").on(table.userId, table.videoId),
]);

export const watchHistory = pgTable("watch_history", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 64 }).notNull().references(() => users.id),
  videoId: varchar("video_id", { length: 64 }).notNull().references(() => videos.id),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
  watchDurationSeconds: integer("watch_duration_seconds"),
  completed: boolean("completed").default(false),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({ email: true }).extend({
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, createdAt: true, views: true });

export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, createdAt: true, userId: true });

export const insertPlaylistItemSchema = createInsertSchema(playlistItems).omit({ id: true, addedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type PlaylistItem = typeof playlistItems.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type WatchHistoryEntry = typeof watchHistory.$inferSelect;
