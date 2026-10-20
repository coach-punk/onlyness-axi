import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sessionDir } from "../session/store.js";

export type HumanEventType =
  | "submit"
  | "need_coach"
  | "weak_advance"
  | "chill_accept"
  | "chill_resume";

export type HumanEvent = {
  seq: number;
  type: HumanEventType;
  at: string;
  payload: Record<string, unknown>;
};

export function eventsFilePath(rootDir: string, sessionId: string): string {
  return join(sessionDir(rootDir, sessionId), "events.jsonl");
}

export function readEventsSince(
  rootDir: string,
  sessionId: string,
  sinceSeq: number,
): HumanEvent[] {
  const filePath = eventsFilePath(rootDir, sessionId);
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf8");
  const lines = content.trim().split("\n");
  const events: HumanEvent[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line) as HumanEvent;
      if (typeof ev.seq === "number" && ev.seq > sinceSeq) {
        events.push(ev);
      }
    } catch {
      // Ignore malformed line
    }
  }
  return events;
}

export function appendEvent(
  rootDir: string,
  sessionId: string,
  type: HumanEventType,
  payload: Record<string, unknown>,
): HumanEvent {
  const dir = sessionDir(rootDir, sessionId);
  mkdirSync(dir, { recursive: true });
  const filePath = eventsFilePath(rootDir, sessionId);

  let nextSeq = 1;
  if (existsSync(filePath)) {
    const existing = readEventsSince(rootDir, sessionId, 0);
    if (existing.length > 0) {
      nextSeq = existing[existing.length - 1].seq + 1;
    }
  }

  const event: HumanEvent = {
    seq: nextSeq,
    type,
    at: new Date().toISOString(),
    payload,
  };

  appendFileSync(filePath, JSON.stringify(event) + "\n", "utf8");

  // Also notify in-memory bus for in-process fast path
  pushEvent(sessionId, event);

  return event;
}

export function tailEvents(
  rootDir: string,
  sessionId: string,
  sinceSeq: number,
  timeoutMs: number,
): Promise<HumanEvent | null> {
  // Check immediately
  const existing = readEventsSince(rootDir, sessionId, sinceSeq);
  if (existing.length > 0) {
    return Promise.resolve(existing[0]);
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const events = readEventsSince(rootDir, sessionId, sinceSeq);
      if (events.length > 0) {
        clearInterval(interval);
        resolve(events[0]);
        return;
      }
      if (Date.now() - startTime >= timeoutMs) {
        clearInterval(interval);
        resolve(null);
      }
    }, 100);
  });
}

// -------------------------------------------------------------
// In-memory bus compatibility (for tests and in-process notifications)
// -------------------------------------------------------------

type Waiter = {
  resolve: (event: HumanEvent | null) => void;
  timer: ReturnType<typeof setTimeout>;
};

type Bus = {
  events: HumanEvent[];
  waiters: Waiter[];
};

const buses = new Map<string, Bus>();

function getBus(sessionId: string): Bus {
  let bus = buses.get(sessionId);
  if (!bus) {
    bus = { events: [], waiters: [] };
    buses.set(sessionId, bus);
  }
  return bus;
}

export function pushEvent(sessionId: string, event: HumanEvent): void {
  const bus = getBus(sessionId);
  bus.events.push(event);
  const waiters = bus.waiters.splice(0);
  for (const w of waiters) {
    clearTimeout(w.timer);
    w.resolve(event);
  }
}

export function waitForEvent(
  sessionId: string,
  timeoutMs: number,
): Promise<HumanEvent | null> {
  const bus = getBus(sessionId);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const i = bus.waiters.findIndex((w) => w.resolve === resolve);
      if (i >= 0) bus.waiters.splice(i, 1);
      resolve(null);
    }, timeoutMs);
    bus.waiters.push({ resolve, timer });
  });
}

export function clearEvents(sessionId?: string): void {
  if (sessionId !== undefined) {
    const bus = buses.get(sessionId);
    if (bus) {
      for (const w of bus.waiters) {
        clearTimeout(w.timer);
        w.resolve(null);
      }
      buses.delete(sessionId);
    }
    return;
  }
  for (const id of [...buses.keys()]) {
    clearEvents(id);
  }
}
