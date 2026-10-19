export type HumanEventType = "submit" | "need_coach" | "weak_advance";

export type HumanEvent = {
  type: HumanEventType;
  at: string;
  payload: Record<string, unknown>;
};

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

/** Clear in-memory bus state (for tests). */
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
