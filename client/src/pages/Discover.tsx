import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Search,
  ChevronUp, ChevronDown, ChevronRight, X, List,
  GripVertical, Trash2, ListMusic, Tv, Cast, LogOut, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Video } from "@shared/schema";

const CATEGORIES = [
  "All", "Amateur", "Twink", "Muscle", "Solo", "Bareback",
  "Latino", "Black", "Asian", "Bear", "Daddy", "Big Cock",
  "Mature", "3D"
];

export default function Discover() {
  // UI state
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [railOpen, setRailOpen] = useState(true);
  const [activeCat, setActiveCat] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

  // Player state
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const { toast } = useToast();
  const { logout } = useAuth();
  const peekRowRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mouseIdle, setMouseIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);

  // Mouse idle detection — dim UI after 3s of no movement
  useEffect(() => {
    const resetIdle = () => {
      setMouseIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setMouseIdle(true), 3000);
    };
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("mousedown", resetIdle);
    window.addEventListener("touchstart", resetIdle);
    // Start the timer
    idleTimerRef.current = setTimeout(() => setMouseIdle(true), 3000);
    return () => {
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("mousedown", resetIdle);
      window.removeEventListener("touchstart", resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Fetch videos
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") {
        if (stage === 3) setStage(2);
        else if (stage === 2) setStage(1);
      }
      if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.key === "ArrowRight") skipNext();
      if (e.key === "b" || e.key === "B") setStage(s => s >= 3 ? 1 : (s + 1) as 1 | 2 | 3);
      if (e.key === "q" || e.key === "Q") setRailOpen(r => !r);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stage]);

  // Auto-play first video
  useEffect(() => {
    if (!currentVideo && videos.length > 0) {
      setCurrentVideo(videos[0]);
      setIsPlaying(true);
    }
  }, [videos, currentVideo]);

  // Queue functions
  const playNow = useCallback((video: Video) => {
    setCurrentVideo(video);
    setIsPlaying(true);
    setStage(1);
  }, []);

  const playNext = useCallback((video: Video) => {
    setQueue(q => {
      const ci = q.findIndex(v => v.id === currentVideo?.id);
      const insertAt = ci >= 0 ? ci + 1 : 0;
      const newQ = [...q];
      newQ.splice(insertAt, 0, video);
      return newQ;
    });
    toast({ title: "Playing Next", description: `"${video.title}" queued up next` });
  }, [currentVideo, toast]);

  const addToQueue = useCallback((video: Video) => {
    setQueue(q => [...q, video]);
    toast({ title: "Added to Queue", description: `"${video.title}" added` });
  }, [toast]);

  const removeFromQueue = useCallback((idx: number) => {
    setQueue(q => q.filter((_, i) => i !== idx));
  }, []);

  const skipNext = useCallback(() => {
    if (queue.length > 0) {
      setCurrentVideo(queue[0]);
      setQueue(q => q.slice(1));
      setIsPlaying(true);
    }
  }, [queue]);

  const skipPrev = useCallback(() => {
    // No-op for now, could track history
  }, []);

  const cycleStage = () => setStage(s => (s >= 3 ? 1 : s + 1) as 1 | 2 | 3);

  // Video progress tracking for <video> elements (trailer fallback)
  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (vid && vid.duration > 0) {
      setVideoProgress((vid.currentTime / vid.duration) * 100);
    }
  }, []);

  // Timer-based progress for iframe embeds using durationSeconds
  useEffect(() => {
    // Clean up previous timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setVideoProgress(0);
    setElapsedSeconds(0);

    if (!currentVideo) return;

    // Only use timer for iframe embeds (embedUrl present)
    const isEmbed = !!currentVideo.embedUrl;
    const totalSec = currentVideo.durationSeconds || 0;

    if (isEmbed && totalSec > 0 && isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          setVideoProgress(Math.min((next / totalSec) * 100, 100));
          if (next >= totalSec) {
            // Auto-skip to next when video ends
            skipNext();
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentVideo?.id, isPlaying]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatViews = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.floor(n / 1000)}K`;
    return String(n);
  };

  return (
    <>
      <style>{scopedStyles}</style>
      <div className={`throb-app ${mouseIdle ? "mouse-idle" : ""}`}>
        {/* ======= VIDEO LAYER ======= */}
        <div className={`throb-video-layer ${stage === 2 ? "dim-1" : stage === 3 ? "dim-2" : ""}`}>
          {currentVideo ? (
            currentVideo.embedUrl ? (
              <iframe
                key={currentVideo.id}
                src={currentVideo.embedUrl}
                className="throb-video-el"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                referrerPolicy="origin"
                style={{ border: 0 }}
              />
            ) : (
              <div className="throb-video-fallback">
                <img src={currentVideo.thumbnailUrl || ""} alt="" />
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
        <div className={`throb-content${stage === 1 ? ' pointer-events-none' : ''}`}>
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
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
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
                      <div key={v.id} className="throb-card" onClick={() => playNow(v)}>
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
                            src={v.thumbnailUrl || ""}
                            alt={v.title}
                            loading="lazy"
                          />
                          {v.trailerUrl && (
                            <video
                              src={v.trailerUrl}
                              className="throb-trailer-preview"
                              muted loop playsInline preload="none"
                              style={{ opacity: 0 }}
                            />
                          )}
                          <span className="throb-dur">{v.duration}</span>
                          <span className="throb-src">{v.sourceDomain?.replace(".com", "")}</span>
                          <div className="throb-thumb-hover">
                            <Play size={24} fill="white" />
                          </div>
                          <div className="throb-play-overlay"><Play size={24} fill="currentColor" /></div>
                        </div>
                        <div className="throb-card-title">{v.title}</div>
                        <div className="throb-card-meta">{formatViews(v.views || 0)} views</div>
                        <div className="throb-card-actions">
                          <button className="throb-card-btn" onClick={(e) => { e.stopPropagation(); playNext(v); }}>Next</button>
                          <button className="throb-card-btn" onClick={(e) => { e.stopPropagation(); addToQueue(v); }}>+Queue</button>
                        </div>
                      </div>
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
            {/* Shelf tab sits on top of peek shelf so it moves with it */}
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
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
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
                <div key={v.id} className="throb-pk-card" onClick={() => playNow(v)}>
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
                    <img src={v.thumbnailUrl || ""} alt={v.title} loading="lazy" />
                    {v.trailerUrl && v.trailerUrl.startsWith("http") && (
                      <video
                        src={v.trailerUrl}
                        className="throb-trailer-preview"
                        muted loop playsInline preload="none"
                        style={{ opacity: 0 }}
                      />
                    )}
                    <span className="throb-dur">{v.duration}</span>
                    <span className="throb-src">{v.sourceDomain?.replace(".com", "")}</span>
                    <div className="throb-play-overlay"><Play size={24} fill="currentColor" /></div>
                  </div>
                  <div className="throb-pk-title">{v.title}</div>
                  <div className="throb-pk-actions">
                    <button className="throb-pk-btn" onClick={(e) => { e.stopPropagation(); playNow(v); }}>
                      <Play size={10} fill="currentColor" style={{ marginLeft: 1 }} /> Play
                    </button>
                    <button className="throb-pk-btn" onClick={(e) => { e.stopPropagation(); addToQueue(v); }}>
                      + Queue
                    </button>
                  </div>
                </div>
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
                        ? `${formatTime(elapsedSeconds)} / ${formatTime(currentVideo.durationSeconds)} · ${currentVideo.sourceDomain || ""}`
                        : `${currentVideo.duration || "—"} · ${currentVideo.sourceDomain || ""}`
                      : "Browse to find videos"}
                  </div>
                </div>
              </div>
              <div className="throb-transport-center">
                <button className="throb-t-btn ghost" onClick={skipPrev}>
                  <SkipBack size={16} fill="currentColor" />
                </button>
                <button className="throb-t-btn primary" onClick={() => setIsPlaying(!isPlaying)}>
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
          {/* Rail tab handle */}
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
                    key={`${v.id}-${i}`}
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
    </>
  );
}

/* =============================================
   SCOPED STYLES
   ============================================= */
const scopedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Sora:wght@300;400;500;600;700;800&display=swap');

  .throb-app {
    width: 100%; height: 100vh;
    display: flex; overflow: hidden;
    position: relative;
    font-family: 'Outfit', sans-serif;
    background: #000; color: #cbd5e1;
    -webkit-font-smoothing: antialiased;
  }

  /* ---- VIDEO LAYER ---- */
  .throb-video-layer {
    position: fixed; inset: 0; z-index: 0;
    background: #000;
    transition: filter 0.5s ease;
  }
  .throb-video-layer.dim-1 { filter: brightness(0.82); }
  .throb-video-layer.dim-2 { filter: brightness(0.2) blur(6px); }

  .throb-video-el {
    width: 100%; height: 100%;
    object-fit: contain;
  }
  .throb-video-fallback {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    background: #000;
  }
  .throb-video-fallback img {
    max-width: 100%; max-height: 100%;
    object-fit: contain; opacity: 0.6;
  }
  .throb-video-empty {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, #0a0c14, #1a0808, #0a0c14);
    position: relative; overflow: hidden;
  }
  .throb-video-empty::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 30% 40%, rgba(239,68,68,0.06) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 60%, rgba(148,163,184,0.04) 0%, transparent 50%);
    animation: throb-amb 8s ease-in-out infinite alternate;
  }
  @keyframes throb-amb { 0% { opacity: 0.6; } 100% { opacity: 1; } }
  .throb-watermark {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 100px; font-weight: 900;
    color: rgba(255,255,255,0.02);
    letter-spacing: -5px; user-select: none;
  }

  .throb-vid-info {
    position: absolute; top: 16px; left: 16px; z-index: 1;
    transition: opacity 0.4s;
  }
  .throb-vid-title {
    font-size: 16px; font-weight: 700;
    color: rgba(255,255,255,0.85);
    text-shadow: 0 2px 12px rgba(0,0,0,0.9);
    transition: opacity 0.4s;
  }
  .throb-vid-sub {
    font-size: 12px; color: rgba(255,255,255,0.5);
    margin-top: 3px; text-shadow: 0 1px 6px rgba(0,0,0,0.8);
    transition: opacity 0.4s;
  }
  .throb-full-link {
    margin-left: 10px; color: rgba(255,255,255,0.35); text-decoration: none;
    font-size: 11px; transition: color 0.2s; display: inline-flex; align-items: center; gap: 3px;
  }
  .throb-full-link:hover { color: rgba(255,255,255,0.8); }

  /* ---- CONTENT AREA ---- */
  .throb-content {
    flex: 1; display: flex; flex-direction: column;
    position: relative; z-index: 10; height: 100vh;
  }

  /* ---- TOP BAR ---- */
  .throb-topbar {
    position: fixed; top: 10px; right: 10px; z-index: 300;
    display: flex; gap: 4px;
  }
  .throb-topbar-btn {pointer-events: auto;
    width: 38px; height: 38px; border-radius: 50%;
    border: 1px solid rgba(148,163,184,0.15);
    background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
    color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s;
  }
  .throb-topbar-btn:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.2); }

  /* ---- TRANSPORT BAR ---- */
  .throb-transport {pointer-events: auto;
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 100;
    background: rgba(8,9,12,0.92); backdrop-filter: blur(24px);
    border-top: 1px solid rgba(148,163,184,0.06);
  }
  .throb-progress { height: 4px; background: rgba(148,163,184,0.08); position: relative; }
  .throb-progress-fill {
    height: 100%; width: 0%; background: #ef4444; position: relative;
    transition: width 0.25s linear;
  }
  .throb-progress-fill::after {
    content: ''; position: absolute; right: -6px; top: -5px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.7);
  }
  .throb-transport-inner {
    padding: 10px 16px 12px; display: flex; align-items: center;
    position: relative;
  }
  .throb-transport-left {
    display: flex; align-items: center; gap: 10px;
    flex: 1; min-width: 0;
  }
  .throb-transport-center {
    display: flex; align-items: center; gap: 12px;
    position: absolute; left: 50%; transform: translateX(-50%);
  }
  .throb-transport-right {
    flex: 1; display: flex; justify-content: flex-end;
  }
  .throb-now-thumb {
    width: 50px; height: 33px; border-radius: 5px;
    background: linear-gradient(135deg, rgba(239,68,68,0.15), #0a0c14);
    flex-shrink: 0; overflow: hidden;
  }
  .throb-now-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .throb-now-info { flex: 1; min-width: 0; }
  .throb-now-title {
    font-size: 13px; font-weight: 600; color: #f1f5f9;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .throb-now-sub { font-size: 11px; color: #ef4444; }
  .throb-t-btn {
    width: 40px; height: 40px; border-radius: 50%;
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s;
  }
  .throb-t-btn.ghost { background: transparent; color: #94a3b8; }
  .throb-t-btn.ghost:hover { background: rgba(148,163,184,0.1); color: #e2e8f0; }
  .throb-t-btn.primary {
    background: #ef4444; color: #fff;
    box-shadow: 0 0 20px rgba(239,68,68,0.3);
    width: 48px; height: 48px;
  }
  .throb-t-btn.primary:hover { background: #dc2626; }
  .throb-t-btn.cast {
    background: rgba(148,163,184,0.1); color: #94a3b8;
  }
  .throb-t-btn.cast:hover { background: rgba(239,68,68,0.12); color: #ef4444; }

  /* ---- SHELF TAB ---- */
  .throb-shelf-tab {pointer-events: auto;
    display: flex; align-items: center; gap: 8px;
    margin: 0 auto; width: fit-content;
    padding: 7px 20px;
    background: rgba(8,9,12,0.9); backdrop-filter: blur(12px);
    border: 1px solid rgba(148,163,184,0.12); border-bottom: none;
    border-radius: 12px 12px 0 0;
    cursor: pointer; transition: all 0.3s; user-select: none;
    z-index: 110; position: relative;
  }
  .throb-shelf-tab:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.15); }
  .throb-shelf-tab:active { transform: scale(0.97); }
  .throb-shelf-text {
    font-family: 'Sora', sans-serif; font-size: 11px;
    letter-spacing: 2px; text-transform: uppercase;
    color: #94a3b8; font-weight: 600; transition: color 0.3s;
  }
  .throb-shelf-tab:hover .throb-shelf-text { color: #ef4444; }
  .throb-shelf-icon {
    color: #8892a4; transition: color 0.3s, transform 0.3s;
  }
  .throb-shelf-tab:hover .throb-shelf-icon { color: #ef4444; }
  .throb-shelf-icon.flipped { transform: rotate(180deg); }
  .throb-shelf-line {
    width: 32px; height: 3px; border-radius: 2px;
    background: rgba(148,163,184,0.2);
  }

  /* ---- PEEK WRAPPER (tab + shelf move together) ---- */
  .throb-peek-wrapper {
    position: absolute; bottom: 68px; left: 0; right: 0; z-index: 90;
    transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
    transform: translateY(0); opacity: 1;
    pointer-events: none;
  }
  .throb-peek-wrapper .throb-shelf-tab { pointer-events: auto; }
  .throb-peek-wrapper .throb-peek { pointer-events: auto; }

  /* ---- PEEK SHELF (Stage 2) ---- */
  .throb-peek {
    background: rgba(8,9,12,0.95); backdrop-filter: blur(20px);
    border-top: 1px solid rgba(148,163,184,0.06);
    border-radius: 16px 16px 0 0;
    padding-top: 28px; padding-bottom: 10px;
    transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
    transform: translateY(0); opacity: 1;
  }
  .throb-peek.hidden {
    transform: translateY(calc(100% + 40px)); opacity: 0;
    pointer-events: none;
  }
  .throb-peek-top {
    display: flex; align-items: center; gap: 8px;
    padding: 0 16px 8px;
  }

  /* ---- SEARCH ---- */
  .throb-search-wrap { flex: 1; position: relative; }
  .throb-search-icon {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%); color: #555a64; pointer-events: none;
  }
  .throb-search {
    width: 100%; height: 42px; border-radius: 21px;
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(148,163,184,0.06);
    padding: 0 18px 0 40px;
    color: #e2e8f0; font-size: 14px;
    outline: none; font-family: 'Outfit', sans-serif;
    transition: all 0.3s;
  }
  .throb-search.sm { height: 36px; font-size: 13px; padding-left: 36px; }
  .throb-search:focus { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.1); }

  /* ---- CATEGORIES ---- */
  .throb-cats {
    display: flex; gap: 5px;
    padding: 10px 16px; overflow-x: auto;
    scrollbar-width: none; flex-shrink: 0;
  }
  .throb-cats.sm { padding: 0 16px 8px; }
  .throb-cats::-webkit-scrollbar { display: none; }
  .throb-cat {
    padding: 6px 14px; border-radius: 16px;
    font-size: 12px; font-weight: 600; white-space: nowrap;
    border: 1px solid rgba(148,163,184,0.12);
    background: transparent; color: #94a3b8;
    cursor: pointer; transition: all 0.3s;
    font-family: 'Outfit', sans-serif;
  }
  .throb-cat.on { background: rgba(255,255,255,0.9); color: #000; border-color: transparent; }
  .throb-cat:hover:not(.on) { background: rgba(148,163,184,0.08); color: #e2e8f0; }

  /* ---- PEEK ROW ---- */
  .throb-peek-row {
    display: flex; gap: 10px; padding: 0 16px;
    overflow-x: auto; scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .throb-peek-row::-webkit-scrollbar { display: none; }
  .throb-pk-card {
    flex-shrink: 0; width: 172px; scroll-snap-align: start;
    cursor: pointer; transition: transform 0.2s;
  }
  .throb-pk-card:hover { transform: scale(1.04); }
  .throb-pk-thumb {
    width: 172px; aspect-ratio: 16/9; border-radius: 8px;
    overflow: hidden; position: relative; background: #111;
  }
  .throb-pk-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .throb-pk-thumb .throb-trailer-preview {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; transition: opacity 0.3s; z-index: 1;
  }
  .throb-pk-title {
    font-size: 12px; font-weight: 600; color: #cbd5e1;
    margin-top: 5px; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }

  /* ---- FULL BROWSE (Stage 3) ---- */
  .throb-full {
    position: absolute; top: 0; left: 0; right: 0; bottom: 68px;
    z-index: 80;
    background: rgba(8,9,12,0.94); backdrop-filter: blur(20px);
    display: flex; flex-direction: column; overflow: hidden;
    transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease;
  }
  .throb-full.hidden { transform: translateY(100%); opacity: 0; pointer-events: none; }
  .throb-full-top {
    display: flex; align-items: center; gap: 10px;
    padding: 48px 16px 10px;
    border-bottom: 1px solid rgba(148,163,184,0.06);
    flex-shrink: 0;
  }
  .throb-close-btn {
    width: 42px; height: 42px; border-radius: 50%;
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(148,163,184,0.06);
    color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s; flex-shrink: 0;
  }
  .throb-close-btn:hover { background: rgba(239,68,68,0.08); color: #ef4444; border-color: rgba(239,68,68,0.15); }

  .throb-full-scroll {
    flex: 1; overflow-y: auto; padding: 8px 12px 16px;
  }
  .throb-full-scroll::-webkit-scrollbar { width: 4px; }
  .throb-full-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.08); border-radius: 2px; }

  /* ---- VIDEO GRID ---- */
  .throb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 12px;
  }
  .throb-card { cursor: pointer; transition: transform 0.15s; }
  .throb-card:hover { transform: scale(1.03); }
  .throb-thumb {
    aspect-ratio: 16/9; border-radius: 8px;
    overflow: hidden; position: relative; background: #111;
  }
  .throb-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
  .throb-card:hover .throb-thumb img { transform: scale(1.05); }
  .throb-thumb .throb-trailer-preview {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; transition: opacity 0.3s; z-index: 1;
  }
  .throb-thumb-hover {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s;
  }
  .throb-card:hover .throb-thumb-hover { opacity: 1; }
  .throb-dur {
    position: absolute; bottom: 4px; right: 4px;
    background: rgba(0,0,0,0.85); padding: 2px 6px;
    border-radius: 4px; font-size: 10px; font-weight: 700; color: #fff;
  }
  .throb-src {
    position: absolute; bottom: 4px; left: 4px;
    background: rgba(239,68,68,0.85); padding: 2px 6px;
    border-radius: 4px; font-size: 9px; font-weight: 700; color: #fff;
  }
  .throb-card-title {
    font-size: 12px; font-weight: 600; color: #f1f5f9;
    margin-top: 6px; line-height: 1.3;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .throb-card-meta { font-size: 11px; color: #8892a4; margin-top: 2px; }
  .throb-card-actions { display: flex; gap: 5px; margin-top: 6px; }
  .throb-card-btn {
    flex: 1; padding: 6px 0; border-radius: 7px;
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(148,163,184,0.06);
    color: #cbd5e1; font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all 0.3s;
    font-family: 'Outfit', sans-serif;
  }
  .throb-card-btn:hover { background: rgba(148,163,184,0.1); color: #f1f5f9; }

  /* ---- PAGINATION ---- */
  .throb-pagination {
    display: flex; justify-content: center; align-items: center;
    gap: 16px; margin-top: 24px; padding-bottom: 16px;
  }
  .throb-page-btn {
    padding: 8px 20px; border-radius: 22px;
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(148,163,184,0.06);
    color: #cbd5e1; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.3s;
    font-family: 'Outfit', sans-serif;
  }
  .throb-page-btn:hover:not(:disabled) { background: rgba(148,163,184,0.12); color: #f1f5f9; }
  .throb-page-btn:disabled { opacity: 0.3; cursor: default; }
  .throb-page-info { font-size: 13px; color: #8892a4; }

  /* ---- SKELETONS ---- */
  .throb-skeleton-thumb {
    aspect-ratio: 16/9; border-radius: 8px;
    background: rgba(255,255,255,0.05); margin-bottom: 6px;
    animation: throb-pulse 1.5s ease-in-out infinite;
  }
  .throb-skeleton-line {
    height: 10px; border-radius: 4px;
    background: rgba(255,255,255,0.05); margin-bottom: 4px;
    animation: throb-pulse 1.5s ease-in-out infinite;
  }
  .throb-skeleton-line.w75 { width: 75%; }
  .throb-skeleton-line.w50 { width: 50%; }
  @keyframes throb-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

  /* ---- QUEUE RAIL ---- */
  .throb-rail {
    width: 300px; min-width: 300px; height: 100vh;
    border-left: 1px solid rgba(148,163,184,0.06);
    background: rgba(10,11,15,0.95); backdrop-filter: blur(12px);
    display: flex; flex-direction: column;
    z-index: 20; flex-shrink: 0;
    transition: width 0.35s cubic-bezier(0.4,0,0.2,1), min-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease;
    position: relative;
  }
  .throb-rail.shut {
    width: 0; min-width: 0;
    border-left: none;
  }
  .throb-rail.shut .throb-rail-head,
  .throb-rail.shut .throb-rail-now,
  .throb-rail.shut .throb-rail-divider,
  .throb-rail.shut .throb-rail-list {
    opacity: 0; pointer-events: none; overflow: hidden;
  }

  .throb-rail-tab {
    position: absolute; left: -42px; top: 50%;
    transform: translateY(-50%); z-index: 25;
    width: 42px;
    display: flex; flex-direction: column; align-items: center;
    gap: 5px; padding: 12px 5px;
    background: rgba(10,11,15,0.92); backdrop-filter: blur(12px);
    border: 1px solid rgba(148,163,184,0.12); border-right: none;
    border-radius: 12px 0 0 12px;
    cursor: pointer; transition: all 0.3s; user-select: none;
  }
  .throb-rail-tab:hover { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.12); }
  .throb-rail-tab:active { transform: translateY(-50%) scale(0.96); }
  .throb-rail-tab-text {
    font-family: 'Sora', sans-serif; font-size: 9px;
    letter-spacing: 2px; text-transform: uppercase;
    color: #94a3b8;
    writing-mode: vertical-lr; text-orientation: mixed;
    transform: rotate(180deg); transition: color 0.2s;
  }
  .throb-rail-tab:hover .throb-rail-tab-text { color: #ef4444; }
  .throb-rail-count {
    font-size: 10px; font-weight: 700; color: #ef4444;
    background: rgba(239,68,68,0.15);
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .throb-rail-chevron {
    color: #8892a4; transition: color 0.3s, transform 0.3s;
  }
  .throb-rail-tab:hover .throb-rail-chevron { color: #ef4444; }
  .throb-rail-chevron.flip { transform: rotate(180deg); }

  .throb-rail-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(148,163,184,0.06); flex-shrink: 0;
  }
  .throb-rail-title {
    font-family: 'Sora', sans-serif; font-size: 11px;
    letter-spacing: 2px; text-transform: uppercase;
    color: #94a3b8; font-weight: 600;
  }
  .throb-rail-badge {
    font-size: 10px; color: #ef4444;
    background: rgba(239,68,68,0.1);
    padding: 2px 8px; border-radius: 10px; font-weight: 600;
  }

  .throb-rail-now {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148,163,184,0.06); flex-shrink: 0;
  }
  .throb-rail-now-label {
    font-size: 9px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
    color: #ef4444; margin-bottom: 6px;
  }
  .throb-rail-now-card {
    display: flex; gap: 10px; align-items: center;
    padding: 8px;
    background: rgba(239,68,68,0.05);
    border: 1px solid rgba(239,68,68,0.1);
    border-radius: 10px;
  }
  .throb-rail-now-thumb {
    width: 76px; min-width: 76px; aspect-ratio: 16/9;
    border-radius: 6px; overflow: hidden;
    background: linear-gradient(135deg, rgba(239,68,68,0.15), #0a0c14);
  }
  .throb-rail-now-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .throb-rail-now-info { flex: 1; min-width: 0; }
  .throb-rail-now-title {
    font-size: 11px; font-weight: 700; color: #e2e8f0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .throb-rail-now-time { font-size: 10px; color: #f87171; margin-top: 2px; font-family: monospace; }

  .throb-rail-divider {
    font-size: 9px; font-weight: 700;
    letter-spacing: 2px; text-transform: uppercase;
    color: #555a64; padding: 10px 12px 4px; flex-shrink: 0;
    display: flex; justify-content: space-between; align-items: center;
  }
  .throb-rail-clear {
    font-size: 10px; color: #94a3b8; background: none;
    border: none; cursor: pointer; text-transform: uppercase;
    letter-spacing: 1px; font-weight: 600;
    font-family: 'Outfit', sans-serif; transition: color 0.3s;
  }
  .throb-rail-clear:hover { color: #ef4444; }

  .throb-rail-list {
    flex: 1; overflow-y: auto; padding: 4px 6px;
  }
  .throb-rail-list::-webkit-scrollbar { width: 3px; }
  .throb-rail-list::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.06); border-radius: 2px; }

  .throb-rail-reorder { list-style: none; padding: 0; margin: 0; }

  .throb-rail-empty {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 16px; text-align: center;
    color: #555a64;
  }
  .throb-rail-empty p { font-size: 12px; font-weight: 600; margin-top: 8px; color: #64748b; }
  .throb-rail-empty span { font-size: 10px; margin-top: 4px; }

  .throb-rq {
    display: flex; gap: 8px; padding: 5px 6px;
    border-radius: 7px; cursor: grab;
    transition: background 0.15s; align-items: center;
  }
  .throb-rq:hover { background: rgba(148,163,184,0.04); }
  .throb-rq:active { cursor: grabbing; }
  .throb-rq-n { width: 18px; text-align: center; font-size: 11px; color: #8892a4; flex-shrink: 0; }
  .throb-rq-thumb {
    width: 76px; min-width: 76px; aspect-ratio: 16/9;
    border-radius: 5px; overflow: hidden; position: relative;
    background: #111;
  }
  .throb-rq-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .throb-rq-dur {
    position: absolute; bottom: 2px; right: 2px;
    background: rgba(0,0,0,0.85); padding: 2px 5px;
    border-radius: 3px; font-size: 9px; font-weight: 700; color: #fff;
  }
  .throb-rq-info { flex: 1; min-width: 0; }
  .throb-rq-title {
    font-size: 12px; font-weight: 500; color: #cbd5e1;
    line-height: 1.3; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .throb-rq-sub { font-size: 10px; color: #8892a4; margin-top: 1px; }
  .throb-rq-remove {
    width: 24px; height: 24px; border-radius: 50%;
    border: none; background: transparent;
    color: #8892a4; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: all 0.3s; flex-shrink: 0;
  }
  .throb-rq:hover .throb-rq-remove { opacity: 1; }
  .throb-rq-remove:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

  /* ---- PEEK CARD ACTIONS ---- */
  .throb-pk-actions {
    display: flex; gap: 4px; margin-top: 4px;
  }
  .throb-pk-btn {
    flex: 1; padding: 5px 0; border-radius: 6px;
    border: 1px solid rgba(148,163,184,0.12);
    background: rgba(148,163,184,0.06);
    color: #cbd5e1; font-size: 10px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    font-family: 'Outfit', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 3px;
  }
  .throb-pk-btn:hover { background: rgba(148,163,184,0.12); color: #f1f5f9; }
  .throb-pk-btn:active { transform: scale(0.95); background: rgba(239,68,68,0.15); color: #ef4444; }

  /* ---- PLAY OVERLAY (visible on mobile, hover on desktop) ---- */
  .throb-play-overlay {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.9);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s; z-index: 2;
    pointer-events: none;
  }
  @media (max-width: 768px) {
    .throb-play-overlay { opacity: 0.8; }
  }
  .throb-pk-thumb:hover .throb-play-overlay,
  .throb-thumb:hover .throb-play-overlay { opacity: 1; }

  /* ---- MOBILE QUEUE ---- */
  .throb-mobile-queue-btn {
    display: none; /* hidden on desktop */
    width: 40px; height: 40px; border-radius: 50%;
    border: none; cursor: pointer;
    background: rgba(239,68,68,0.12); color: #f87171;
    align-items: center; justify-content: center;
    position: relative; transition: all 0.2s;
  }
  .throb-mobile-queue-btn:active { transform: scale(0.92); }
  .throb-mobile-queue-count {
    position: absolute; top: -2px; right: -2px;
    background: #ef4444; color: #fff;
    font-size: 9px; font-weight: 700;
    width: 18px; height: 18px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid rgba(8,9,12,0.95);
  }
  .throb-mobile-queue {
    display: none; /* hidden on desktop */
    position: absolute; bottom: 80px; left: 8px; right: 8px;
    max-height: 50vh; z-index: 200;
    background: rgba(10,11,15,0.97); backdrop-filter: blur(20px);
    border: 1px solid rgba(148,163,184,0.1);
    border-radius: 16px; overflow: hidden;
    transform: translateY(20px); opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
    pointer-events: none; flex-direction: column;
  }
  .throb-mobile-queue.open {
    transform: translateY(0); opacity: 1; pointer-events: auto;
  }
  .throb-mobile-queue-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid rgba(148,163,184,0.08);
  }
  .throb-mobile-queue-title {
    font-family: 'Sora', sans-serif; font-size: 12px;
    letter-spacing: 1.5px; text-transform: uppercase;
    color: #94a3b8; font-weight: 600;
  }
  .throb-mobile-queue-list {
    flex: 1; overflow-y: auto; padding: 4px 6px; max-height: 40vh;
  }

  /* ---- TOUCH ACTIVE STATES ---- */
  .throb-card:active { transform: scale(0.97); }
  .throb-pk-card:active { transform: scale(0.96); }
  .throb-card-btn:active { transform: scale(0.93); background: rgba(239,68,68,0.12); color: #ef4444; }
  .throb-t-btn:active { transform: scale(0.9); }
  .throb-topbar-btn:active { transform: scale(0.9); }
  .throb-cat:active { transform: scale(0.95); }
  .throb-page-btn:active:not(:disabled) { transform: scale(0.95); }
  .throb-shelf-tab:active { transform: scale(0.97); }
  .throb-rq:active { background: rgba(148,163,184,0.08); }

  /* ---- MOUSE IDLE DIMMING ---- */
  .throb-app.mouse-idle .throb-transport { opacity: 0.4; }
  .throb-app.mouse-idle .throb-shelf-tab { opacity: 0.3; }
  .throb-app.mouse-idle .throb-topbar { opacity: 0.2; }
  .throb-app.mouse-idle .throb-vid-info { opacity: 0.3; }
  .throb-app.mouse-idle .throb-rail-tab { opacity: 0.3; }
  .throb-transport { transition: opacity 0.6s ease; }
  .throb-shelf-tab { transition: all 0.3s, opacity 0.6s ease; }
  .throb-topbar { transition: opacity 0.6s ease; }
  .throb-vid-info { transition: opacity 0.6s ease; }
  .throb-rail-tab { transition: all 0.3s, opacity 0.6s ease; }

  /* ---- RESPONSIVE ---- */
  @media (max-width: 768px) {
    .throb-rail { display: none; }
    .throb-rail-tab { display: none; }
    .throb-mobile-queue-btn { display: flex; }
    .throb-mobile-queue { display: flex; }
    .throb-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }
    .throb-thumb-hover { display: none; }
  }
`;
