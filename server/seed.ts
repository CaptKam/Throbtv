import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { videos } from "../shared/schema";
import { sql } from "drizzle-orm";

const SOURCES = ["FapHouse", "BoyfriendTV", "Faptor", "GayHaus", "OnlyGayVideo", "XHamster"];
const CATEGORIES = ["Trending", "New", "Muscular", "Amateur", "Studio", "Solo", "Collabs", "Verified"];
const TAGS = ["muscle", "solo", "amateur", "jock", "outdoor", "gym", "studio", "twink", "bear", "hunk", "daddy", "college", "massage", "casting", "compilation"];

const TITLES = [
  "Intense Gym Session with Personal Trainer",
  "Beach House Weekend Highlights",
  "Late Night Casting Call",
  "Morning Stretch Routine",
  "Pool Party After Hours",
  "Locker Room Confidential",
  "Campus Dorm Room Encounter",
  "Downtown Studio Shoot",
  "Mountain Cabin Getaway",
  "Private Sauna Session",
  "Rooftop Sunset Workout",
  "Warehouse Photoshoot BTS",
  "Hotel Suite Surprise",
  "Boxing Gym Sparring",
  "Lake House Summer",
  "Barber Shop After Close",
  "Yoga Retreat Day 3",
  "Road Trip Pit Stop",
  "Backstage at the Club",
  "Firehouse Calendar Shoot",
  "Surf Instructor Lesson",
  "Ranch Hand Duties",
  "Auto Shop After Hours",
  "Penthouse City Views",
  "Construction Site Break",
  "Outdoor Shower Scene",
  "Massage Therapy Session",
  "Lifeguard Off Duty",
  "Office After Everyone Left",
  "Midnight Swim",
  "Personal Training Client",
  "Roommate Situation",
  "First Day at the Gym",
  "Camping Trip Highlights",
  "Studio Apartment Scene",
  "Delivery Driver Stops By",
  "Moving Day Help",
  "Neighbor Comes Over",
  "Weekend at the Lake",
  "Late Night Study Session",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTags(): string[] {
  const count = Math.floor(Math.random() * 3) + 2;
  const shuffled = [...TAGS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomDuration(): { duration: string; durationSeconds: number } {
  const mins = Math.floor(Math.random() * 25) + 5;
  const secs = Math.floor(Math.random() * 60);
  return {
    duration: `${mins}:${String(secs).padStart(2, "0")}`,
    durationSeconds: mins * 60 + secs,
  };
}

export async function seedVideos() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const existing = await db.select({ count: sql<number>`count(*)` }).from(videos);
  if (Number(existing[0].count) > 0) {
    console.log(`Database already has ${existing[0].count} videos, skipping seed.`);
    await pool.end();
    return;
  }

  const rows = [];
  for (let i = 0; i < 200; i++) {
    const source = randomFrom(SOURCES);
    const { duration, durationSeconds } = randomDuration();
    const title = randomFrom(TITLES);
    const videoId = String(100000 + i);

    rows.push({
      sourceUrl: `https://${source.toLowerCase().replace(/\s/g, "")}.com/videos/${videoId}`,
      embedUrl: `https://${source.toLowerCase().replace(/\s/g, "")}.com/embed/${videoId}?autoplay=1&mute=1`,
      videoIdOnSource: videoId,
      sourceDomain: `${source.toLowerCase().replace(/\s/g, "")}.com`,
      title: `${title} - ${source}`,
      duration,
      durationSeconds,
      tags: randomTags(),
      category: randomFrom(CATEGORIES),
      thumbnailUrl: `https://picsum.photos/seed/${videoId}/640/360`,
      views: Math.floor(Math.random() * 50000) + 500,
    });
  }

  await db.insert(videos).values(rows);
  console.log(`Seeded ${rows.length} videos`);
  await pool.end();
}
