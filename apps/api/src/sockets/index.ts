import type { Server as HttpServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Server, type Socket } from "socket.io";
import {
  computeTypingScore,
  isPresetTimedRaceMode,
  multiplayerCreateRoomSchema,
  multiplayerFinishSchema,
  multiplayerJoinRoomSchema,
  multiplayerProgressSchema,
  multiplayerReadySchema,
  timedModeDurationMs,
  type MultiplayerRaceResult,
  type MultiplayerRoomPlayer,
  type MultiplayerRoomState,
  type RaceMode,
  type RaceText,
  type TypingScore
} from "@typeracrer/shared";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { UserModel } from "../db/models/user.model.js";
import { getRaceText, createTypingAttempt } from "../modules/race/race.service.js";

const MIN_PLAYERS_TO_START = 2;
const MAX_PLAYERS_PER_ROOM = 20;
const COUNTDOWN_SECONDS = 3;
const FIXED_MODE_TIMEOUT_MS = 180_000;

type SocketIdentity = {
  userId: string;
  username: string;
  role: "user" | "admin";
};

type RoomPlayerRuntime = {
  userId: string;
  username: string;
  socketIds: Set<string>;
  ready: boolean;
  typed: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finishedAtMs: number | null;
  place: number | null;
  finalScore: TypingScore | null;
  persisted: boolean;
};

type RoomRuntime = {
  id: string;
  hostUserId: string;
  mode: RaceMode;
  raceDurationMs: number | null;
  status: MultiplayerRoomState["status"];
  countdownSecondsLeft: number | null;
  text: RaceText | null;
  createdAtMs: number;
  updatedAtMs: number;
  startedAtMs: number | null;
  players: Map<string, RoomPlayerRuntime>;
  countdownInterval: NodeJS.Timeout | null;
  raceTimeout: NodeJS.Timeout | null;
};

const rooms = new Map<string, RoomRuntime>();
const socketRoom = new Map<string, string>();

function parseCookies(rawCookieHeader: string | undefined): Record<string, string> {
  if (!rawCookieHeader) {
    return {};
  }

  return rawCookieHeader.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [rawKey, ...rawValueParts] = pair.trim().split("=");
    if (!rawKey || rawValueParts.length === 0) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValueParts.join("="));
    return acc;
  }, {});
}

function readAccessToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim().length > 0) {
    return authToken.trim();
  }

  const cookieHeader = socket.handshake.headers.cookie;
  const cookies = parseCookies(cookieHeader);
  const cookieToken = cookies.accessToken;
  return typeof cookieToken === "string" && cookieToken.length > 0 ? cookieToken : null;
}

function emitSocketError(socket: Socket, code: string, message: string): void {
  socket.emit("race:error", { code, message });
}

function touchRoom(room: RoomRuntime): void {
  room.updatedAtMs = Date.now();
}

function clearCountdownTimer(room: RoomRuntime): void {
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }
}

function clearRaceTimer(room: RoomRuntime): void {
  if (room.raceTimeout) {
    clearTimeout(room.raceTimeout);
    room.raceTimeout = null;
  }
}

function toRoomState(room: RoomRuntime): MultiplayerRoomState {
  const players: MultiplayerRoomPlayer[] = [...room.players.values()]
    .map((player) => ({
      userId: player.userId,
      username: player.username,
      ready: player.ready,
      progress: player.progress,
      wpm: player.wpm,
      accuracy: player.accuracy,
      finishedAtMs: player.finishedAtMs,
      place: player.place
    }))
    .sort((a, b) => {
      if (a.place !== null && b.place !== null) {
        return a.place - b.place;
      }
      if (a.place !== null) {
        return -1;
      }
      if (b.place !== null) {
        return 1;
      }
      return a.username.localeCompare(b.username);
    });

  return {
    id: room.id,
    hostUserId: room.hostUserId,
    mode: room.mode,
    raceDurationMs: room.raceDurationMs,
    status: room.status,
    countdownSecondsLeft: room.countdownSecondsLeft,
    textId: room.text?.id ?? null,
    prompt: room.text?.content ?? null,
    createdAt: new Date(room.createdAtMs).toISOString(),
    updatedAt: new Date(room.updatedAtMs).toISOString(),
    players
  };
}

function emitRoomState(io: Server, room: RoomRuntime): void {
  io.to(room.id).emit("race:room_state", { room: toRoomState(room) });
}

