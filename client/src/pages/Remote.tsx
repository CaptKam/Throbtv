import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Search, Wifi, WifiOff,
  Plus, ListMusic, GripVertical, Trash2, X, ChevronUp, ChevronDown,
  Clock, Zap, Check, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/use-socket";
import type { Video } from "@shared/schema";

const CATEGORIES = ["All", "Amateur", "Twink", "Black", "Man", "Masturbation", "Big Cock", "Asian", "Beach", "Gay Porn", "Bareback", "Mature", "Latino", "3D"];

export default function Remote() {
  const params = useParams<{ sessionCode: string }>();
  const sessionCode = params.sessionCode || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [joinError, setJoinError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    isConnected,
    isPaired,
    peerDisconnected,
    playerState,
    joinSession,
    addToQueue,
    removeFromQueue,
    clearQueue,
    play,
    pause,
    next,
    prev,
    adjustTimer,
    skipNow,
  } = useSocket();

  useEffect(() => {
    if (isConnected && sessionCode && !isPaired) {
      joinSession(sessionCode).catch((err) => {
        setJoinError(err.message);
      });
    }
  }, [isConnected, sessionCode, isPaired, joinSession]);

  const { data, isLoading } = useQuery({
    queryKey: ["videos", searchQuery, activeCategory, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("offset", String(page * 20));
      if (searchQuery) params.set("search", searchQuery);
      if (activeCategory !== "All") params.set("category", activeCategory);
      const res = await fetch(`/api/videos?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<{ videos: Video[]; total: number }>;
    },
    staleTime: 30000,
  });

  const videosList = data?.videos ?? [];
  const totalVideos = data?.total ?? 0;
  const { currentVideo, queue, currentIndex, isPlaying, countdown } = playerState;

  const queueIds = new Set(queue.map((v) => v.id));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const handlePlayNext = (video: Video) => {
    addToQueue(video, "next");
    toast({ title: "Playing Next", description: `"${video.title}"` });
  };

  const handleAddToQueue = (video: Video) => {
    addToQueue(video, "end");
    toast({ title: "Added to Queue", description: `"${video.title}" is #${queue.length + 1}` });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <div className="text-xl font-bold text-white mb-2">Connecting...</div>
          <div className="text-muted-foreground">Establishing connection to throb<span className="text-muted-foreground">.</span><span className="text-primary">tv</span></div>
        </div>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <X className="w-12 h-12 text-destructive mx-auto mb-4" />
          <div className="text-xl font-bold text-white mb-2">Connection Failed</div>
          <div className="text-muted-foreground mb-4">{joinError}</div>
          <Button onClick={() => window.location.reload()} className="rounded-full">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden" data-testid="remote-page">

      {/* Zone 2: Browse Feed */}
      <div className="flex-1 overflow-y-auto pb-52">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-white/5 pt-safe">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-red-700 flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
              <span className="text-lg font-black tracking-tighter">throb<span className="text-muted-foreground">.</span><span className="text-primary">tv</span></span>
            </div>

            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="w-full pl-9 bg-white/5 border-white/10 focus-visible:ring-primary h-10 rounded-full text-sm"
                data-testid="input-search-remote"
              />
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isPaired ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"}`}>
              {isPaired ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
              {isPaired ? "Live" : "..."}
            </div>
          </div>

          {/* Category Chips */}
          <div className="overflow-x-auto pb-3 scrollbar-none">
            <div className="flex px-4 gap-2 min-w-max">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setPage(0); }}
                  data-testid={`remote-category-${cat.toLowerCase()}`}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-white text-black shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)]"
                      : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="p-3">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/9] bg-white/5 rounded-xl mb-2" />
                  <div className="h-3 bg-white/5 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {videosList.map((video) => {
                  const inQueue = queueIds.has(video.id);
                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col"
                      data-testid={`remote-card-${video.id}`}
                    >
                      <div className="relative aspect-[16/9] bg-zinc-900 rounded-xl overflow-hidden mb-1.5">
                        <img
                          src={video.thumbnailUrl || ""}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {inQueue && (
                          <div className="absolute top-1.5 left-1.5 bg-primary/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> In Queue
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                          <div className="text-[9px] font-bold text-white bg-primary/80 px-1.5 py-0.5 rounded">
                            {video.sourceDomain?.replace(".com", "")}
                          </div>
                          <div className="bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                            {video.duration}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight px-0.5 mb-1.5">
                        {video.title}
                      </h3>

                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="flex-1 h-9 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white"
                          onClick={() => handlePlayNext(video)}
                          data-testid={`remote-play-next-${video.id}`}
                        >
                          Next
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9 rounded-lg text-[11px] font-bold border-white/10 hover:bg-white/10 text-white"
                          onClick={() => handleAddToQueue(video)}
                          data-testid={`remote-add-queue-${video.id}`}
                        >
                          +Queue
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {totalVideos > 20 && (
                <div className="flex justify-center gap-3 mt-6 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="border-white/10 bg-white/5 rounded-full text-xs"
                  >
                    Prev
                  </Button>
                  <span className="flex items-center text-xs text-muted-foreground">
                    {page + 1}/{Math.ceil(totalVideos / 20)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(page + 1) * 20 >= totalVideos}
                    onClick={() => setPage((p) => p + 1)}
                    className="border-white/10 bg-white/5 rounded-full text-xs"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Zone 1: Sticky Transport Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.8)]">

        {/* Queue toggle handle */}
        <button
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-xl border border-white/10 border-b-0 rounded-t-xl px-5 py-1"
        >
          {isQueueOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </button>

        {/* Now playing info */}
        <div
          className="px-4 pt-3 pb-2 flex items-center gap-3 cursor-pointer"
          onClick={() => setIsQueueOpen(true)}
        >
          <div className="w-11 h-11 rounded-lg bg-zinc-800 overflow-hidden shrink-0 shadow-lg">
            {currentVideo && (
              <img src={currentVideo.thumbnailUrl || ""} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">
              {currentVideo?.title || "No video playing"}
            </div>
            <div className="text-xs text-primary font-medium mt-0.5">
              {currentVideo ? "Playing on TV" : "Add videos to start"}
            </div>
          </div>

          {/* Countdown */}
          {currentVideo && countdown > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                <Timer className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-mono font-bold text-primary">{formatTime(countdown)}</span>
              </div>
            </div>
          )}

          {/* Queue badge */}
          <div className="relative shrink-0" onClick={(e) => { e.stopPropagation(); setIsQueueOpen(true); }}>
            <ListMusic className="w-5 h-5 text-primary" />
            {queue.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                {queue.length}
              </span>
            )}
          </div>
        </div>

        {/* Timer controls */}
        {currentVideo && (
          <div className="px-4 pb-1 flex items-center justify-center gap-2">
            <button
              onClick={() => adjustTimer(-30)}
              className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-full hover:bg-white/10 transition"
            >
              -30s
            </button>
            <button
              onClick={() => adjustTimer(30)}
              className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-full hover:bg-white/10 transition"
            >
              +30s
            </button>
            <button
              onClick={skipNow}
              className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full hover:bg-yellow-400/20 transition flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Video ended?
            </button>
          </div>
        )}

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-4 px-4 pb-3 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14 rounded-full text-muted-foreground hover:text-white hover:bg-white/10"
            onClick={prev}
            data-testid="remote-prev"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </Button>

          <Button
            size="icon"
            className="w-20 h-20 rounded-full bg-white text-black hover:bg-gray-200 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] transition-transform hover:scale-105"
            onClick={() => (isPlaying ? pause() : play())}
            data-testid="remote-play-pause"
          >
            {isPlaying ? (
              <Pause className="w-9 h-9 fill-current" />
            ) : (
              <Play className="w-9 h-9 fill-current ml-1" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-14 h-14 rounded-full text-muted-foreground hover:text-white hover:bg-white/10"
            onClick={next}
            data-testid="remote-next"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </Button>
        </div>
      </div>

      {/* Queue Panel (slide-up) */}
      <AnimatePresence>
        {isQueueOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQueueOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl h-[80vh] flex flex-col"
            >
              <div className="flex justify-center p-3 cursor-pointer" onClick={() => setIsQueueOpen(false)}>
                <div className="w-10 h-1.5 bg-white/20 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-5 pb-3 border-b border-white/10">
                <h2 className="text-lg font-bold">Up Next</h2>
                <div className="flex items-center gap-2">
                  {queue.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-white rounded-full"
                      onClick={clearQueue}
                    >
                      Clear
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsQueueOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-5">
                {/* Now playing */}
                {currentVideo && (
                  <div className="mb-6">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Now Playing</div>
                    <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-2xl p-3">
                      <div className="w-20 aspect-video rounded-lg overflow-hidden shrink-0">
                        <img src={currentVideo.thumbnailUrl || ""} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">{currentVideo.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{currentVideo.sourceDomain}</div>
                        {countdown > 0 && (
                          <div className="text-xs font-mono text-primary mt-1">Next in {formatTime(countdown)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Queue */}
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  In Queue ({queue.length})
                </div>

                {queue.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <ListMusic className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-white/50">Queue is empty</p>
                    <p className="text-sm mt-1">Browse and add videos below</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 rounded-full border-white/10"
                      onClick={() => setIsQueueOpen(false)}
                    >
                      Browse Videos
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 pb-20">
                    {queue.map((video, idx) => {
                      const isCurrent = idx === currentIndex;
                      return (
                        <div
                          key={`${video.id}-${idx}`}
                          className={`flex items-center gap-3 rounded-xl p-2.5 ${
                            isCurrent ? "bg-primary/10 border border-primary/20" : "bg-white/5 hover:bg-white/10"
                          } transition-colors`}
                        >
                          <div className="text-xs font-mono text-muted-foreground w-5 text-center shrink-0">
                            {isCurrent ? (
                              <div className="flex gap-0.5 justify-center">
                                <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-primary rounded-full" />
                                <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 bg-primary rounded-full" />
                              </div>
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <div className="w-16 aspect-video rounded-lg overflow-hidden shrink-0">
                            <img src={video.thumbnailUrl || ""} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{video.title}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{video.duration}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            onClick={() => removeFromQueue(idx)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
