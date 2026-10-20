import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendEvent,
  readEventsSince,
  tailEvents,
} from "../src/server/events.js";
import {
  createSession,
  loadSession,
  saveSession,
  saveSessionAtomic,
} from "../src/session/store.js";

describe("durable events and atomic store", () => {
  let root: string;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("appends events with strictly incrementing seq", () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-events-"));
    const session = createSession({});
    saveSession(root, session);

    const ev1 = appendEvent(root, session.id, "submit", { step: "paradox" });
    expect(ev1.seq).toBe(1);
    expect(ev1.type).toBe("submit");

    const ev2 = appendEvent(root, session.id, "need_coach", { reason: "help" });
    expect(ev2.seq).toBe(2);
    expect(ev2.type).toBe("need_coach");

    const ev3 = appendEvent(root, session.id, "weak_advance", {});
    expect(ev3.seq).toBe(3);

    const all = readEventsSince(root, session.id, 0);
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.seq)).toEqual([1, 2, 3]);

    const since2 = readEventsSince(root, session.id, 2);
    expect(since2).toHaveLength(1);
    expect(since2[0].seq).toBe(3);
  });

  it("tailEvents resolves immediately if event exists after sinceSeq", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-events-"));
    const session = createSession({});
    saveSession(root, session);

    appendEvent(root, session.id, "submit", { turn: 1 });
    const ev = await tailEvents(root, session.id, 0, 1000);
    expect(ev).not.toBeNull();
    expect(ev?.seq).toBe(1);
  });

  it("tailEvents waits and resolves when event is appended later", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-events-"));
    const session = createSession({});
    saveSession(root, session);

    const pending = tailEvents(root, session.id, 0, 2000);
    setTimeout(() => {
      appendEvent(root, session.id, "submit", { turn: 1 });
    }, 100);

    const ev = await pending;
    expect(ev).not.toBeNull();
    expect(ev?.seq).toBe(1);
  });

  it("tailEvents returns null on timeout", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-events-"));
    const session = createSession({});
    saveSession(root, session);

    const ev = await tailEvents(root, session.id, 0, 150);
    expect(ev).toBeNull();
  });

  it("saveSessionAtomic increments version and preserves session", () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-store-"));
    const session = createSession({});
    expect(session.version).toBe(1);

    saveSessionAtomic(root, session);
    const loaded1 = loadSession(root, session.id);
    expect(loaded1.version).toBe(1);

    loaded1.paradoxAck = true;
    saveSessionAtomic(root, loaded1);
    const loaded2 = loadSession(root, session.id);
    expect(loaded2.version).toBe(2);
    expect(loaded2.paradoxAck).toBe(true);
  });
});
