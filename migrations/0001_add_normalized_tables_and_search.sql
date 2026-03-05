-- Migration: Add normalized tags/performers/studios + full-text search
-- Run with: psql $DATABASE_URL -f migrations/0001_add_normalized_tables_and_search.sql

-- =============================================
-- 1. New columns on videos table
-- =============================================
ALTER TABLE videos ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS orientation text DEFAULT 'straight';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS quality text DEFAULT 'HD';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS rating integer DEFAULT 0;

-- =============================================
-- 2. Normalized tags
-- =============================================
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS video_tags (
  video_id VARCHAR(64) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);
CREATE INDEX IF NOT EXISTS video_tags_tag_idx ON video_tags(tag_id);

-- =============================================
-- 3. Performers
-- =============================================
CREATE TABLE IF NOT EXISTS performers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS video_performers (
  video_id VARCHAR(64) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  performer_id INTEGER NOT NULL REFERENCES performers(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, performer_id)
);
CREATE INDEX IF NOT EXISTS video_performers_performer_idx ON video_performers(performer_id);

-- =============================================
-- 4. Studios
-- =============================================
CREATE TABLE IF NOT EXISTS studios (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS video_studios (
  video_id VARCHAR(64) NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, studio_id)
);
CREATE INDEX IF NOT EXISTS video_studios_studio_idx ON video_studios(studio_id);

-- =============================================
-- 5. Full-text search GIN index on title + description
-- =============================================
CREATE INDEX IF NOT EXISTS idx_videos_fts
  ON videos USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- =============================================
-- 6. Additional performance indexes
-- =============================================
CREATE INDEX IF NOT EXISTS videos_orientation_idx ON videos(orientation);
CREATE INDEX IF NOT EXISTS videos_views_idx ON videos(views DESC);
CREATE INDEX IF NOT EXISTS videos_duration_idx ON videos(duration_seconds);

-- =============================================
-- 7. Migrate existing text[] tags to normalized tags table
-- (Run once, idempotent — skips videos already migrated)
-- =============================================
INSERT INTO tags (name, slug)
SELECT DISTINCT
  unnest(tags) as name,
  lower(regexp_replace(unnest(tags), '[^a-zA-Z0-9]+', '-', 'g')) as slug
FROM videos
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT (slug) DO NOTHING;

INSERT INTO video_tags (video_id, tag_id)
SELECT v.id, t.id
FROM videos v,
     unnest(v.tags) as tag_name
JOIN tags t ON t.slug = lower(regexp_replace(tag_name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE v.tags IS NOT NULL AND array_length(v.tags, 1) > 0
ON CONFLICT DO NOTHING;

-- Update tag counts
UPDATE tags SET count = (
  SELECT COUNT(*) FROM video_tags WHERE video_tags.tag_id = tags.id
);
