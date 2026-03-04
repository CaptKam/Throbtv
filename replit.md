# NOOG — Adult Gay Video Platform

## Overview
A premium dark-themed adult gay video tube platform with video discovery, queue management, full-screen playback, and GoonLoop lean-back experience.

## Tech Stack
- **Frontend**: React 18 + Vite, Tailwind CSS v4, Framer Motion, TanStack Query, Wouter, shadcn/ui
- **Backend**: Express.js, PostgreSQL, Drizzle ORM, bcrypt, express-session (connect-pg-simple)
- **Fonts**: Outfit (display) + Inter (body)

## Architecture
- Full-stack: `npm run dev` runs Express + Vite dev server on port 5000
- Database: PostgreSQL via `DATABASE_URL` env var
- Auth: email/password with bcrypt hashing, session-based (connect-pg-simple)
- Seed: 100 real affiliate videos from fap.cash (gay orientation), cached in `attached_assets/fapcash_gay_feed.txt`
- Affiliate: fap.cash feed with affiliate ID `qAZ`, campaign `Test`, pipe-delimited CSV format

## Affiliate Feed Format
- URL: `https://fap.cash/content/dump?...` (max 25 per request)
- Delimiter: `|` (pipe)
- Columns: `#ID|#EMBED|#URL|#URL_THUMB|#TITLE|#DESCRIPTION|#CATEGORIES|#PORNSTARS|#STUDIO|#DURATION|#DURATION_EMBED|#DATE|#LIKES|#TRAILER|#MAX_RESOLUTION|#ORIENTATION|#TITLE_TRANSLATIONS`
- Thumbnails: semicolon-separated list of image URLs
- Embed: iframe HTML with `fh.video/embed/{videoId}` src
- Source URLs: `fhgte.com/videos/{videoId}` with UTM tracking params
- Trailer: MP4 preview URL at `thumb-ah.flixcdn.com`

## Database Schema (shared/schema.ts)
- `users` — id (varchar UUID), email, passwordHash
- `videos` — id, sourceUrl, embedUrl, videoIdOnSource, sourceDomain, title, duration, durationSeconds, tags[], category, thumbnailUrl, views
- `playlists` — id, userId, name
- `playlistItems` — id, playlistId, videoId, position
- `likes` — id, userId, videoId
- `watchHistory` — id, userId, videoId, watchedAt

## Key Files
- `client/src/pages/Landing.tsx` — Landing with auth (login/register)
- `client/src/pages/Discover.tsx` — Video grid + transport bar + queue panel
- `client/src/hooks/use-auth.ts` — Auth hook (login/register/logout/me)
- `server/routes.ts` — API routes (auth, videos, playlists, likes, history)
- `server/storage.ts` — Drizzle-based storage implementation
- `server/seed.ts` — Parses fap.cash CSV feed and seeds DB (100 real gay videos)
- `server/import-feed.ts` — Standalone feed import module
- `shared/schema.ts` — Drizzle schema + Zod types

## Design Tokens
- Primary: deep purple `hsl(270 76% 53%)`
- Background: near-black
- Color vars use raw `H S% L%` format in CSS variables (Tailwind v4)

## Video Categories (from feed)
Amateur, Twink, Black, Man, Masturbation, Big Cock, Asian, Beach, Gay Porn, Bareback, Mature, Latino, 3D, and more

## API Routes
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user
- `GET /api/videos?search=&category=&limit=&offset=` — List videos
- `GET /api/videos/:id` — Single video
- `POST /api/videos` — Create video (auth required)
- Playlists, likes, watch history endpoints also available
