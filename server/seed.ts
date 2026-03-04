import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { videos } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const FEED_FILE = path.resolve(process.cwd(), "attached_assets/fapcash_gay_feed.txt");
const FEED_URL = "https://fap.cash/content/dump?camp=Test%20&ai=qAZ&forient=gay&fcats=!&fres=all&fperiod=all&furls=c1&fthumbs=ssmall&ftcnt=25&ford=dt&fembed=code&fdelim=%7C&fformat=csv&fowner=all&ftsize=small&emb=on&vid=on&url=on&thumb=on&title=on&titles=on&desc=on&cats=on&pstarts=on&sname=on&orient=on&dur=on&embdur=on&dt=on&likes=on&trailer=on&res=on";

function extractEmbedUrl(embedHtml: string): string {
  const match = embedHtml.match(/src="([^"]+)"/);
  return match ? match[1] : "";
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

interface FeedRow {
  feedId: string;
  embedHtml: string;
  sourceUrl: string;
  thumbnails: string[];
  title: string;
  description: string;
  categories: string[];
  pornstars: string;
  studio: string;
  duration: number;
  embedDuration: number;
  date: string;
  likes: number;
  trailerUrl: string;
  resolution: string;
}

function parseFeed(raw: string): FeedRow[] {
  const lines = raw.split("\n").filter(l => l.trim());
  const results: FeedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.match(/^\d+\|/)) continue;
    const p = line.split("|");
    if (p.length < 16) continue;
    results.push({
      feedId: p[0],
      embedHtml: p[1],
      sourceUrl: p[2],
      thumbnails: (p[3] || "").split(";").filter(Boolean),
      title: p[4] || "Untitled",
      description: p[5] || "",
      categories: (p[6] || "").split(";").filter(Boolean),
      pornstars: p[7] || "",
      studio: p[8] || "",
      duration: parseInt(p[9]) || 0,
      embedDuration: parseInt(p[10]) || 0,
      date: p[11] || "",
      likes: parseInt(p[12]) || 0,
      trailerUrl: p[13] || "",
      resolution: p[14] || "",
    });
  }
  return results;
}

export async function seedVideos() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const existing = await db.select({ count: sql<number>`count(*)` }).from(videos);
  const count = Number(existing[0].count);

  let raw: string | null = null;

  if (fs.existsSync(FEED_FILE)) {
    raw = fs.readFileSync(FEED_FILE, "utf-8");
    console.log(`Found cached feed file (${raw.length} bytes)`);
  }

  if (!raw || raw.length < 100) {
    if (count > 0) {
      console.log(`Database has ${count} videos, no feed file found, skipping seed.`);
      await pool.end();
      return;
    }
    console.log("No feed file found and DB empty. Attempting live fetch...");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      const res = await fetch(FEED_URL, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NOOG/1.0)" },
      });
      clearTimeout(timeout);
      if (res.ok) {
        raw = await res.text();
        fs.mkdirSync(path.dirname(FEED_FILE), { recursive: true });
        fs.writeFileSync(FEED_FILE, raw);
        console.log(`Fetched and cached feed (${raw.length} bytes)`);
      }
    } catch (err) {
      console.log("Feed fetch failed, skipping seed:", err);
      await pool.end();
      return;
    }
  }

  if (!raw) {
    await pool.end();
    return;
  }

  const feedVideos = parseFeed(raw);
  console.log(`Parsed ${feedVideos.length} videos from affiliate feed`);

  if (feedVideos.length === 0) {
    console.log("No valid rows parsed from feed, skipping.");
    await pool.end();
    return;
  }

  if (count > 0) {
    await db.delete(videos);
    console.log("Cleared old mock videos");
  }

  const rows = feedVideos.map((v) => ({
    sourceUrl: v.sourceUrl,
    embedUrl: extractEmbedUrl(v.embedHtml),
    videoIdOnSource: extractVideoId(v.sourceUrl) || v.feedId,
    sourceDomain: extractDomain(v.sourceUrl),
    title: v.title,
    duration: formatDuration(v.duration),
    durationSeconds: v.duration,
    tags: v.categories.length > 0 ? v.categories : ["Gay"],
    category: v.categories[0] || "Gay",
    thumbnailUrl: v.thumbnails[0] || "",
    views: v.likes * 100 + Math.floor(Math.random() * 5000),
  }));

  await db.insert(videos).values(rows);
  console.log(`Seeded ${rows.length} real affiliate videos from fap.cash`);
  await pool.end();
}