function generateRoomId(): string {
  return randomBytes(3).toString("hex");
}

function normalizeCustomDurationMs(value: number): number {
  return Math.max(10_000, Math.min(value, 600_000));
}

function resolveRoomDurationMs(mode: RaceMode, customDurationMs?: number): number | null {
  if (isPresetTimedRaceMode(mode)) {
    return timedModeDurationMs[mode];
  }

  if (mode === "timed_custom") {
    if (!customDurationMs) {
      return null;
    }
    return normalizeCustomDurationMs(customDurationMs);
  }

  return null;
}

function createRoom(mode: RaceMode, host: SocketIdentity, raceDurationMs: number | null): RoomRuntime {
  let nextId = generateRoomId();
  while (rooms.has(nextId)) {
    nextId = generateRoomId();
  }

  const now = Date.now();
  return {
    id: nextId,
    hostUserId: host.userId,
    mode,
    raceDurationMs,
    status: "waiting",
    countdownSecondsLeft: null,
    text: null,
    createdAtMs: now,
    updatedAtMs: now,
    startedAtMs: null,
    players: new Map(),
    countdownInterval: null,
    raceTimeout: null
  };
}

function isTimedRoom(room: RoomRuntime): boolean {
  return room.mode !== "fixed";
}

function getRaceDurationMs(room: RoomRuntime): number {
  if (room.raceDurationMs !== null) {
    return room.raceDurationMs;
  }
  return FIXED_MODE_TIMEOUT_MS;
}

function playersReadyForRace(room: RoomRuntime): boolean {
  if (room.players.size < MIN_PLAYERS_TO_START) {
    return false;
  }
  return [...room.players.values()].every((player) => player.ready);
}

function canStartCountdown(room: RoomRuntime): boolean {
  return room.status === "waiting" && playersReadyForRace(room);
}

function resetPlayersForNewRace(room: RoomRuntime): void {
  for (const player of room.players.values()) {
    player.ready = false;
    player.typed = "";
    player.progress = 0;
    player.wpm = 0;
    player.accuracy = 100;
    player.finishedAtMs = null;
    player.place = null;
    player.finalScore = null;
    player.persisted = false;
  }
}

function allPlayersFinished(room: RoomRuntime): boolean {
  if (room.players.size === 0) {
    return true;
  }
  return [...room.players.values()].every((player) => player.finalScore !== null);
}

function maybeDeleteRoom(io: Server, roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  if (room.players.size > 0) {
    return;
  }

  clearCountdownTimer(room);
  clearRaceTimer(room);
  rooms.delete(roomId);
  io.to(roomId).emit("race:room_closed", { roomId });
}

function attachPlayerToRoom(room: RoomRuntime, identity: SocketIdentity, socketId: string): RoomPlayerRuntime {
  const existing = room.players.get(identity.userId);
  if (existing) {
    existing.socketIds.add(socketId);
    return existing;
  }

  const player: RoomPlayerRuntime = {
    userId: identity.userId,
    username: identity.username,
    socketIds: new Set([socketId]),
    ready: false,
    typed: "",
    progress: 0,
    wpm: 0,
    accuracy: 100,
    finishedAtMs: null,
    place: null,
    finalScore: null,
    persisted: false
  };

  room.players.set(identity.userId, player);
  return player;
}

function detachSocketFromRoom(io: Server, socket: Socket): void {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) {
    return;
  }

  socketRoom.delete(socket.id);
  socket.leave(roomId);

  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  const identity = socket.data as SocketIdentity;
  const player = room.players.get(identity.userId);
  if (player) {
    player.socketIds.delete(socket.id);
    if (player.socketIds.size === 0) {
      room.players.delete(identity.userId);
      if (room.hostUserId === identity.userId) {
        const nextHost = [...room.players.values()][0];
        if (nextHost) {
          room.hostUserId = nextHost.userId;
        }
      }
    }
  }

  if (room.status === "countdown" && !playersReadyForRace(room)) {
    clearCountdownTimer(room);
    room.status = "waiting";
    room.countdownSecondsLeft = null;
  }

  touchRoom(room);
  emitRoomState(io, room);

  if (room.status === "racing" && allPlayersFinished(room)) {
    void finalizeRoom(io, room)
      .catch((error) => {
        console.error("[socket] finalizeRoom failed", error);
      })
      .finally(() => {
        maybeDeleteRoom(io, room.id);
      });
    return;
  }

  maybeDeleteRoom(io, roomId);
}

