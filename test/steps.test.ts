// test/steps.test.ts
import { describe, expect, it } from "vitest";
import { createSession } from "../src/session/store.js";
import { canAdvance, nextStep } from "../src/session/steps.js";

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
