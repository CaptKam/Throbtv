import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { log } from "./index";

interface SessionRoom {
  code: string;
  tvSocketId: string | null;
  phoneSocketId: string | null;
  queue: any[];
  currentIndex: number;
  isPlaying: boolean;
  countdown: number;
  createdAt: number;
}

const sessions = new Map<string, SessionRoom>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "THROB-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  const maxAge = 12 * 60 * 60 * 1000;
  for (const [code, session] of sessions) {
    if (now - session.createdAt > maxAge && !session.tvSocketId && !session.phoneSocketId) {
      sessions.delete(code);
    }
  }
}

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.NODE_ENV === "production" ? false : "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

  io.on("connection", (socket: Socket) => {
    log(`Socket connected: ${socket.id}`, "socket");

    socket.on("session:create", (callback) => {
      let code = generateCode();
      while (sessions.has(code)) code = generateCode();

      const session: SessionRoom = {
        code,
        tvSocketId: socket.id,
        phoneSocketId: null,
        queue: [],
        currentIndex: -1,
        isPlaying: false,
        countdown: 0,
        createdAt: Date.now(),
      };

      sessions.set(code, session);
      socket.join(code);
      socket.data.sessionCode = code;
      socket.data.role = "tv";

      log(`Session created: ${code} by TV ${socket.id}`, "socket");
      if (typeof callback === "function") {
        callback({ success: true, sessionCode: code });
      }
    });

    socket.on("session:rejoin", ({ sessionCode, role }, callback) => {
      const session = sessions.get(sessionCode);
      if (!session) {
        if (typeof callback === "function") {
          callback({ success: false, error: "Session expired" });
        }
        return;
      }

      const effectiveRole = role || "tv";
      if (effectiveRole === "tv") {
        session.tvSocketId = socket.id;
        socket.data.role = "tv";
      } else {
        session.phoneSocketId = socket.id;
        socket.data.role = "phone";
      }

      socket.join(sessionCode);
      socket.data.sessionCode = sessionCode;

      // Notify the other device
      socket.to(sessionCode).emit("session:paired", {
        deviceId: socket.id,
        role: socket.data.role,
      });

      const hasPeer = effectiveRole === "tv"
        ? !!session.phoneSocketId
        : !!session.tvSocketId;

      log(`${effectiveRole} ${socket.id} rejoined session ${sessionCode}`, "socket");
      if (typeof callback === "function") {
        callback({
          success: true,
          sessionCode,
          isPaired: hasPeer,
          state: {
            queue: session.queue,
            currentIndex: session.currentIndex,
            isPlaying: session.isPlaying,
            countdown: session.countdown,
          },
        });
      }
    });

    socket.on("session:join", ({ sessionCode }, callback) => {
      const session = sessions.get(sessionCode);
      if (!session) {
        if (typeof callback === "function") {
          callback({ success: false, error: "Session not found" });
        }
        return;
      }

      session.phoneSocketId = socket.id;
      socket.join(sessionCode);
      socket.data.sessionCode = sessionCode;
      socket.data.role = "phone";

      socket.to(sessionCode).emit("session:paired", {
        deviceId: socket.id,
        role: "phone",
      });

      log(`Phone ${socket.id} joined session ${sessionCode}`, "socket");
      if (typeof callback === "function") {
        callback({
          success: true,
          sessionCode,
          state: {
            queue: session.queue,
            currentIndex: session.currentIndex,
            isPlaying: session.isPlaying,
            countdown: session.countdown,
          },
        });
      }
    });

    socket.on("player:play", () => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      session.isPlaying = true;
      io.to(code).emit("player:play");
      log(`Play command in ${code}`, "socket");
    });

    socket.on("player:pause", () => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      session.isPlaying = false;
      io.to(code).emit("player:pause");
      log(`Pause command in ${code}`, "socket");
    });

    socket.on("player:next", () => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      const nextIndex = session.currentIndex + 1 < session.queue.length ? session.currentIndex + 1 : 0;
      session.currentIndex = nextIndex;
      session.isPlaying = true;
      session.countdown = session.queue[nextIndex]?.durationSeconds ? session.queue[nextIndex].durationSeconds + 5 : 0;
      io.to(code).emit("player:next");
      log(`Next command in ${code}, index=${nextIndex}`, "socket");
    });

    socket.on("player:prev", () => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      const prevIndex = session.currentIndex > 0 ? session.currentIndex - 1 : session.queue.length - 1;
      session.currentIndex = prevIndex;
      session.isPlaying = true;
      session.countdown = session.queue[prevIndex]?.durationSeconds ? session.queue[prevIndex].durationSeconds + 5 : 0;
      io.to(code).emit("player:prev");
      log(`Prev command in ${code}, index=${prevIndex}`, "socket");
    });

    socket.on("player:jump", ({ index }) => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      session.currentIndex = index;
      session.isPlaying = true;
      session.countdown = session.queue[index]?.durationSeconds ? session.queue[index].durationSeconds + 5 : 0;
      io.to(code).emit("player:jump", { index });
    });

    socket.on("player:state", (state) => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      session.currentIndex = state.currentIndex ?? session.currentIndex;
      session.isPlaying = state.isPlaying ?? session.isPlaying;
      session.countdown = state.countdown ?? session.countdown;
      session.queue = state.queue ?? session.queue;
      socket.to(code).emit("player:state", state);
    });

    socket.on("player:adjust-timer", ({ delta }) => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      session.countdown = Math.max(0, session.countdown + delta);
      io.to(code).emit("player:adjust-timer", { delta });
    });

    socket.on("player:skip-now", () => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      const nextIndex = session.currentIndex + 1 < session.queue.length ? session.currentIndex + 1 : 0;
      session.currentIndex = nextIndex;
      session.isPlaying = true;
      session.countdown = session.queue[nextIndex]?.durationSeconds ? session.queue[nextIndex].durationSeconds + 5 : 0;
      io.to(code).emit("player:skip-now");
    });

    socket.on("queue:add", ({ video, position }) => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;

      if (position === "next") {
        const insertAt = session.currentIndex + 1;
        session.queue.splice(insertAt >= 0 ? insertAt : 0, 0, video);
      } else {
        session.queue.push(video);
      }

      io.to(code).emit("queue:updated", { queue: session.queue });
      io.to(code).emit("queue:added", {
        video,
        position: position === "next" ? session.currentIndex + 1 : session.queue.length - 1,
      });
      log(`Queue add in ${code}: "${video.title}" (${position})`, "socket");
    });

    socket.on("queue:remove", ({ index }) => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;

      session.queue.splice(index, 1);
      if (index < session.currentIndex) {
        session.currentIndex--;
      } else if (index === session.currentIndex) {
        session.isPlaying = false;
      }

      io.to(code).emit("queue:updated", { queue: session.queue, currentIndex: session.currentIndex });
      log(`Queue remove index ${index} in ${code}`, "socket");
    });

    socket.on("queue:reorder", ({ from, to }) => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;

      const [item] = session.queue.splice(from, 1);
      session.queue.splice(to, 0, item);

      if (session.currentIndex === from) {
        session.currentIndex = to;
      } else if (from < session.currentIndex && to >= session.currentIndex) {
        session.currentIndex--;
      } else if (from > session.currentIndex && to <= session.currentIndex) {
        session.currentIndex++;
      }

      io.to(code).emit("queue:updated", { queue: session.queue, currentIndex: session.currentIndex });
    });

    socket.on("queue:clear", () => {
      const code = socket.data.sessionCode;
      const session = sessions.get(code);
      if (!session) return;
      session.queue = [];
      session.currentIndex = -1;
      session.isPlaying = false;
      io.to(code).emit("queue:updated", { queue: [], currentIndex: -1 });
    });

    socket.on("session:disconnect", () => {
      handleDisconnect(socket);
    });

    socket.on("disconnect", () => {
      handleDisconnect(socket);
    });
  });

  function handleDisconnect(socket: Socket) {
    const code = socket.data.sessionCode;
    if (!code) return;

    const session = sessions.get(code);
    if (!session) return;

    if (socket.data.role === "tv") {
      session.tvSocketId = null;
      io.to(code).emit("session:tv-disconnected");
      log(`TV disconnected from session ${code}`, "socket");
    } else if (socket.data.role === "phone") {
      session.phoneSocketId = null;
      io.to(code).emit("session:phone-disconnected");
      log(`Phone disconnected from session ${code}`, "socket");
    }

    if (!session.tvSocketId && !session.phoneSocketId) {
      sessions.delete(code);
      log(`Session ${code} cleaned up (both disconnected)`, "socket");
    }

    socket.data.sessionCode = null;
    socket.data.role = null;
  }

  return io;
}