function startCountdown(io: Server, room: RoomRuntime): void {
  if (!canStartCountdown(room) || room.countdownInterval) {
    return;
  }

  room.status = "countdown";
  room.countdownSecondsLeft = COUNTDOWN_SECONDS;
  touchRoom(room);
  emitRoomState(io, room);
  io.to(room.id).emit("race:countdown", { secondsLeft: COUNTDOWN_SECONDS });

  room.countdownInterval = setInterval(() => {
    if (!rooms.has(room.id)) {
      clearCountdownTimer(room);
      return;
    }

    if (!playersReadyForRace(room)) {
      clearCountdownTimer(room);
      room.status = "waiting";
      room.countdownSecondsLeft = null;
      touchRoom(room);
      emitRoomState(io, room);
      return;
    }

    const current = room.countdownSecondsLeft ?? COUNTDOWN_SECONDS;
    const next = current - 1;

    if (next <= 0) {
      clearCountdownTimer(room);
      void startRace(io, room);
      return;
    }

    room.countdownSecondsLeft = next;
    touchRoom(room);
    emitRoomState(io, room);
    io.to(room.id).emit("race:countdown", { secondsLeft: next });
  }, 1_000);
}

async function finalizePlayerResult(
  room: RoomRuntime,
  player: RoomPlayerRuntime,
  elapsedMs: number,
  finishedAtMs: number | null
): Promise<void> {
  if (!room.text || player.persisted) {
    return;
  }

  const boundedElapsed =
    room.raceDurationMs !== null ? Math.min(elapsedMs, room.raceDurationMs) : Math.min(elapsedMs, FIXED_MODE_TIMEOUT_MS);

  const score = computeTypingScore({
    prompt: room.text.content,
    typed: player.typed,
    durationMs: boundedElapsed
  });

  const currentlyPlaced = [...room.players.values()].filter((entry) => entry.place !== null).length;
  const place = currentlyPlaced + 1;

  player.progress = score.progress;
  player.wpm = score.wpm;
  player.accuracy = score.accuracy;
  player.finishedAtMs = finishedAtMs;
  player.place = place;
  player.finalScore = score;

  if (player.typed.length === 0) {
    // Keep official room results, but do not persist empty attempts.
    player.persisted = true;
    return;
  }

  try {
    await createTypingAttempt(player.userId, {
      mode: room.mode,
      textId: room.text.id,
      typed: player.typed,
      durationMs: boundedElapsed,
      targetDurationMs: room.raceDurationMs ?? undefined
    });
  } catch (error) {
    console.error("[socket] failed to persist multiplayer attempt", error);
  }

  player.persisted = true;
}

function buildResults(room: RoomRuntime): MultiplayerRaceResult[] {
  const results: MultiplayerRaceResult[] = [];

  for (const player of room.players.values()) {
    if (!player.finalScore || player.place === null) {
      continue;
    }

    results.push({
      userId: player.userId,
      username: player.username,
      place: player.place,
      score: player.finalScore,
      finishedAtMs: player.finishedAtMs
    });
  }

  results.sort((a, b) => a.place - b.place);
  return results;
}

async function finalizeRoom(io: Server, room: RoomRuntime): Promise<void> {
  if (room.status === "finished") {
    return;
  }

  clearRaceTimer(room);
  room.status = "finished";
  room.countdownSecondsLeft = null;

  const elapsedFromStart = room.startedAtMs ? Date.now() - room.startedAtMs : getRaceDurationMs(room);
  const boundedElapsed = Math.max(1, Math.min(elapsedFromStart, getRaceDurationMs(room)));

  for (const player of room.players.values()) {
    if (!player.persisted) {
      const timedFinishedAt = isTimedRoom(room) ? boundedElapsed : null;
      await finalizePlayerResult(room, player, boundedElapsed, timedFinishedAt);
    }
  }

  if (isTimedRoom(room)) {
    const ranked = [...room.players.values()]
      .filter((entry) => entry.finalScore !== null)
      .sort((a, b) => {
        const scoreA = a.finalScore;
        const scoreB = b.finalScore;
        if (!scoreA || !scoreB) {
          return 0;
        }
        if (scoreA.wpm !== scoreB.wpm) {
          return scoreB.wpm - scoreA.wpm;
        }
        if (scoreA.accuracy !== scoreB.accuracy) {
          return scoreB.accuracy - scoreA.accuracy;
        }
        if (scoreA.progress !== scoreB.progress) {
          return scoreB.progress - scoreA.progress;
        }
        return a.userId.localeCompare(b.userId);
      });

    ranked.forEach((player, index) => {
      player.place = index + 1;
      player.finishedAtMs = boundedElapsed;
    });
  }

  touchRoom(room);
  const roomState = toRoomState(room);
  const results = buildResults(room);

  io.to(room.id).emit("race:room_state", { room: roomState });
  io.to(room.id).emit("race:finished", { room: roomState, results });
}

