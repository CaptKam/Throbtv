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
- `client/src/pages/Theater.tsx` — TV screen: QR pairing, iframe player, auto-advance timer, Quick Fade overlay
- `client/src/pages/Remote.tsx` — Phone remote: browse grid, search, queue management, transport controls (synced via WebSocket)
- `client/src/hooks/use-auth.ts` — Auth hook (login/register/logout/me)
- `client/src/hooks/use-socket.ts` — WebSocket hook for TV/phone state sync (connection, pairing, queue, playback)
- `server/socket.ts` — Socket.IO server: NOOG-XXXX session codes, room pairing, relays player/queue events. Server is authoritative for player state (next/prev/jump/skip update session state). Uses `io.to()` broadcast for all player commands so sender stays in sync.
- `server/routes.ts` — API routes (auth, videos, playlists, likes, history)
- `server/storage.ts` — Drizzle-based storage implementation
- `server/seed.ts` — Parses fap.cash CSV feed and seeds DB (100 real gay videos)
- `server/import-feed.ts` — Standalone feed import module
- `shared/schema.ts` — Drizzle schema + Zod types

## WebSocket Architecture
- Session codes: `NOOG-XXXX` (alphanumeric), stored in-memory Map with 12h expiry
- Theater creates session → displays QR encoding `/remote/{code}` → phone scans and joins
- Player commands (`play`, `pause`, `next`, `prev`, `jump`, `skip-now`, `adjust-timer`) broadcast to all room members via `io.to(code).emit()` — sender receives its own events for consistent state
- `player:state` uses `socket.to()` (excludes sender) since TV sends timer ticks the phone needs but doesn't need echoed back
- Queue operations (`add`, `remove`, `reorder`, `clear`) update server state and broadcast to all
- Disconnect handling: phone sets `isPaired=false` on TV disconnect; Theater resets `sessionCreated` on connection loss for auto-recovery

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
