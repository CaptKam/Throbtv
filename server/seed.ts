import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { videos } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const GAY_FEED_FILE = path.resolve(process.cwd(), "attached_assets/fapcash_gay_feed.txt");
const LONG_FEED_FILE = path.resolve(process.cwd(), "attached_assets/long_embeds_1772671578853.csv");

function appendUtm(url: string): string {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_content=throb.tv`;
}

function extractEmbedUrl(embedHtml: string): string {
  const match = embedHtml.match(/src="([^"]+)"/);
  if (!match) return "";
  let url = match[1];
  url = url.replace("fh.video/embed/", "faphouse.com/embed/");
  return appendUtm(url);
}

function fixEmbedDomain(url: string): string {
  if (!url) return "";
  return appendUtm(url.replace("fh.video/embed/", "faphouse.com/embed/"));
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return ""; }
}

function extractVideoId(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch { return ""; }
}

interface VideoRow {
  sourceUrl: string;
  embedUrl: string;
  videoIdOnSource: string;
  sourceDomain: string;
  title: string;
  duration: string;
  durationSeconds: number;
  tags: string[];
  category: string;
  thumbnailUrl: string;
  trailerUrl: string;
  views: number;
}

function parseGayFeed(raw: string): VideoRow[] {
  const lines = raw.split("\n").filter(l => l.trim());
  const results: VideoRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.match(/^\d+\|/)) continue;
    const p = line.split("|");
    if (p.length < 14) continue;
    const duration = parseInt(p[9]) || 0;
    const categories = (p[6] || "").split(";").filter(Boolean);
    results.push({
      sourceUrl: appendUtm(p[2]),
      embedUrl: extractEmbedUrl(p[1]),
      videoIdOnSource: extractVideoId(p[2]) || p[0],
      sourceDomain: extractDomain(p[2]),
      title: p[4] || "Untitled",
      duration: formatDuration(duration),
      durationSeconds: duration,
      tags: categories.length > 0 ? categories : ["Gay"],
      category: categories[0] || "Gay",
      thumbnailUrl: (p[3] || "").split(";")[0] || "",
      trailerUrl: "",
      views: (parseInt(p[12]) || 0) * 100 + Math.floor(Math.random() * 5000),
    });
  }
  return results;
}

function parseLongFeed(raw: string): VideoRow[] {
  const lines = raw.split("\n").filter(l => l.trim());
  const results: VideoRow[] = [];
  for (const line of lines) {
    if (!line.match(/^\d+\|/)) continue;
    const p = line.split("|");
    if (p.length < 15) continue;
    const durationSeconds = parseInt(p[12]) || 0;
    const embedDuration = parseInt(p[15]) || 0;
    const actualDuration = durationSeconds > 0 ? durationSeconds : embedDuration;
    const categories = (p[7] || "").split(";").filter(Boolean);
    const trailerUrl = (p[14] || "").trim();
    results.push({
      sourceUrl: appendUtm(p[3]),
      embedUrl: fixEmbedDomain(p[2]),
      videoIdOnSource: extractVideoId(p[3]) || p[0],
      sourceDomain: extractDomain(p[3]),
      title: p[4] || "Untitled",
      duration: formatDuration(actualDuration),
      durationSeconds: actualDuration,
      tags: categories.length > 0 ? categories : ["Straight"],
      category: categories[0] || "Straight",
      thumbnailUrl: p[6] || "",
      trailerUrl: trailerUrl.startsWith("http") ? trailerUrl : "",
      views: (parseInt(p[13]) || 0) * 100 + Math.floor(Math.random() * 5000),
    });
  }
  return results;
}

const BATCH_SIZE = 500;

async function insertBatched(db: ReturnType<typeof drizzle>, rows: VideoRow[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(videos).values(batch);
    if (rows.length > BATCH_SIZE) {
      console.log(`  Inserted ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}...`);
    }
  }
}

export async function seedVideos() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  await db.execute(sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS trailer_url text`);

  const existing = await db.select({ count: sql<number>`count(*)` }).from(videos);
  const count = Number(existing[0].count);

  const hasGayFeed = fs.existsSync(GAY_FEED_FILE);
  const hasLongFeed = fs.existsSync(LONG_FEED_FILE);

  if (!hasGayFeed && !hasLongFeed) {
    if (count > 0) {
      console.log(`Database has ${count} videos, no feed files found, skipping seed.`);
    } else {
      console.log("No feed files found and DB empty.");
    }
    await pool.end();
    return;
  }

  let gayRows: VideoRow[] = [];
  let longRows: VideoRow[] = [];

  if (hasGayFeed) {
    const raw = fs.readFileSync(GAY_FEED_FILE, "utf-8");
    console.log(`Found gay feed file (${raw.length} bytes)`);
    gayRows = parseGayFeed(raw);
    console.log(`Parsed ${gayRows.length} gay videos`);
  }

  if (hasLongFeed) {
    const raw = fs.readFileSync(LONG_FEED_FILE, "utf-8");
    console.log(`Found long feed file (${raw.length} bytes)`);
    longRows = parseLongFeed(raw);
    console.log(`Parsed ${longRows.length} straight/mixed videos`);
  }

  const totalFeed = gayRows.length + longRows.length;

  if (totalFeed === 0) {
    console.log("No valid rows parsed from feeds, skipping.");
    await pool.end();
    return;
  }

  if (count >= totalFeed) {
    console.log(`Database already has ${count} videos (feeds have ${totalFeed}), skipping seed.`);
    await pool.end();
    return;
  }

  console.log(`Database has ${count} videos, feeds have ${totalFeed}. Re-seeding...`);
  await db.delete(videos);

  if (gayRows.length > 0) {
    console.log(`Inserting ${gayRows.length} gay videos...`);
    await insertBatched(db, gayRows);
  }

  if (longRows.length > 0) {
    console.log(`Inserting ${longRows.length} straight/mixed videos...`);
    await insertBatched(db, longRows);
  }

  console.log(`Seeded ${totalFeed} total videos from fap.cash feeds`);
  await pool.end();
}
