import { useState } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, Pause, SkipBack, SkipForward, Search, 
  Plus, FastForward, CheckCircle2,
  Tv, ListMusic, GripVertical, Trash2, X, ChevronUp, ChevronDown, Minimize, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Video } from "@shared/schema";

const CATEGORIES = ["All", "Trending", "New", "Muscular", "Amateur", "Studio", "Solo", "Collabs", "Verified"];

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [queue, setQueue] = useState<Video[]>([]);
  const [page, setPage] = useState(0);
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["videos", searchQuery, activeCategory, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "24");
      params.set("offset", String(page * 24));
      if (searchQuery) params.set("search", searchQuery);
      if (activeCategory !== "All") params.set("category", activeCategory);
      const res = await fetch(`/api/videos?${params}`);
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json() as Promise<{ videos: Video[]; total: number }>;
    },
    staleTime: 30000,
  });

  const videosList = data?.videos ?? [];
  const totalVideos = data?.total ?? 0;

  const handlePlayNext = (video: Video) => {
    setQueue([video, ...queue]);
    toast({ title: "Playing Next", description: `"${video.title}" queued up next` });
  };

  const handleAddToQueue = (video: Video) => {
    setQueue([...queue, video]);
    toast({ title: "Added to Queue", description: `"${video.title}" is #${queue.length + 1}` });
  };

  const removeFromQueue = (idx: number) => {
    setQueue(queue.filter((_, i) => i !== idx));
  };

  const handlePlayNow = (video: Video) => {
    setCurrentVideo(video);
    setIsFullScreen(true);
    setIsPlaying(true);
  };

  const skipNext = () => {
    if (queue.length > 0) {
      setCurrentVideo(queue[0]);
      setQueue(queue.slice(1));
    }
  };

  const nowPlaying = currentVideo || videosList[0];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      
      {/* FULL SCREEN PLAYER OVERLAY */}
      <AnimatePresence>
        {isFullScreen && nowPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-center">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setIsFullScreen(false)}>
                <X className="w-6 h-6" />
              </Button>
              <div className="text-white font-medium text-sm drop-shadow-md truncate max-w-[60%]">
                {nowPlaying.title}
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setIsFullScreen(false)}>
                <Minimize className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center relative w-full h-full bg-zinc-900">
              {nowPlaying.embedUrl ? (
                <iframe
                  src={nowPlaying.embedUrl}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <img src={nowPlaying.thumbnailUrl || ""} className="w-full h-full object-contain opacity-60" />
              )}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-primary/80 backdrop-blur rounded-full flex items-center justify-center cursor-pointer hover:bg-primary transition-colors" onClick={() => setIsPlaying(true)}>
                    <Play className="w-12 h-12 text-white ml-2" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div className="h-full bg-primary w-1/3 relative" />
              </div>
            </div>
            
            <div className="bg-black/90 p-6 flex justify-center items-center gap-8 border-t border-white/10 pb-safe">
              <Button variant="ghost" size="icon" className="w-14 h-14 rounded-full text-white hover:bg-white/10">
                <SkipBack className="w-8 h-8 fill-current" />
              </Button>
              <Button 
                size="icon" 
                className="w-20 h-20 rounded-full bg-primary text-white hover:bg-primary/80 shadow-[0_0_30px_-5px_rgba(147,51,234,0.4)] transition-transform hover:scale-105"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-14 h-14 rounded-full text-white hover:bg-white/10" onClick={skipNext}>
                <SkipForward className="w-8 h-8 fill-current" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone 2: Browse Feed */}
      <div className="flex-1 overflow-y-auto pb-40">
        
        {/* Header & Search */}
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/5 pt-safe shadow-md">
          <div className="px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search thousands of videos..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="w-full pl-10 bg-white/5 border-white/10 focus-visible:ring-primary h-11 rounded-full text-base"
                data-testid="input-search"
              />
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-full bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => { if (nowPlaying) { setCurrentVideo(nowPlaying); setIsFullScreen(true); } }}>
              <Tv className="w-5 h-5 text-primary" />
            </Button>
            <Button variant="ghost" size="icon" className="shrink-0 h-11 w-11 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white" onClick={() => logout.mutate()} data-testid="button-logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-3">
            <div className="flex px-4 gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => { setActiveCategory(category); setPage(0); }}
                  data-testid={`category-${category.toLowerCase()}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    activeCategory === category 
                      ? "bg-white text-black shadow-[0_0_15px_-3px_rgba(255,255,255,0.3)]" 
                      : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Video Grid */}
        <div className="p-2 sm:p-4 md:p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/9] bg-white/5 rounded-xl mb-2" />
                  <div className="h-3 bg-white/5 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
                {videosList.map((video, idx) => (
                  <motion.div 
                    key={video.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (idx % 12) * 0.03 }}
                    className="group flex flex-col cursor-pointer"
                    data-testid={`card-video-${video.id}`}
                  >
                    <div 
                      className="relative aspect-[16/9] bg-zinc-900 rounded-xl overflow-hidden shadow-md mb-2 group-hover:ring-2 ring-primary/80 transition-all"
                      onClick={() => handlePlayNow(video)}
                    >
                      <img 
                        src={video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/640/360`}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-6 h-6 text-white ml-1 fill-current" />
                        </div>
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                        <div className="text-[10px] font-bold text-white bg-primary/90 px-1.5 py-0.5 rounded shadow-sm">
                          {video.sourceDomain?.replace(".com", "") || "Unknown"}
                        </div>
                        <div className="bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                          {video.duration}
                        </div>
                      </div>
                    </div>

                    <div className="px-1 flex-1 flex flex-col">
                      <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">{video.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium text-muted-foreground">
                        <span>{video.views?.toLocaleString()} views</span>
                      </div>
                    </div>

                    <div className="mt-2 flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="secondary"
                        size="sm"
                        className="flex-1 h-8 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white"
                        onClick={(e) => { e.stopPropagation(); handlePlayNext(video); }}
                        data-testid={`button-play-next-${video.id}`}
                      >
                        Next
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 rounded-lg text-xs font-bold border-white/10 hover:bg-white/10 text-white"
                        onClick={(e) => { e.stopPropagation(); handleAddToQueue(video); }}
                        data-testid={`button-add-queue-${video.id}`}
                      >
                        +Queue
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalVideos > 24 && (
                <div className="flex justify-center gap-4 mt-8">
                  <Button 
                    variant="outline" 
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="border-white/10 bg-white/5 hover:bg-white/10 rounded-full"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center text-sm text-muted-foreground">
                    Page {page + 1} of {Math.ceil(totalVideos / 24)}
                  </span>
                  <Button 
                    variant="outline" 
                    disabled={(page + 1) * 24 >= totalVideos}
                    onClick={() => setPage(p => p + 1)}
                    className="border-white/10 bg-white/5 hover:bg-white/10 rounded-full"
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.8)]">
        
        <button 
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 border-b-0 rounded-t-xl px-6 py-1.5 flex flex-col items-center cursor-pointer hover:bg-black transition-colors"
        >
          {isQueueOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
        </button>

        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
          <div className="h-full bg-primary w-1/3 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-3">
          <div onClick={() => setIsQueueOpen(true)} className="flex items-center justify-between mb-4 cursor-pointer group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 shadow-lg group-hover:ring-2 ring-primary/50 transition-all">
                {nowPlaying && <img src={nowPlaying.thumbnailUrl || `https://picsum.photos/seed/${nowPlaying.id}/100/100`} className="w-full h-full object-cover" />}
              </div>
              <div className="truncate">
                <div className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{nowPlaying?.title || "No video selected"}</div>
                <div className="text-xs text-primary font-medium mt-0.5">{nowPlaying ? "Playing on TV" : "Select a video"}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <span className="text-sm font-mono font-medium text-white">{nowPlaying?.duration || "--:--"}</span>
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-4 px-2">
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full text-muted-foreground hover:text-white hover:bg-white/10">
              <SkipBack className="w-6 h-6 fill-current" />
            </Button>
            
            <Button 
              size="icon" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-black hover:bg-gray-200 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] transition-transform hover:scale-105 mx-2"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />}
            </Button>
            
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full text-muted-foreground hover:text-white hover:bg-white/10" onClick={skipNext}>
              <SkipForward className="w-6 h-6 fill-current" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-full text-primary hover:text-primary hover:bg-primary/10 ml-auto"
              onClick={() => setIsQueueOpen(true)}
              data-testid="button-open-queue"
            >
              <div className="relative">
                <ListMusic className="w-6 h-6" />
                {queue.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                    {queue.length}
                  </span>
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Queue Slide-up Panel */}
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="flex justify-center p-3 w-full shrink-0 cursor-pointer" onClick={() => setIsQueueOpen(false)}>
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              
              <div className="flex items-center justify-between px-6 pb-4 border-b border-white/10 shrink-0">
                <h2 className="text-xl font-bold">Up Next</h2>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-white hover:bg-white/10" onClick={() => setIsQueueOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-2xl mx-auto">
                  {nowPlaying && (
                    <div className="mb-8">
                      <div className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Now Playing</div>
                      <div className="flex items-center gap-4 bg-primary/10 border border-primary/20 rounded-2xl p-4 shadow-[0_0_30px_-10px_rgba(147,51,234,0.3)]">
                        <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0">
                          <img src={nowPlaying.thumbnailUrl || ""} className="w-full h-full object-cover opacity-80" />
                          {isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                              <div className="flex gap-1">
                                <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1.5 bg-primary rounded-full" />
                                <motion.div animate={{ height: [12, 20, 12] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1.5 bg-primary rounded-full" />
                                <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1.5 bg-primary rounded-full" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white truncate text-lg">{nowPlaying.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">{nowPlaying.sourceDomain}</div>
                          <div className="mt-2 text-xs font-mono text-primary font-medium bg-primary/20 inline-block px-2 py-1 rounded">
                            Duration: {nowPlaying.duration}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">In Queue ({queue.length})</div>
                    {queue.length > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white h-auto py-1.5 px-3 rounded-full hover:bg-white/10" onClick={() => setQueue([])}>
                        Clear Queue
                      </Button>
                    )}
                  </div>

                  <Reorder.Group axis="y" values={queue} onReorder={setQueue} className="space-y-3 pb-24">
                    {queue.map((video, idx) => (
                      <Reorder.Item key={`${video.id}-${idx}`} value={video} className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-3 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors group">
                        <div className="text-muted-foreground cursor-grab shrink-0 px-1 opacity-50 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <div className="w-24 aspect-video rounded-lg overflow-hidden shrink-0 relative shadow-md">
                          <img src={video.thumbnailUrl || ""} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">{video.duration}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white truncate text-base">{video.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">{video.sourceDomain}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); removeFromQueue(idx); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Reorder.Item>
                    ))}
                    
                    {queue.length === 0 && (
                      <div className="text-center py-16 text-muted-foreground bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-white/60">Your queue is empty</p>
                        <p className="text-sm mt-2">Find something great to watch from the feed.</p>
                        <Button 
                          variant="outline" 
                          className="mt-6 rounded-full border-white/10 bg-white/5 hover:bg-white/10"
                          onClick={() => setIsQueueOpen(false)}
                        >
                          Return to Feed
                        </Button>
                      </div>
                    )}
                  </Reorder.Group>
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
