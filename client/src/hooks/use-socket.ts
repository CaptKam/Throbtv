import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { Video } from "@shared/schema";

interface PlayerState {
  currentIndex: number;
  currentVideo: Video | null;
  queue: Video[];
  isPlaying: boolean;
  countdown: number;
}

const initialState: PlayerState = {
  currentIndex: -1,
  currentVideo: null,
  queue: [],
  isPlaying: false,
  countdown: 0,
};

export function useSocket(role: "tv" | "phone") {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaired, setIsPaired] = useState(false);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>(initialState);
  const [peerDisconnected, setPeerDisconnected] = useState(false);

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setIsPaired(false);
    });

    socket.on("session:paired", () => {
      setIsPaired(true);
      setPeerDisconnected(false);
    });

    socket.on("session:tv-disconnected", () => {
      if (role === "phone") {
        setPeerDisconnected(true);
        setIsPaired(false);
      }
    });

    socket.on("session:phone-disconnected", () => {
      if (role === "tv") {
        setIsPaired(false);
        setPeerDisconnected(true);
      }
    });

    socket.on("player:play", () => {
      setPlayerState((s) => ({ ...s, isPlaying: true }));
    });

    socket.on("player:pause", () => {
      setPlayerState((s) => ({ ...s, isPlaying: false }));
    });

    socket.on("player:next", () => {
      setPlayerState((s) => {
        const nextIndex = s.currentIndex + 1 < s.queue.length ? s.currentIndex + 1 : 0;
        return {
          ...s,
          currentIndex: nextIndex,
          currentVideo: s.queue[nextIndex] || null,
          countdown: s.queue[nextIndex]?.durationSeconds ? s.queue[nextIndex].durationSeconds + 5 : 0,
          isPlaying: true,
        };
      });
    });

    socket.on("player:prev", () => {
      setPlayerState((s) => {
        const prevIndex = s.currentIndex > 0 ? s.currentIndex - 1 : s.queue.length - 1;
        return {
          ...s,
          currentIndex: prevIndex,
          currentVideo: s.queue[prevIndex] || null,
          countdown: s.queue[prevIndex]?.durationSeconds ? s.queue[prevIndex].durationSeconds + 5 : 0,
          isPlaying: true,
        };
      });
    });

    socket.on("player:jump", ({ index }: { index: number }) => {
      setPlayerState((s) => ({
        ...s,
        currentIndex: index,
        currentVideo: s.queue[index] || null,
        countdown: s.queue[index]?.durationSeconds ? s.queue[index].durationSeconds + 5 : 0,
        isPlaying: true,
      }));
    });

    socket.on("player:state", (state: Partial<PlayerState>) => {
      setPlayerState((s) => ({
        ...s,
        ...state,
        currentVideo: state.queue
          ? state.queue[state.currentIndex ?? s.currentIndex] || null
          : state.currentIndex !== undefined
          ? s.queue[state.currentIndex] || null
          : s.currentVideo,
      }));
    });

    socket.on("player:adjust-timer", ({ delta }: { delta: number }) => {
      setPlayerState((s) => ({ ...s, countdown: Math.max(0, s.countdown + delta) }));
    });

    socket.on("player:skip-now", () => {
      setPlayerState((s) => {
        const nextIndex = s.currentIndex + 1 < s.queue.length ? s.currentIndex + 1 : 0;
        return {
          ...s,
          currentIndex: nextIndex,
          currentVideo: s.queue[nextIndex] || null,
          countdown: s.queue[nextIndex]?.durationSeconds ? s.queue[nextIndex].durationSeconds + 5 : 0,
          isPlaying: true,
        };
      });
    });

    socket.on("queue:updated", ({ queue, currentIndex }: { queue: Video[]; currentIndex?: number }) => {
      setPlayerState((s) => {
        const idx = currentIndex ?? s.currentIndex;
        return {
          ...s,
          queue,
          currentIndex: idx,
          currentVideo: queue[idx] || null,
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  const createSession = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) return reject(new Error("Not connected"));

      socket.emit("session:create", (response: any) => {
        if (response.success) {
          setSessionCode(response.sessionCode);
          resolve(response.sessionCode);
        } else {
          reject(new Error(response.error || "Failed to create session"));
        }
      });
    });
  }, []);

  const joinSession = useCallback((code: string): Promise<PlayerState> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket) return reject(new Error("Not connected"));

      socket.emit("session:join", { sessionCode: code }, (response: any) => {
        if (response.success) {
          setSessionCode(code);
          setIsPaired(true);
          setPeerDisconnected(false);
          const state = response.state || {};
          const ps: PlayerState = {
            queue: state.queue || [],
            currentIndex: state.currentIndex ?? -1,
            currentVideo: state.queue?.[state.currentIndex] || null,
            isPlaying: state.isPlaying || false,
            countdown: state.countdown || 0,
          };
          setPlayerState(ps);
          resolve(ps);
        } else {
          reject(new Error(response.error || "Failed to join session"));
        }
      });
    });
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const addToQueue = useCallback((video: Video, position: "next" | "end" = "end") => {
    emit("queue:add", { video, position });
  }, [emit]);

  const removeFromQueue = useCallback((index: number) => {
    emit("queue:remove", { index });
  }, [emit]);

  const reorderQueue = useCallback((from: number, to: number) => {
    emit("queue:reorder", { from, to });
  }, [emit]);

  const clearQueue = useCallback(() => {
    emit("queue:clear");
  }, [emit]);

  const play = useCallback(() => emit("player:play"), [emit]);
  const pause = useCallback(() => emit("player:pause"), [emit]);
  const next = useCallback(() => emit("player:next"), [emit]);
  const prev = useCallback(() => emit("player:prev"), [emit]);
  const jump = useCallback((index: number) => emit("player:jump", { index }), [emit]);
  const adjustTimer = useCallback((delta: number) => emit("player:adjust-timer", { delta }), [emit]);
  const skipNow = useCallback(() => emit("player:skip-now"), [emit]);

  const syncState = useCallback((state: Partial<PlayerState>) => {
    emit("player:state", state);
  }, [emit]);

  return {
    isConnected,
    isPaired,
    peerDisconnected,
    sessionCode,
    playerState,
    setPlayerState,
    createSession,
    joinSession,
    emit,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    play,
    pause,
    next,
    prev,
    jump,
    adjustTimer,
    skipNow,
    syncState,
  };
}