async function startRace(io: Server, room: RoomRuntime): Promise<void> {
  if (!playersReadyForRace(room)) {
    room.status = "waiting";
    room.countdownSecondsLeft = null;
    touchRoom(room);
    emitRoomState(io, room);
    return;
  }

  const text = getRaceText(room.mode, room.raceDurationMs ?? undefined);

  room.status = "racing";
  room.text = text;
  room.countdownSecondsLeft = null;
  room.startedAtMs = Date.now();
  resetPlayersForNewRace(room);
  touchRoom(room);
  emitRoomState(io, room);

  const durationMs = getRaceDurationMs(room);
  room.raceTimeout = setTimeout(() => {
    void finalizeRoom(io, room).catch((error) => {
      console.error("[socket] finalizeRoom failed", error);
    });
  }, durationMs);

  io.to(room.id).emit("race:started", {
    room: toRoomState(room),
    startedAtMs: room.startedAtMs,
    durationMs
  });
}

function ensureWaitingStateForReplay(room: RoomRuntime): void {
  if (room.status !== "finished") {
    return;
  }

  room.status = "waiting";
  room.countdownSecondsLeft = null;
  room.text = null;
  room.startedAtMs = null;
  resetPlayersForNewRace(room);
}

export function createSocketServer(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: [env.CORS_ORIGIN],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = readAccessToken(socket);
      if (!token) {
        next(new Error("UNAUTHORIZED"));
        return;
      }

      const payload = verifyAccessToken(token);
      const user = await UserModel.findById(payload.sub).select({ username: 1 }).lean();
      if (!user) {
        next(new Error("UNAUTHORIZED"));
        return;
      }

      socket.data = {
        userId: payload.sub,
        username: user.username,
        role: payload.role
      } satisfies SocketIdentity;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    const identity = socket.data as SocketIdentity;
    socket.emit("race:welcome", { userId: identity.userId, username: identity.username });

    socket.on("race:create_room", (rawInput: unknown) => {
      const parsed = multiplayerCreateRoomSchema.safeParse(rawInput);
      if (!parsed.success) {
        emitSocketError(socket, "VALIDATION_ERROR", "Invalid room settings");
        return;
      }

      const raceDurationMs = resolveRoomDurationMs(parsed.data.mode, parsed.data.customDurationMs);
      if (parsed.data.mode === "timed_custom" && raceDurationMs === null) {
        emitSocketError(socket, "VALIDATION_ERROR", "Custom duration is required");
        return;
      }

      detachSocketFromRoom(io, socket);

      const room = createRoom(parsed.data.mode, identity, raceDurationMs);
      rooms.set(room.id, room);
      attachPlayerToRoom(room, identity, socket.id);
      touchRoom(room);

      socket.join(room.id);
      socketRoom.set(socket.id, room.id);
      emitRoomState(io, room);
    });

    socket.on("race:join_room", (rawInput: unknown) => {
      const parsed = multiplayerJoinRoomSchema.safeParse(rawInput);
      if (!parsed.success) {
        emitSocketError(socket, "VALIDATION_ERROR", "Invalid room id");
        return;
      }

      const room = rooms.get(parsed.data.roomId);
      if (!room) {
        emitSocketError(socket, "ROOM_NOT_FOUND", "Room does not exist");
        return;
      }

      if (room.status === "racing") {
        emitSocketError(socket, "RACE_IN_PROGRESS", "Cannot join while race is running");
        return;
      }

      if (!room.players.has(identity.userId) && room.players.size >= MAX_PLAYERS_PER_ROOM) {
        emitSocketError(socket, "ROOM_FULL", "Room is full");
        return;
      }

      detachSocketFromRoom(io, socket);

      attachPlayerToRoom(room, identity, socket.id);
      socket.join(room.id);
      socketRoom.set(socket.id, room.id);
      touchRoom(room);
      emitRoomState(io, room);
    });

    socket.on("race:leave_room", () => {
      detachSocketFromRoom(io, socket);
    });

    socket.on("race:set_ready", (rawInput: unknown) => {
      const parsed = multiplayerReadySchema.safeParse(rawInput);
      if (!parsed.success) {
        emitSocketError(socket, "VALIDATION_ERROR", "Invalid ready payload");
        return;
      }

      const roomId = socketRoom.get(socket.id);
      if (!roomId) {
        emitSocketError(socket, "NOT_IN_ROOM", "Join a room first");
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        emitSocketError(socket, "ROOM_NOT_FOUND", "Room no longer exists");
        return;
      }

      if (room.status === "racing") {
        emitSocketError(socket, "RACE_IN_PROGRESS", "Cannot change ready state mid-race");
        return;
      }

      ensureWaitingStateForReplay(room);

      const player = room.players.get(identity.userId);
      if (!player) {
        emitSocketError(socket, "NOT_IN_ROOM", "Join a room first");
        return;
      }

      player.ready = parsed.data.ready;
      touchRoom(room);
      emitRoomState(io, room);

      if (room.status === "countdown" && !playersReadyForRace(room)) {
        clearCountdownTimer(room);
        room.status = "waiting";
        room.countdownSecondsLeft = null;
        touchRoom(room);
        emitRoomState(io, room);
        return;
      }

      if (canStartCountdown(room)) {
        startCountdown(io, room);
      }
    });

    socket.on("race:progress", (rawInput: unknown) => {
      const parsed = multiplayerProgressSchema.safeParse(rawInput);
      if (!parsed.success) {
        emitSocketError(socket, "VALIDATION_ERROR", "Invalid progress payload");
        return;
      }

      const roomId = socketRoom.get(socket.id);
      if (!roomId) {
        emitSocketError(socket, "NOT_IN_ROOM", "Join a room first");
        return;
      }

      const room = rooms.get(roomId);
      if (!room || room.status !== "racing" || !room.text) {
        return;
      }

      const player = room.players.get(identity.userId);
      if (!player || player.persisted) {
        return;
      }

      const elapsedMs =
        room.raceDurationMs !== null
          ? Math.min(parsed.data.elapsedMs, room.raceDurationMs)
          : Math.min(parsed.data.elapsedMs, FIXED_MODE_TIMEOUT_MS);

      player.typed = parsed.data.typed.slice(0, room.text.content.length);
      const score = computeTypingScore({
        prompt: room.text.content,
        typed: player.typed,
        durationMs: elapsedMs
      });
      player.progress = score.progress;
      player.wpm = score.wpm;
      player.accuracy = score.accuracy;
      touchRoom(room);
      emitRoomState(io, room);
    });

    socket.on("race:finish", async (rawInput: unknown) => {
      const parsed = multiplayerFinishSchema.safeParse(rawInput);
      if (!parsed.success) {
        emitSocketError(socket, "VALIDATION_ERROR", "Invalid finish payload");
        return;
      }

      const roomId = socketRoom.get(socket.id);
      if (!roomId) {
        emitSocketError(socket, "NOT_IN_ROOM", "Join a room first");
        return;
      }

      const room = rooms.get(roomId);
      if (!room || room.status !== "racing" || !room.text) {
        return;
      }

      const player = room.players.get(identity.userId);
      if (!player || player.persisted) {
        return;
      }

      player.typed = parsed.data.typed.slice(0, room.text.content.length);

      const elapsedMs =
        room.raceDurationMs !== null
          ? Math.min(parsed.data.elapsedMs, room.raceDurationMs)
          : Math.min(parsed.data.elapsedMs, FIXED_MODE_TIMEOUT_MS);

      try {
        await finalizePlayerResult(room, player, elapsedMs, elapsedMs);
        touchRoom(room);
        emitRoomState(io, room);

        if (allPlayersFinished(room)) {
          await finalizeRoom(io, room);
        }
      } catch {
        emitSocketError(socket, "FINISH_FAILED", "Unable to finalize race result");
      }
    });

    socket.on("disconnect", () => {
      detachSocketFromRoom(io, socket);
    });
  });

  return io;
}
