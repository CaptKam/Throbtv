import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, uniqueIndex, index, serial, primaryKey } from "drizzle-orm/pg-core";
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
  description: text("description"),
  duration: text("duration"),
  durationSeconds: integer("duration_seconds"),
  tags: text("tags").array(),
  category: text("category"),
  orientation: text("orientation").default("straight"),
  quality: text("quality").default("HD"),
  rating: integer("rating").default(0),
  thumbnailUrl: text("thumbnail_url"),
  trailerUrl: text("trailer_url"),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("videos_category_idx").on(table.category),
  index("videos_created_at_idx").on(table.createdAt),
  index("videos_category_created_idx").on(table.category, table.createdAt),
  index("videos_orientation_idx").on(table.orientation),
  index("videos_views_idx").on(table.views),
  index("videos_duration_idx").on(table.durationSeconds),
]);

// ---- Normalized tags ----
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  count: integer("count").default(0),
});

export const videoTags = pgTable("video_tags", {
  videoId: varchar("video_id", { length: 64 }).notNull().references(() => videos.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.videoId, table.tagId] }),
  index("video_tags_tag_idx").on(table.tagId),
]);

// ---- Performers ----
export const performers = pgTable("performers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url"),
});

export const videoPerformers = pgTable("video_performers", {
  videoId: varchar("video_id", { length: 64 }).notNull().references(() => videos.id, { onDelete: "cascade" }),
  performerId: integer("performer_id").notNull().references(() => performers.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.videoId, table.performerId] }),
  index("video_performers_performer_idx").on(table.performerId),
]);

// ---- Studios ----
export const studios = pgTable("studios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url"),
});

export const videoStudios = pgTable("video_studios", {
  videoId: varchar("video_id", { length: 64 }).notNull().references(() => videos.id, { onDelete: "cascade" }),
  studioId: integer("studio_id").notNull().references(() => studios.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.videoId, table.studioId] }),
  index("video_studios_studio_idx").on(table.studioId),
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
export type Tag = typeof tags.$inferSelect;
export type Performer = typeof performers.$inferSelect;
export type Studio = typeof studios.$inferSelect;
