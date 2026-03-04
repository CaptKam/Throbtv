import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { videos } from "../shared/schema";
import { sql } from "drizzle-orm";
import * as fs from "fs";

interface FeedVideo {
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
  orientation: string;
}

function extractEmbedUrl(embedHtml: string): string {
  const match = embedHtml.match(/src="([^"]+)"/);
  return match ? match[1] : "";
}

function parseFeedCsv(rawText: string): FeedVideo[] {
  const lines = rawText.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const results: FeedVideo[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.match(/^\d+\|/)) continue;

    const parts = line.split("|");
    if (parts.length < 16) continue;

    const thumbsRaw = parts[3] || "";
    const thumbnails = thumbsRaw.split(";").filter(Boolean);

    results.push({
      feedId: parts[0],
      embedHtml: parts[1],
      sourceUrl: parts[2],
      thumbnails,
      title: parts[4] || "Untitled",
      description: parts[5] || "",
      categories: (parts[6] || "").split(";").filter(Boolean),
      pornstars: parts[7] || "",
      studio: parts[8] || "",
      duration: parseInt(parts[9]) || 0,
      embedDuration: parseInt(parts[10]) || 0,
      date: parts[11] || "",
      likes: parseInt(parts[12]) || 0,
      trailerUrl: parts[13] || "",
      resolution: parts[14] || "",
      orientation: parts[15] || "",
    });
  }

  return results;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function extractVideoId(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

export async function importFeedFromFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const feedVideos = parseFeedCsv(raw);
  console.log(`Parsed ${feedVideos.length} videos from feed`);

  if (feedVideos.length === 0) {
    console.log("No videos to import");
    return;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  await db.delete(videos);
  console.log("Cleared existing videos");

  const rows = feedVideos.map((v) => {
    const embedUrl = extractEmbedUrl(v.embedHtml);
    const videoId = extractVideoId(v.sourceUrl);
    const domain = extractDomain(v.sourceUrl);

    return {
      sourceUrl: v.sourceUrl,
      embedUrl,
      videoIdOnSource: videoId || v.feedId,
      sourceDomain: domain,
      title: v.title,
      duration: formatDuration(v.duration),
      durationSeconds: v.duration,
      tags: v.categories.length > 0 ? v.categories : ["Gay"],
      category: v.categories[0] || "Gay",
      thumbnailUrl: v.thumbnails[0] || "",
      views: v.likes * 100 + Math.floor(Math.random() * 5000),
    };
  });

  await db.insert(videos).values(rows);
  console.log(`Imported ${rows.length} real affiliate videos`);
  await pool.end();
}

export async function importFeedFromUrl(feedUrl: string) {
  console.log("Fetching feed from:", feedUrl.substring(0, 80) + "...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NOOG/1.0)" },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Feed returned ${res.status}`);
    const text = await res.text();

    const tmpPath = "/tmp/fapcash_import.txt";
    fs.writeFileSync(tmpPath, text);
    await importFeedFromFile(tmpPath);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
