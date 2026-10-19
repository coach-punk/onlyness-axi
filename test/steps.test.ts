// test/steps.test.ts
import { describe, expect, it } from "vitest";
import { createSession } from "../src/session/store.js";
import {
  advanceSession,
  applyHumanSubmit,
  canAdvance,
  nextStep,
} from "../src/session/steps.js";

describe("steps", () => {
  it("blocks advance from paradox until ack", () => {
    const s = createSession({});
    expect(canAdvance(s).ok).toBe(false);
    s.paradoxAck = true;
    // still need arena before leaving arena step — paradox advances to arena
    expect(nextStep("paradox")).toBe("arena");
  });

  it("requires arena fields before leaving arena", () => {
    const s = createSession({});
    s.step = "arena";
    s.paradoxAck = true;
    expect(canAdvance(s).ok).toBe(false);
    s.arena = { industry: "autos", offering: "car vending", audience: "buyers" };
    expect(canAdvance(s).ok).toBe(true);
  });

  it("advanceSession moves paradox to arena after ack", () => {
    const s = createSession({});
    const withAck = applyHumanSubmit(s, { paradoxAck: true });
    const next = advanceSession(withAck);
    expect(next.step).toBe("arena");
    expect(next.coachBudget).toEqual({ used: 0, max: 3, lastJob: null });
    expect(next.weakAdvance).toBe(false);
  });

  it("applyHumanSubmit merges arena fields immutably", () => {
    const s = createSession({});
    const next = applyHumanSubmit(s, { arena: { industry: "autos" } });
    expect(next.arena).toEqual({
      industry: "autos",
      offering: "",
      audience: "",
    });
    expect(s.arena.industry).toBe("");
    expect(next.coachLog).toHaveLength(1);
    expect(next.coachLog[0]?.role).toBe("human");
  });

  it("requires statement before truthmode advance to done", () => {
    const s = createSession({});
    s.step = "truthmode";
    s.statement = "I am the only X that Y";
    s.truthmode = {
      verdict: "pass",
      checks: [],
      swap: "rival cannot claim",
      itch: "a",
      sticky: "b",
      jackBlack: "c",
      cuts: [],
    };
    expect(canAdvance(s).ok).toBe(true);
  });
});
