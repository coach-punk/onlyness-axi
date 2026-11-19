// test/session-store.test.ts
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSession,
  DEFAULT_WORKED_EXAMPLE,
  listSessions,
  loadSession,
  saveSessionAtomic,
  sessionDir,
} from "../src/session/store.js";

let root: string;
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("session store", () => {
  it("creates, saves atomically, bumps version, loads, and lists a session", () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-"));
    const s = createSession({ entry: "blank" });
    expect(s.step).toBe("paradox");
    expect(s.coachBudget.max).toBe(3);
    expect(s.workedExample.name).toBe(DEFAULT_WORKED_EXAMPLE.name);

    saveSessionAtomic(root, s);
    const loaded1 = loadSession(root, s.id);
    expect(loaded1.id).toBe(s.id);
    expect(loaded1.version).toBe(1);
    expect(listSessions(root)).toHaveLength(1);

    loaded1.paradoxAck = true;
    saveSessionAtomic(root, loaded1);
    const loaded2 = loadSession(root, s.id);
    expect(loaded2.version).toBe(2);
    expect(loaded2.paradoxAck).toBe(true);
  });

  it("backfills legacy session.json missing new Option B fields", () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-legacy-"));
    const id = "s-legacy-1";
    const dir = sessionDir(root, id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "session.json"),
      JSON.stringify({
        id,
        createdAt: "2026-10-19T00:00:00.000Z",
        entry: "blank",
        step: "stand",
        paradoxAck: true,
        arena: { industry: "autos", offering: "cars", audience: "buyers" },
        answers: {},
        statement: "",
        truthmode: null,
        coachLog: [],
        coachBudget: { used: 0, max: 3, lastJob: null },
        status: "active",
      }),
    );

    const loaded = loadSession(root, id);
    expect(loaded.workedExample.name).toBe("Carvana");
    expect(loaded.updatedAt).toBe("2026-10-19T00:00:00.000Z");
    expect(loaded.authToken.length).toBeGreaterThan(8);
    expect(loaded.version).toBe(1);
    expect(loaded.satisfaction.statement).toBe(false);
  });
});
