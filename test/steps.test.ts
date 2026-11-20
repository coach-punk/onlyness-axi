// test/steps.test.ts
import { describe, expect, it } from "vitest";
import { createSession } from "../src/session/store.js";
import {
  advanceSession,
  applyHumanSubmit,
  canAdvance,
  nextStep,
  reviseStep,
} from "../src/session/steps.js";

describe("steps", () => {
  it("blocks advance from paradox until ack and blocks weakAdvance on Act 0", () => {
    const s = createSession({});
    expect(canAdvance(s).ok).toBe(false);
    s.weakAdvance = true;
    expect(canAdvance(s).ok).toBe(false);
    s.paradoxAck = true;
    expect(canAdvance(s).ok).toBe(true);
    expect(nextStep("paradox")).toBe("arena");
  });

  it("requires arena fields before leaving arena even if weakAdvance is set", () => {
    const s = createSession({});
    s.step = "arena";
    s.paradoxAck = true;
    s.weakAdvance = true;
    expect(canAdvance(s).ok).toBe(false);
    s.arena = { industry: "autos", offering: "car vending", audience: "buyers" };
    expect(canAdvance(s).ok).toBe(true);
  });

  it("derives axis scale/place from poles and selfX and clamps coords", () => {
    let s = createSession({});
    s.step = "axis";
    s = applyHumanSubmit(s, {
      answers: {
        axis: {
          leftPole: "Slow quotes",
          rightPole: "Instant quote",
          selfX: 140,
          rivals: [{ id: "r1", label: "Rival A", x: -20 }],
          ifWin: "Commodity price race",
        },
      },
    });
    expect(s.answers.axis?.selfX).toBe(100);
    expect(s.answers.axis?.rivals?.[0]?.x).toBe(0);
    expect(s.answers.axis?.scale).toBe("Slow quotes to Instant quote");
    expect(s.answers.axis?.place).toBe("Position 100/100");
    expect(canAdvance(s).ok).toBe(true);
  });

  it("invalidates stale truthmode verdict when statement changes", () => {
    let s = createSession({});
    s.step = "onlyness";
    s.statement = "I am the only X that Y";
    s.truthmode = {
      verdict: "fail",
      checks: [{ id: "geo", severity: "fail", detail: "geo" }],
      swap: "old swap",
      itch: "a",
      sticky: "b",
      jackBlack: "c",
      cuts: [],
    };
    s = applyHumanSubmit(s, {
      statement: "I am the only Z that transforms rituals",
    });
    expect(s.truthmode?.verdict).toBeNull();
    expect(s.truthmode?.checks).toEqual([]);
  });

  it("requires Pass 2 swap alongside itch/sticky/jackBlack on truthmode", () => {
    const s = createSession({});
    s.step = "truthmode";
    s.statement = "I am the only car retailer that sells cars from a vending machine";
    s.truthmode = {
      verdict: "pass",
      checks: [],
      swap: "",
      itch: "a",
      sticky: "b",
      jackBlack: "c",
      cuts: [],
    };
    expect(canAdvance(s).ok).toBe(false);
    s.truthmode.swap = "rival sounds absurd";
    expect(canAdvance(s).ok).toBe(true);
  });

  it("weakAdvance unlocks stand when answers incomplete but never done or pitch", () => {
    const s = createSession({});
    s.step = "stand";
    s.coachBudget = { used: 3, max: 3, lastJob: "mirror" };
    expect(canAdvance(s).ok).toBe(false);
    s.weakAdvance = true;
    expect(canAdvance(s).ok).toBe(true);
    const next = advanceSession(s);
    expect(next.step).toBe("axis");
    expect(next.weakAdvance).toBe(false);

    s.step = "done";
    expect(canAdvance(s).ok).toBe(false);
  });

  it("resets coach budget on substantive change, not on ack/weak/humanMessage-only", () => {
    let s = createSession({});
    s.step = "stand";
    s.coachBudget = { used: 2, max: 3, lastJob: "ground" };
    s = applyHumanSubmit(s, { humanMessage: "Why does who matter?" });
    expect(s.coachBudget.used).toBe(2);
    expect(s.coachLog.at(-1)?.text).toBe("Why does who matter?");

    s = applyHumanSubmit(s, {
      answers: { stand: { who: "buyers", job: "skip lot", solved: "car arrives" } },
    });
    expect(s.coachBudget).toEqual({ used: 0, max: 3, lastJob: null });
  });

  it("reviseStep transitions back cleanly, preserves work, and clears downstream satisfaction", () => {
    let s = createSession({});
    s.step = "truthmode";
    s.statement = "I am the only weak draft";
    s.coachBudget = { used: 3, max: 3, lastJob: "mirror" };
    s.weakAdvance = true;
    s.satisfaction = {
      stand: true,
      axis: true,
      off_axis: true,
      onlyness: true,
      statement: true,
    };

    const revised = reviseStep(s, "off_axis");
    expect(revised.step).toBe("off_axis");
    expect(revised.statement).toBe("I am the only weak draft");
    expect(revised.coachBudget).toEqual({ used: 0, max: 3, lastJob: null });
    expect(revised.weakAdvance).toBe(false);
    expect(revised.satisfaction.stand).toBe(true);
    expect(revised.satisfaction.axis).toBe(true);
    expect(revised.satisfaction.off_axis).toBe(false);
    expect(revised.satisfaction.onlyness).toBe(false);
    expect(revised.satisfaction.statement).toBe(false);

    expect(() => reviseStep(s, "done")).toThrow();
  });

  it("auto-computes Pass 1 rubric when advancing from onlyness to truthmode and keeps fail blocking pitch", () => {
    const passSession = createSession({});
    passSession.step = "onlyness";
    passSession.arena = {
      industry: "Used car retail",
      offering: "Online used-car sales",
      audience: "First-time buyers",
    };
    passSession.statement =
      "I am the only car retailer that sells cars from a vending machine";

    const atTruthmode = advanceSession(passSession);
    expect(atTruthmode.step).toBe("truthmode");
    expect(atTruthmode.truthmode?.verdict).toBe("pass");

    const failSession = createSession({});
    failSession.step = "onlyness";
    failSession.arena = passSession.arena;
    failSession.statement = "I am the only car retailer that is faster and cheaper";

    const failedTruthmode = advanceSession(failSession);
    expect(failedTruthmode.step).toBe("truthmode");
    expect(failedTruthmode.truthmode?.verdict).toBe("fail");

    failedTruthmode.truthmode = {
      ...failedTruthmode.truthmode!,
      swap: "Metro Auto says the exact same thing.",
      itch: "Dealer haggling",
      sticky: "Fast car deals",
      jackBlack: "No resistance",
    };
    const gate = canAdvance(failedTruthmode);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toContain("truthmode failed");
  });
});
