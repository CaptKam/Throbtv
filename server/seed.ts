import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { videos } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const FEED_V2 = path.resolve(process.cwd(), "attached_assets/gay_feed_v2.txt");
const FEED_EXCLUDE = path.resolve(process.cwd(), "attached_assets/gay_feed_exclude_cats.txt");
const FEED_INCLUDE = path.resolve(process.cwd(), "attached_assets/gay_feed_include_cats.txt");

function fixEmbedDomain(url: string): string {
  if (!url) return "";
  let fixed = url.replace("fh.video/embed/", "faphouse.com/embed/");
  if (!fixed.includes("utm_content=throb.tv")) {
    const sep = fixed.includes("?") ? "&" : "?";
    fixed = `${fixed}${sep}utm_content=throb.tv`;
  }
  return fixed;
}

function appendUtm(url: string): string {
  if (!url) return url;
  if (!url.includes("utm_content=throb.tv")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}utm_content=throb.tv`;
  }
  return url;
}

function extractVideoId(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1]?.split("?")[0] || "";
  } catch { return ""; }
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

interface VideoRow {
  sourceUrl: string;
  embedUrl: string;
  videoIdOnSource: string;
  sourceDomain: string;
  title: string;
  description: string;
  duration: string;
  durationSeconds: number;
  tags: string[];
  category: string;
  thumbnailUrl: string;
  trailerUrl: string;
  views: number;
  quality: string;
  orientation: string;
}

function parseV2Feed(raw: string): VideoRow[] {
  const lines = raw.split("\n").filter(l => l.trim());
  const rows: VideoRow[] = [];
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const p = line.split("|");
    if (p.length < 16) continue;
    const embedUrl = p[1] || "";
    const sourceUrl = p[2] || "";
    const thumbs = (p[3] || "").split(";");
    const thumbnailUrl = thumbs[0] || "";
    const title = p[4] || "Untitled";
    const description = p[5] || "";
    const categories = (p[6] || "").split(";").filter(Boolean);
    const durationSeconds = parseInt(p[9]) || 0;
    const likes = parseInt(p[12]) || 0;
    const trailerUrl = p[13] || "";
    const resolution = p[14] || "";
    const orientation = p[15] || "gay";
    const videoId = extractVideoId(sourceUrl) || extractVideoId(embedUrl);
    if (!videoId) continue;

    let quality = "SD";
    if (resolution === "4K" || resolution === "2160") quality = "4K";
    else if (resolution === "1080" || resolution === "1440") quality = "HD";
    else if (resolution === "720") quality = "HD";

    rows.push({
      sourceUrl: appendUtm(sourceUrl),
      embedUrl: fixEmbedDomain(embedUrl),
      videoIdOnSource: videoId,
      sourceDomain: extractDomain(sourceUrl),
      title,
      description,
      duration: formatDuration(durationSeconds),
      durationSeconds,
      tags: categories.length > 0 ? categories : ["Gay"],
      category: categories[0] || "Gay",
      thumbnailUrl,
      trailerUrl,
      views: likes * 100 + Math.floor(Math.random() * 500),
      quality,
      orientation,
    });
  }
  return rows;
}

function parseLegacyFeed(raw: string): VideoRow[] {
  const lines = raw.split("\n").filter(l => l.trim());
  const rows: VideoRow[] = [];
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const p = line.split("|");
    if (p.length < 6) continue;
    const embedUrl = p[0];
    const sourceUrl = p[1];
    const thumbnailUrl = p[2] || "";
    const title = p[3] || "Untitled";
    const categories = (p[4] || "").split(";").filter(Boolean);
    const durationSeconds = parseInt(p[5]) || 0;
    const videoId = extractVideoId(sourceUrl) || extractVideoId(embedUrl);
    if (!videoId) continue;
    rows.push({
      sourceUrl: appendUtm(sourceUrl),
      embedUrl: fixEmbedDomain(embedUrl),
      videoIdOnSource: videoId,
      sourceDomain: extractDomain(sourceUrl),
      title,
      description: "",
      duration: formatDuration(durationSeconds),
      durationSeconds,
      tags: categories.length > 0 ? categories : ["Gay"],
      category: categories[0] || "Gay",
      thumbnailUrl,
      trailerUrl: "",
      views: Math.floor(Math.random() * 5000) + 100,
      quality: "HD",
      orientation: "gay",
    });
  }
  return rows;
}

const BATCH_SIZE = 500;

async function insertBatched(db: ReturnType<typeof drizzle>, rows: VideoRow[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(videos).values(batch);
    if (i % 10000 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(`  Inserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}...`);
    }
  }
}

export async function seedVideos() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  await db.execute(sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS trailer_url text`);
  await db.execute(sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS embed_duration_seconds integer`);
  await db.execute(sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS description text`);
  await db.execute(sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS orientation text DEFAULT 'gay'`);
  await db.execute(sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS quality text DEFAULT 'HD'`);

  const existing = await db.select({ count: sql<number>`count(*)` }).from(videos);
  const count = Number(existing[0].count);

  const hasV2 = fs.existsSync(FEED_V2);
  const hasExclude = fs.existsSync(FEED_EXCLUDE);
  const hasInclude = fs.existsSync(FEED_INCLUDE);

  if (!hasV2 && !hasExclude && !hasInclude) {
    console.log(`No feed files found. DB has ${count} videos.`);
    await pool.end();
    return;
  }

  if (count > 0 && hasV2) {
    const trailerCount = await db.execute(sql`SELECT COUNT(*) as c FROM videos WHERE trailer_url IS NOT NULL AND trailer_url != ''`);
    const tc = Number((trailerCount.rows[0] as any)?.c ?? 0);
    if (tc > 0) {
      console.log(`Database has ${count} videos (${tc} with trailers), skipping seed.`);
      await pool.end();
      return;
    }
  } else if (count > 0 && !hasV2) {
    console.log(`Database has ${count} videos, skipping seed.`);
    await pool.end();
    return;
  }

  console.log(`Database has ${count} videos. Re-seeding...`);
  if (count > 0) {
    await db.delete(videos);
    console.log("Cleared old videos.");
  }

  if (hasV2) {
    const raw = fs.readFileSync(FEED_V2, "utf-8");
    const rows = parseV2Feed(raw);
    console.log(`Importing ${rows.length} videos from v2 feed (with trailers)...`);
    const withTrailer = rows.filter(r => r.trailerUrl);
    console.log(`  ${withTrailer.length} have trailer URLs`);
    await insertBatched(db, rows);
  }

  if (hasExclude) {
    const raw = fs.readFileSync(FEED_EXCLUDE, "utf-8");
    const rows = parseLegacyFeed(raw);
    console.log(`Importing ${rows.length} videos from exclude-categories feed...`);
    await insertBatched(db, rows);
  }

  if (hasInclude) {
    const raw = fs.readFileSync(FEED_INCLUDE, "utf-8");
    const rows = parseLegacyFeed(raw);
    console.log(`Importing ${rows.length} videos from include-categories feed...`);
    await insertBatched(db, rows);
  }

  const final = await db.select({ count: sql<number>`count(*)` }).from(videos);
  console.log(`Seed complete! Total videos: ${Number(final[0].count)}`);
  await pool.end();
}
