import { useState } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, Search, 
  Clock, Plus, FastForward, CheckCircle2,
  Tv, ListMusic, GripVertical, Trash2, X, ChevronUp, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

// Mock Data
const CATEGORIES = ["Trending", "New", "Muscular", "Amateur", "Studio", "Solo", "Collabs"];

const MOCK_VIDEOS = [
  {
    id: "1",
    title: "Summer Workout Routine at the Beach",
    duration: "12:34",
    source: "FapHouse",
    thumbnail: "https://images.unsplash.com/photo-1583465583625-f71626017b6c?q=80&w=800&auto=format&fit=crop",
    tags: ["outdoor", "muscle", "solo"]
  },
  {
    id: "2",
    title: "Locker Room Flex & Pose",
    duration: "08:15",
    source: "BoyfriendTV",
    thumbnail: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
    tags: ["amateur", "jock"]
  },
  {
    id: "3",
    title: "Late Night Studio Session",
    duration: "22:40",
    source: "Faptor",
    thumbnail: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=800&auto=format&fit=crop",
    tags: ["studio", "collab"]
  },
  {
    id: "4",
    title: "Morning Run & Stretch",
    duration: "15:20",
    source: "GayHaus",
    thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop",
    tags: ["outdoor", "morning"]
  },
  {
    id: "5",
    title: "Heavy Lifting Reps",
    duration: "10:05",
    source: "OnlyGayVideo",
    thumbnail: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
    tags: ["muscle", "gym"]
  }
];

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queue, setQueue] = useState<typeof MOCK_VIDEOS>([MOCK_VIDEOS[1], MOCK_VIDEOS[2], MOCK_VIDEOS[3]]);
  const { toast } = useToast();

  const handlePlayNext = (video: typeof MOCK_VIDEOS[0]) => {
    setQueue([video, ...queue]);
    toast({
      title: "Added to Up Next",
      description: `"${video.title}" will play next`,
      action: <CheckCircle2 className="w-5 h-5 text-green-500" />
    });
  };

  const handleAddToQueue = (video: typeof MOCK_VIDEOS[0]) => {
    setQueue([...queue, video]);
    toast({
      title: "Added to Queue",
      description: `"${video.title}" is #${queue.length + 1} in queue`,
      action: <ListMusic className="w-5 h-5 text-primary" />
    });
  };
  
  const removeFromQueue = (id: string) => {
    setQueue(queue.filter(v => v.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Zone 2: Browse Feed (Everything above transport bar) */}
      <div className="flex-1 overflow-y-auto pb-40">
        
        {/* Header & Search */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5 pt-safe">
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Search videos, tags, or actors..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-white/5 border-transparent focus-visible:ring-primary h-12 rounded-2xl text-base"
              />
            </div>
            <Button variant="ghost" size="icon" className="shrink-0 h-12 w-12 rounded-full bg-white/5 hover:bg-white/10">
              <Tv className="w-5 h-5 text-primary" />
            </Button>
          </div>

          {/* Categories */}
          <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex px-4 gap-2">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeCategory === category 
                      ? "bg-primary text-white shadow-[0_0_15px_-3px_rgba(147,51,234,0.5)]" 
                      : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Video Feed */}
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          {MOCK_VIDEOS.map((video, idx) => (
            <motion.div 
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-card border border-white/5 rounded-3xl overflow-hidden shadow-lg"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted group">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Duration Badge */}
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {video.duration}
                </div>
                
                {/* Source Badge */}
                <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-lg">
                  {video.source}
                </div>
              </div>

              {/* Info & Actions */}
              <div className="p-5">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{video.title}</h3>
                <div className="flex gap-2 mb-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
                  {video.tags.map(tag => (
                    <span key={tag} className="text-xs font-medium text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base transition-colors"
                    onClick={() => handlePlayNext(video)}
                  >
                    <FastForward className="w-5 h-5 mr-2" />
                    Play Next
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl border-white/10 hover:bg-white/10 text-white font-semibold text-base transition-colors"
                    onClick={() => handleAddToQueue(video)}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add to Queue
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Zone 1: Sticky Transport Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.8)]">
        
        <button 
          onClick={() => setIsQueueOpen(!isQueueOpen)}
          className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 border-b-0 rounded-t-xl px-6 py-1.5 flex flex-col items-center cursor-pointer hover:bg-black transition-colors"
        >
          {isQueueOpen ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Progress/Timer Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
          <div className="h-full bg-primary w-1/3 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-3">
          {/* Now Playing Info & Drawer Trigger */}
          <div 
            onClick={() => setIsQueueOpen(true)}
            className="flex items-center justify-between mb-4 cursor-pointer group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 shadow-lg group-hover:ring-2 ring-primary/50 transition-all">
                <img src={MOCK_VIDEOS[0].thumbnail} className="w-full h-full object-cover" />
              </div>
              <div className="truncate">
                <div className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{MOCK_VIDEOS[0].title}</div>
                <div className="text-xs text-primary font-medium mt-0.5">Playing on TV</div>
              </div>
            </div>
            
            {/* Auto-advance Timer */}
            <div className="flex items-center gap-2 shrink-0 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <span className="text-sm font-mono font-medium text-white">04:12</span>
              <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 px-2">
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full text-muted-foreground hover:text-white hover:bg-white/10">
              <SkipBack className="w-6 h-6 fill-current" />
            </Button>
            
            <Button 
              size="icon" 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white text-black hover:bg-gray-200 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] transition-transform hover:scale-105 mx-2"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
              ) : (
                <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
              )}
            </Button>
            
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full text-muted-foreground hover:text-white hover:bg-white/10">
              <SkipForward className="w-6 h-6 fill-current" />
            </Button>

            {/* Explicit Queue Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-12 h-12 rounded-full text-primary hover:text-primary hover:bg-primary/10 ml-auto"
              onClick={() => setIsQueueOpen(true)}
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

      {/* Custom Queue Slide-up Panel */}
      <AnimatePresence>
        {isQueueOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQueueOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            />
            
            {/* Panel */}
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
                  <div className="mb-8">
                    <div className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">Now Playing</div>
                    <div className="flex items-center gap-4 bg-primary/10 border border-primary/20 rounded-2xl p-4 shadow-[0_0_30px_-10px_rgba(147,51,234,0.3)]">
                      <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0">
                        <img src={MOCK_VIDEOS[0].thumbnail} className="w-full h-full object-cover opacity-80" />
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
                        <div className="font-bold text-white truncate text-lg">{MOCK_VIDEOS[0].title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{MOCK_VIDEOS[0].source}</div>
                        <div className="mt-2 text-xs font-mono text-primary font-medium bg-primary/20 inline-block px-2 py-1 rounded">
                          Ends in 04:12
                        </div>
                      </div>
                    </div>
                  </div>

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
                          <img src={video.thumbnail} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">{video.duration}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white truncate text-base">{video.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">{video.source}</div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0 h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromQueue(video.id);
                          }}
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
