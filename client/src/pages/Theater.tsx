import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, SkipBack, Wifi, WifiOff, Cast, Smartphone } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";

export default function Theater() {
  const {
    isConnected,
    isPaired,
    peerDisconnected,
    sessionCode,
    playerState,
    setPlayerState,
    createSession,
    syncState,
  } = useSocket("tv");

  const [quickFade, setQuickFade] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferSeconds = 5;

  useEffect(() => {
    if (!isConnected) {
      setSessionCreated(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected && !sessionCreated) {
      createSession().then((code) => {
        setSessionCreated(true);
      });
    }
  }, [isConnected, sessionCreated, createSession]);

  useEffect(() => {
    if (playerState.isPlaying && playerState.currentVideo && playerState.countdown > 0) {
      timerRef.current = setInterval(() => {
        setPlayerState((prev) => {
          const newCountdown = prev.countdown - 1;
          if (newCountdown <= 0) {
            const nextIndex = prev.currentIndex + 1 < prev.queue.length ? prev.currentIndex + 1 : 0;
            const nextVideo = prev.queue[nextIndex] || null;
            const newState = {
              ...prev,
              currentIndex: nextIndex,
              currentVideo: nextVideo,
              countdown: nextVideo ? (nextVideo.durationSeconds || 300) + bufferSeconds : 0,
              isPlaying: prev.queue.length > 0,
            };
            syncState(newState);
            return newState;
          }
          if (newCountdown % 5 === 0) {
            syncState({ countdown: newCountdown, isPlaying: true, currentIndex: prev.currentIndex });
          }
          return { ...prev, countdown: newCountdown };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playerState.isPlaying, playerState.currentVideo?.id, playerState.countdown > 0, syncState, setPlayerState]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "f") {
        setQuickFade((f) => !f);
      }
    };
    const handleDblClick = () => setQuickFade((f) => !f);

    window.addEventListener("keydown", handleKey);
    window.addEventListener("dblclick", handleDblClick);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("dblclick", handleDblClick);
    };
  }, []);

  const pairingUrl = sessionCode
    ? `${window.location.origin}/remote/${sessionCode}`
    : "";

  const { currentVideo, queue, currentIndex, isPlaying, countdown } = playerState;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex items-center justify-center overflow-hidden">
      {/* Quick Fade Overlay */}
      <AnimatePresence>
        {quickFade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setQuickFade(false)}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-red-700 flex items-center justify-center">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
              <span className="text-4xl font-black tracking-tighter">throb<span style={{ color: '#9ca3af' }}>.</span><span style={{ color: '#ef4444' }}>tv</span></span>
            </div>
            <div className="text-muted-foreground text-lg">Session paused</div>
            <div className="mt-8 grid grid-cols-2 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold">{queue.length}</div>
                <div className="text-sm text-muted-foreground mt-1">Videos queued</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{currentIndex + 1}</div>
                <div className="text-sm text-muted-foreground mt-1">Current position</div>
              </div>
            </div>
            <div className="mt-12 text-sm text-muted-foreground/50">Double-click or press Esc to resume</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Before pairing: QR Code */}
      {!currentVideo && (
        <div className="flex flex-col items-center justify-center gap-8 p-8 max-w-lg text-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-red-700 flex items-center justify-center shadow-lg shadow-primary/30">
              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
            </div>
            <span className="text-3xl font-black tracking-tighter">throb<span style={{ color: '#9ca3af' }}>.</span><span style={{ color: '#ef4444' }}>tv</span></span>
          </div>

          {!isConnected ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <WifiOff className="w-6 h-6 animate-pulse" />
              <span className="text-lg">Connecting...</span>
            </div>
          ) : (
            <>
              <div className="text-xl font-medium text-muted-foreground mb-2">
                {isPaired ? "Phone connected! Add videos to start." : "Scan to connect your phone"}
              </div>

              {pairingUrl && !isPaired && (
                <div className="relative group">
                  <div className="absolute -inset-3 bg-gradient-to-r from-primary to-red-600 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition" />
                  <div className="relative bg-white p-6 rounded-2xl shadow-2xl">
                    <QRCodeSVG
                      value={pairingUrl}
                      size={280}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                </div>
              )}

              {isPaired && (
                <div className="flex items-center gap-3 text-green-400 bg-green-400/10 px-6 py-3 rounded-full">
                  <Smartphone className="w-5 h-5" />
                  <span className="font-semibold">Phone connected</span>
                </div>
              )}

              {sessionCode && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-2">Or enter code manually:</div>
                  <div className="text-4xl font-mono font-black tracking-[0.3em] text-primary bg-primary/10 px-8 py-4 rounded-2xl border border-primary/20">
                    {sessionCode}
                  </div>
                </div>
              )}

              {peerDisconnected && (
                <div className="text-yellow-400/80 text-sm mt-2">Phone disconnected. Scan again to reconnect.</div>
              )}
            </>
          )}

          <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground/50">
            <div className="flex items-center gap-2">
              <Cast className="w-4 h-4" />
              <span>This is your TV screen</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <span>Phone becomes the remote</span>
            </div>
          </div>
        </div>
      )}

      {/* Playing video */}
      {currentVideo && !quickFade && (
        <div className="fixed inset-0 flex flex-col">
          <div className="flex-1 bg-black relative">
            {currentVideo.trailerUrl ? (
              <video
                key={currentVideo.id}
                src={currentVideo.trailerUrl}
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : currentVideo.embedUrl ? (
              <iframe
                key={currentVideo.id}
                src={currentVideo.embedUrl}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                referrerPolicy="origin"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img src={currentVideo.thumbnailUrl || ""} className="max-w-full max-h-full object-contain opacity-60" />
              </div>
            )}
          </div>

          {/* Bottom info bar */}
          <div className="bg-black/90 backdrop-blur-xl border-t border-white/5 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-12 h-8 rounded bg-zinc-800 overflow-hidden shrink-0">
                <img src={currentVideo.thumbnailUrl || ""} className="w-full h-full object-cover" />
              </div>
              <div className="truncate">
                <div className="text-sm font-semibold truncate">{currentVideo.title}</div>
                <div className="text-xs text-muted-foreground">{currentVideo.sourceDomain}</div>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Next in</span>
                <span className="font-mono font-bold text-primary text-lg">{formatTime(countdown)}</span>
              </div>

              <div className="text-xs text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full">
                {currentIndex + 1} / {queue.length}
              </div>

              {isPaired && (
                <div className="flex items-center gap-1.5 text-green-400">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs font-medium">Phone</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
