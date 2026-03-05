import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Reorder } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Search,
  ChevronUp, ChevronDown, ChevronRight, X, List,
  Trash2, ListMusic, Tv, Cast, LogOut, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import type { Video } from "@shared/schema";
import "./discover.css";

const CATEGORIES = [
  "All", "Amateur", "Twink", "Muscle", "Solo", "Bareback",
  "Latino", "Black", "Asian", "Bear", "Daddy", "Big Cock",
  "Mature", "3D"
];

// Debounce hook — prevents firing API call on every keystroke
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const formatViews = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.floor(n / 1000)}K`;
  return String(n);
};

const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// Memoized video card — only re-renders when its specific video changes
const VideoCard = memo(function VideoCard({
  video,
  onPlay,
  onPlayNext,
  onAddToQueue,
}: {
  video: Video;
  onPlay: (v: Video) => void;
  onPlayNext: (v: Video) => void;
  onAddToQueue: (v: Video) => void;
}) {
  return (
    <div className="throb-card" onClick={() => onPlay(video)}>
      <div className="throb-thumb"
        onMouseEnter={(e) => {
          const vid = e.currentTarget.querySelector('video');
          if (vid) { vid.style.opacity = '1'; vid.play().catch(() => {}); }
        }}
        onMouseLeave={(e) => {
          const vid = e.currentTarget.querySelector('video');
          if (vid) { vid.style.opacity = '0'; vid.pause(); vid.currentTime = 0; }
        }}
      >
        <img
          src={video.thumbnailUrl || ""}
          alt={video.title}
          loading="lazy"
          decoding="async"
        />
        {video.trailerUrl && (
          <video
            src={video.trailerUrl}
            className="throb-trailer-preview"
            muted loop playsInline preload="none"
            style={{ opacity: 0 }}
          />
        )}
        <span className="throb-dur">{video.duration}</span>
        <span className="throb-src">{video.sourceDomain?.replace(".com", "")}</span>
        <div className="throb-thumb-hover">
          <Play size={24} fill="white" />
        </div>
        <div className="throb-play-overlay"><Play size={24} fill="currentColor" /></div>
      </div>
      <div className="throb-card-title">{video.title}</div>
      <div className="throb-card-meta">{formatViews(video.views || 0)} views</div>
      <div className="throb-card-actions">
        <button className="throb-card-btn" onClick={(e) => { e.stopPropagation(); onAddToQueue(video); }}>+Queue</button>
      </div>
    </div>
  );
});

// Memoized peek card
const PeekCard = memo(function PeekCard({
  video,
  onPlay,
  onAddToQueue,
}: {
  video: Video;
  onPlay: (v: Video) => void;
  onAddToQueue: (v: Video) => void;
}) {
  return (
    <div className="throb-pk-card" onClick={() => onPlay(video)}>
      <div className="throb-pk-thumb"
        onMouseEnter={(e) => {
          const vid = e.currentTarget.querySelector('video');
          if (vid) { vid.style.opacity = '1'; vid.play().catch(() => {}); }
        }}
        onMouseLeave={(e) => {
          const vid = e.currentTarget.querySelector('video');
          if (vid) { vid.style.opacity = '0'; vid.pause(); vid.currentTime = 0; }
        }}
      >
        <img src={video.thumbnailUrl || ""} alt={video.title} loading="lazy" decoding="async" />
        {video.trailerUrl && video.trailerUrl.startsWith("http") && (
          <video
            src={video.trailerUrl}
            className="throb-trailer-preview"
            muted loop playsInline preload="none"
            style={{ opacity: 0 }}
          />
        )}
        <span className="throb-dur">{video.duration}</span>
        <span className="throb-src">{video.sourceDomain?.replace(".com", "")}</span>
        <div className="throb-play-overlay"><Play size={24} fill="currentColor" /></div>
      </div>
      <div className="throb-pk-title">{video.title}</div>
      <div className="throb-pk-actions">
        <button className="throb-pk-btn" onClick={(e) => { e.stopPropagation(); onPlay(video); }}>
          <Play size={10} fill="currentColor" style={{ marginLeft: 1 }} /> Play
        </button>
        <button className="throb-pk-btn" onClick={(e) => { e.stopPropagation(); onAddToQueue(video); }}>
          + Queue
        </button>
      </div>
    </div>
  );
});

export default function Discover() {
  // UI state
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [railOpen, setRailOpen] = useState(true);
  const [activeCat, setActiveCat] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);

  // Debounce search by 350ms to avoid hammering API on every keystroke
  const searchQuery = useDebouncedValue(searchInput, 350);

  // Player state — local for Discover (not socket-synced for solo browsing)
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Video[]>([]);
  const [history, setHistory] = useState<Video[]>([]);

  // Socket — for syncing with Theater/Remote when connected
  const socket = useSocket();

  const { toast } = useToast();
  const { logout } = useAuth();
  const peekRowRef = useRef<HTMLDivElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mouseIdle, setMouseIdle] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStageRef = useRef<1 | 2 | 3>(1);
  const savedRailRef = useRef(true);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  // Mouse idle detection — dim UI after 3s, hide after 15s
  useEffect(() => {
    const resetIdle = () => {
      setMouseIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      idleTimerRef.current = setTimeout(() => setMouseIdle(true), 3000);
      hideTimerRef.current = setTimeout(() => {
        setUiHidden(true);
        setStage(prev => { savedStageRef.current = prev; return 1; });
        setRailOpen(prev => { savedRailRef.current = prev; return false; });
      }, 15000);
      setUiHidden(prev => {
        if (prev) {
          setStage(savedStageRef.current);
          setRailOpen(savedRailRef.current);
        }
        return false;
      });
    };
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("mousedown", resetIdle);
    window.addEventListener("touchstart", resetIdle);
    idleTimerRef.current = setTimeout(() => setMouseIdle(true), 3000);
    hideTimerRef.current = setTimeout(() => setUiHidden(true), 15000);
    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("mousedown", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Fetch videos — uses debounced search value
  const { data, isLoading } = useQuery({
    queryKey: ["videos", searchQuery, activeCat, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "48");
      params.set("offset", String(page * 48));
      if (searchQuery) params.set("search", searchQuery);
      if (activeCat !== "All") params.set("category", activeCat);
      const res = await fetch(`/api/videos?${params}`);
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json() as Promise<{ videos: Video[]; total: number }>;
    },
    staleTime: 30000,
  });

  const videos = data?.videos ?? [];
  const totalVideos = data?.total ?? 0;

  // Auto-play first video
  useEffect(() => {
    if (!currentVideo && videos.length > 0) {
      setCurrentVideo(videos[0]);
      setIsPlaying(true);
    }
  }, [videos, currentVideo]);

  // Queue functions
  const playNow = useCallback((video: Video) => {
    setCurrentVideo(prev => {
      if (prev) setHistory(h => [prev, ...h]);
      return video;
    });
    setIsPlaying(true);
    setElapsedSeconds(0);
    setVideoProgress(0);
    setStage(1);
    // Also sync to socket if connected to a session
    if (socket.sessionCode) {
      socket.addToQueue(video, "next");
    }
  }, [socket]);

  const playNext = useCallback((video: Video) => {
    setQueue(q => {
      const newQ = [video, ...q];
      return newQ;
    });
    if (socket.sessionCode) {
      socket.addToQueue(video, "next");
    }
    toast({ title: "Playing Next", description: `"${video.title}" queued up next` });
  }, [socket, toast]);

  const addToQueue = useCallback((video: Video) => {
    setQueue(q => [...q, video]);
    if (socket.sessionCode) {
      socket.addToQueue(video, "end");
    }
    toast({ title: "Added to Queue", description: `"${video.title}" added` });
  }, [socket, toast]);

  const removeFromQueue = useCallback((idx: number) => {
    setQueue(q => q.filter((_, i) => i !== idx));
  }, []);

  const skipNext = useCallback(() => {
    setQueue(prevQueue => {
      if (prevQueue.length > 0) {
        const nextVideo = prevQueue[0];
        const remaining = prevQueue.slice(1);
        setTimeout(() => {
          setCurrentVideo(prev => {
            if (prev) setHistory(h => [prev, ...h]);
            return nextVideo;
          });
          setIsPlaying(true);
          setElapsedSeconds(0);
          setVideoProgress(0);
        }, 0);
        return remaining;
      }
      return prevQueue;
    });
  }, []);

  const skipPrev = useCallback(() => {
    setHistory(prevHistory => {
      if (prevHistory.length > 0) {
        const prevVideo = prevHistory[0];
        const remaining = prevHistory.slice(1);
        setTimeout(() => {
          setCurrentVideo(prev => {
            if (prev) setQueue(q => [prev, ...q]);
            return prevVideo;
          });
          setIsPlaying(true);
          setElapsedSeconds(0);
          setVideoProgress(0);
        }, 0);
        return remaining;
      }
      // No history — restart current video
      setTimeout(() => {
        setElapsedSeconds(0);
        setVideoProgress(0);
      }, 0);
      return prevHistory;
    });
  }, []);

  // Keep refs to skip functions so handlers don't have stale closures
  const skipNextRef = useRef(skipNext);
  useEffect(() => { skipNextRef.current = skipNext; }, [skipNext]);
  const skipPrevRef = useRef(skipPrev);
  useEffect(() => { skipPrevRef.current = skipPrev; }, [skipPrev]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") {
        setStage(s => s === 3 ? 2 : s === 2 ? 1 : s);
      }
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === "ArrowRight") skipNextRef.current();
      if (e.key === "ArrowLeft") skipPrevRef.current();
      if (e.key === "b" || e.key === "B") setStage(s => s >= 3 ? 1 : (s + 1) as 1 | 2 | 3);
      if (e.key === "q" || e.key === "Q") setRailOpen(r => !r);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const cycleStage = () => setStage(s => (s >= 3 ? 1 : s + 1) as 1 | 2 | 3);

  // Swipe up/down to cycle stages on mobile
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dy = touchStartRef.current.y - e.changedTouches[0].clientY;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;
    if (dt > 500 || Math.abs(dy) < 50) return;
    if (dy > 0) {
      setStage(s => (s >= 3 ? 3 : (s + 1) as 1 | 2 | 3));
    } else {
      setStage(s => (s <= 1 ? 1 : (s - 1) as 1 | 2 | 3));
    }
  }, []);

  // Timer-based progress for iframe embeds using durationSeconds
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset progress when video changes
    setVideoProgress(0);
    setElapsedSeconds(0);

    if (!currentVideo?.embedUrl || !currentVideo?.durationSeconds || !isPlaying) {
      return;
    }

    const totalSec = currentVideo.durationSeconds + 15; // 15 sec buffer

    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        const progress = Math.min((next / totalSec) * 100, 100);
        setVideoProgress(progress);

        if (next >= totalSec) {
          // Auto-advance to next in queue
          skipNextRef.current();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentVideo?.id, isPlaying]);

  // On mobile Stage 1, show video layer as interactive (not behind pointer-events-none content)
  // Desktop: pointer-events-none on content lets clicks pass through to iframe
  // Mobile: content layer gets pointer-events back, video layer tap triggers play
  const contentPointerClass = stage === 1 && !isMobile ? ' pointer-events-none' : '';

  return (
    <div
      className={`throb-app ${mouseIdle ? "mouse-idle" : ""} ${uiHidden ? "ui-hidden" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ======= VIDEO LAYER ======= */}
      <div
        className={`throb-video-layer ${stage === 2 ? "dim-1" : stage === 3 ? "dim-2" : ""}`}
        onClick={isMobile && stage === 1 ? () => setIsPlaying(p => !p) : undefined}
      >
        {currentVideo ? (
          currentVideo.embedUrl && isPlaying ? (
            <iframe
              key={`${currentVideo.id}-${elapsedSeconds === 0 ? 'fresh' : 'playing'}`}
              src={`${currentVideo.embedUrl}${currentVideo.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
              className="throb-video-el"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              referrerPolicy="origin"
              style={{ border: 0 }}
            />
          ) : (
            <div className="throb-video-fallback">
              <img src={currentVideo.thumbnailUrl || ""} alt="" />
              {currentVideo.embedUrl && !isPlaying && (
                <div className="throb-paused-overlay" onClick={() => { setElapsedSeconds(0); setIsPlaying(true); }}>
                  <Play size={64} fill="currentColor" />
                  <span className="throb-paused-hint">Tap to play</span>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="throb-video-empty">
            <div className="throb-watermark">throb</div>
          </div>
        )}

        {/* Video info overlay */}
        {currentVideo && stage === 1 && (
          <div className="throb-vid-info">
            <div className="throb-vid-title">{currentVideo.title}</div>
            <div className="throb-vid-sub">
              {currentVideo.sourceDomain} · {currentVideo.duration}
              {currentVideo.sourceUrl && (
                <a
                  href={currentVideo.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="throb-full-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Watch Full <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======= CONTENT AREA ======= */}
      <div className={`throb-content${contentPointerClass}`}>
        {/* Top bar */}
        <div className="throb-topbar">
          <button className="throb-topbar-btn" onClick={() => logout.mutate()} title="Logout">
            <LogOut size={16} />
          </button>
        </div>

        {/* ======= STAGE 3: FULL BROWSE ======= */}
        <div className={`throb-full ${stage !== 3 ? "hidden" : ""}`}>
          <div className="throb-full-top">
            <div className="throb-search-wrap">
              <Search size={14} className="throb-search-icon" />
              <input
                className="throb-search"
                placeholder="Search thousands of videos..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
              />
            </div>
            <button className="throb-close-btn" onClick={() => setStage(2)}>
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="throb-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`throb-cat ${c === activeCat ? "on" : ""}`}
                onClick={() => { setActiveCat(c); setPage(0); }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="throb-full-scroll">
            {isLoading ? (
              <div className="throb-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="throb-skeleton">
                    <div className="throb-skeleton-thumb" />
                    <div className="throb-skeleton-line w75" />
                    <div className="throb-skeleton-line w50" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="throb-grid">
                  {videos.map((v) => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      onPlay={playNow}
                      onPlayNext={playNext}
                      onAddToQueue={addToQueue}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalVideos > 48 && (
                  <div className="throb-pagination">
                    <button
                      className="throb-page-btn"
                      disabled={page === 0}
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="throb-page-info">
                      Page {page + 1} of {Math.ceil(totalVideos / 48)}
                    </span>
                    <button
                      className="throb-page-btn"
                      disabled={(page + 1) * 48 >= totalVideos}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ======= SHELF TAB + PEEK SHELF ======= */}
        <div className="throb-peek-wrapper">
          <div className="throb-shelf-tab" onClick={cycleStage}>
            <div className={`throb-shelf-icon ${stage > 1 ? "flipped" : ""}`}>
              <ChevronUp size={14} />
            </div>
            <span className="throb-shelf-text">
              {stage === 1 ? "Browse" : stage === 2 ? "More" : "Close"}
            </span>
            <div className="throb-shelf-line" />
          </div>
          <div
            className={`throb-peek ${stage < 2 ? "hidden" : ""}`}
            style={{ display: stage === 3 ? "none" : undefined }}
          >
          <div className="throb-peek-top">
            <div className="throb-search-wrap">
              <Search size={12} className="throb-search-icon" />
              <input
                className="throb-search sm"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(0); }}
              />
            </div>
          </div>
          <div className="throb-cats sm">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`throb-cat ${c === activeCat ? "on" : ""}`}
                onClick={() => { setActiveCat(c); setPage(0); }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="throb-peek-row" ref={peekRowRef}>
            {videos.slice(0, 20).map((v) => (
              <PeekCard
                key={v.id}
                video={v}
                onPlay={playNow}
                onAddToQueue={addToQueue}
              />
            ))}
          </div>
        </div>
        </div>

        {/* ======= TRANSPORT BAR ======= */}
        <div className="throb-transport">
          <div className="throb-progress">
            <div className="throb-progress-fill" style={{ width: `${videoProgress}%` }} />
          </div>
          <div className="throb-transport-inner">
            <div className="throb-transport-left">
              <div className="throb-now-thumb">
                {currentVideo?.thumbnailUrl && (
                  <img src={currentVideo.thumbnailUrl} alt="" />
                )}
              </div>
              <div className="throb-now-info">
                <div className="throb-now-title">{currentVideo?.title || "No video selected"}</div>
                <div className="throb-now-sub">
                  {currentVideo
                    ? currentVideo.embedUrl && currentVideo.durationSeconds
                      ? `${formatTime(elapsedSeconds)} / ${formatTime(currentVideo.durationSeconds)} · Use player controls`
                      : `${currentVideo.duration || "—"} · ${currentVideo.sourceDomain || ""}`
                    : "Browse to find videos"}
                </div>
              </div>
            </div>
            <div className="throb-transport-center">
              <button className="throb-t-btn ghost" onClick={skipPrev}>
                <SkipBack size={16} fill="currentColor" />
              </button>
              <button
                className="throb-t-btn primary"
                onClick={() => setIsPlaying(!isPlaying)}
                title={currentVideo?.embedUrl ? (isPlaying ? "Pause timer (video plays independently)" : "Resume timer") : undefined}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />}
              </button>
              <button className="throb-t-btn ghost" onClick={skipNext}>
                <SkipForward size={16} fill="currentColor" />
              </button>
            </div>
            <div className="throb-transport-right">
              <button className="throb-t-btn cast" onClick={() => window.open("/theater", "_blank")} title="Theater Mode">
                <Cast size={16} />
              </button>
              {queue.length > 0 && (
                <button
                  className="throb-mobile-queue-btn"
                  onClick={() => setMobileQueueOpen(!mobileQueueOpen)}
                >
                  <List size={16} />
                  <span className="throb-mobile-queue-count">{queue.length}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ======= MOBILE QUEUE SHEET ======= */}
        <div className={`throb-mobile-queue ${mobileQueueOpen ? "open" : ""}`}>
          <div className="throb-mobile-queue-head">
            <span className="throb-mobile-queue-title">Queue ({queue.length})</span>
            <button className="throb-close-btn" onClick={() => setMobileQueueOpen(false)}
              style={{ width: 32, height: 32 }}>
              <X size={14} />
            </button>
          </div>
          <div className="throb-mobile-queue-list">
            {queue.length === 0 ? (
              <div className="throb-rail-empty">
                <List size={28} />
                <p>Queue is empty</p>
                <span>Tap +Queue on any video to add it</span>
              </div>
            ) : (
              queue.map((v, i) => (
                <div key={v.id + "-mq-" + i} className="throb-rq" onClick={() => { playNow(v); setMobileQueueOpen(false); }}>
                  <span className="throb-rq-n">{i + 1}</span>
                  <div className="throb-rq-thumb">
                    <img src={v.thumbnailUrl || ""} alt={v.title} />
                    <span className="throb-rq-dur">{v.duration}</span>
                  </div>
                  <div className="throb-rq-info">
                    <div className="throb-rq-title">{v.title}</div>
                    <div className="throb-rq-sub">{v.sourceDomain}</div>
                  </div>
                  <button className="throb-rq-remove" style={{ opacity: 1 }} onClick={(e) => {
                    e.stopPropagation();
                    setQueue(q => q.filter((_, idx) => idx !== i));
                  }}>
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ======= QUEUE RAIL ======= */}
      <div className={`throb-rail ${!railOpen ? "shut" : ""}`}>
        <div className="throb-rail-tab" onClick={() => setRailOpen(!railOpen)}>
          <div className={`throb-rail-chevron ${railOpen ? "" : "flip"}`}>
            <ChevronRight size={12} />
          </div>
          <div className="throb-rail-count">{queue.length}</div>
          <span className="throb-rail-tab-text">Queue</span>
        </div>

        <div className="throb-rail-head">
          <span className="throb-rail-title">Queue</span>
          <span className="throb-rail-badge">{queue.length} videos</span>
        </div>

        {/* Now Playing */}
        {currentVideo && (
          <div className="throb-rail-now">
            <div className="throb-rail-now-label">Now Playing</div>
            <div className="throb-rail-now-card">
              <div className="throb-rail-now-thumb">
                {currentVideo.thumbnailUrl && <img src={currentVideo.thumbnailUrl} alt="" />}
              </div>
              <div className="throb-rail-now-info">
                <div className="throb-rail-now-title">{currentVideo.title}</div>
                <div className="throb-rail-now-time">{currentVideo.duration}</div>
              </div>
            </div>
          </div>
        )}

        <div className="throb-rail-divider">
          <span>Up Next</span>
          {queue.length > 0 && (
            <button className="throb-rail-clear" onClick={() => setQueue([])}>Clear</button>
          )}
        </div>

        <div className="throb-rail-list">
          {queue.length === 0 ? (
            <div className="throb-rail-empty">
              <ListMusic size={24} style={{ opacity: 0.2 }} />
              <p>Queue is empty</p>
              <span>Browse to add videos</span>
            </div>
          ) : (
            <Reorder.Group axis="y" values={queue} onReorder={setQueue} className="throb-rail-reorder">
              {queue.map((v, i) => (
                <Reorder.Item
                  key={v.id}
                  value={v}
                  className="throb-rq"
                >
                  <span className="throb-rq-n">{i + 1}</span>
                  <div className="throb-rq-thumb">
                    {v.thumbnailUrl && <img src={v.thumbnailUrl} alt="" />}
                    <span className="throb-rq-dur">{v.duration}</span>
                  </div>
                  <div className="throb-rq-info">
                    <div className="throb-rq-title">{v.title}</div>
                    <div className="throb-rq-sub">{formatViews(v.views || 0)} views</div>
                  </div>
                  <button className="throb-rq-remove" onClick={() => removeFromQueue(i)}>
                    <X size={12} />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      </div>
    </div>
  );
}
