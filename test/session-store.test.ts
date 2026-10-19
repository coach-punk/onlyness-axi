// test/session-store.test.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSession, listSessions, loadSession, saveSession } from "../src/session/store.js";

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("session store", () => {
  it("creates, saves, loads, and lists a session", () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-"));
    const s = createSession({ entry: "blank" });
    expect(s.step).toBe("paradox");
    expect(s.coachBudget.max).toBe(3);
    saveSession(root, s);
    const loaded = loadSession(root, s.id);
    expect(loaded.id).toBe(s.id);
    expect(listSessions(root)).toHaveLength(1);
  });
});

