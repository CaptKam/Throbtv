import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Play, Pause, SkipBack, SkipForward, Search, 
  Clock, Plus, FastForward, CheckCircle2,
  Tv, ListMusic
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
  const [queue, setQueue] = useState<typeof MOCK_VIDEOS>([]);
  const { toast } = useToast();

  const handlePlayNext = (video: typeof MOCK_VIDEOS[0]) => {
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-t border-white/10 pb-safe shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.8)]">
        
        {/* Progress/Timer Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
          <div className="h-full bg-primary w-1/3 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-3">
          {/* Now Playing Info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 shadow-lg">
                <img src={MOCK_VIDEOS[0].thumbnail} className="w-full h-full object-cover" />
              </div>
              <div className="truncate">
                <div className="text-sm font-bold text-white truncate">{MOCK_VIDEOS[0].title}</div>
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
          <div className="flex items-center justify-between px-2">
            <Button variant="ghost" size="icon" className="w-14 h-14 rounded-full text-muted-foreground hover:text-white hover:bg-white/10">
              <SkipBack className="w-7 h-7 fill-current" />
            </Button>
            
            <Button 
              size="icon" 
              className="w-20 h-20 rounded-full bg-white text-black hover:bg-gray-200 shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)] transition-transform hover:scale-105"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </Button>
            
            <Button variant="ghost" size="icon" className="w-14 h-14 rounded-full text-muted-foreground hover:text-white hover:bg-white/10">
              <SkipForward className="w-7 h-7 fill-current" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
