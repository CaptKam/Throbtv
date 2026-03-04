import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Pause, SkipForward, X, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GlobalMiniPlayer() {
  const [location] = useLocation();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  // Hide on Discover and Landing pages as they have their own players or don't need one
  if (location === "/" || location === "/discover" || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] p-2 pr-4 flex items-center gap-4 max-w-sm w-full">
        
        {/* Thumbnail & Info */}
        <div className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0" onClick={() => window.location.href = "/discover"}>
          <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 shadow-md group-hover:ring-2 ring-primary/50 transition-all relative">
            <img 
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop" 
              className="w-full h-full object-cover" 
              alt="Thumbnail"
            />
            {isPlaying && (
               <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                 <div className="flex gap-0.5">
                   <div className="w-0.5 h-2 bg-primary animate-pulse" />
                   <div className="w-0.5 h-3 bg-primary animate-pulse delay-75" />
                   <div className="w-0.5 h-2 bg-primary animate-pulse delay-150" />
                 </div>
               </div>
            )}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">Locker Room Flex & Pose</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Tv className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium">Playing on TV</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-full text-white hover:bg-white/10"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-muted-foreground hover:text-white hover:bg-white/10">
            <SkipForward className="w-5 h-5 fill-current" />
          </Button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-full text-muted-foreground hover:text-white hover:bg-white/10"
            onClick={() => setIsVisible(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </div>
  );
}
