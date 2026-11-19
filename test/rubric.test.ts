import { describe, expect, it } from "vitest";
import { parseOnlynessFormula, runRubric } from "../src/truthmode/rubric.js";

describe("runRubric", () => {
  it("fails geographic scarcity", () => {
    const r = runRubric(
      "I am the only used car salesman on this whole edge of dealerships",
    );
    expect(r.verdict).toBe("fail");
    expect(r.checks.some((c) => c.id === "geo")).toBe(true);
  });

  it("fails better-axis cosplay", () => {
    const r = runRubric("I am the only CRM that is faster and cheaper");
    expect(r.verdict).toBe("fail");
    expect(r.checks.some((c) => c.id === "better_axis")).toBe(true);
  });

  it("allows negated better-axis contrast clauses", () => {
    const r = runRubric(
      "I am the only car retailer that refuses to compete on cheaper prices and delivers from a vending tower",
      { industry: "autos", offering: "car retail", audience: "buyers" },
    );
    expect(r.checks.some((c) => c.id === "better_axis")).toBe(false);
    expect(r.verdict).toBe("pass");
  });

  it("does not fail concise valid statements under 40 chars after prefix", () => {
    const r = runRubric("I am the only airline with open seating", {
      industry: "airlines",
      offering: "commercial air travel",
      audience: "travelers",
    });
    expect(r.verdict).toBe("pass");
  });

  it("fails category restatement with no novel differentiator", () => {
    const r = runRubric("We are the only bakery that sells fresh bakery goods", {
      industry: "bakery",
      offering: "fresh bakery goods",
      audience: "locals",
    });
    expect(r.verdict).toBe("fail");
    expect(r.checks.some((c) => c.id === "category_restate")).toBe(true);
  });

  it("flags generic marketing puffery as find_replace weak", () => {
    const r = runRubric(
      "Our brand is the only SaaS that provides modern innovative quality solutions",
      { industry: "SaaS", offering: "software", audience: "teams" },
    );
    expect(r.verdict).toBe("weak");
    expect(r.checks.some((c) => c.id === "find_replace")).toBe(true);
  });

  it("parses multiple brand prefixes", () => {
    const p1 = parseOnlynessFormula("We are the only studio that ships nocturnal builds");
    expect(p1.matchedPrefix).toBe(true);
    expect(p1.category).toBe("studio");
    expect(p1.connector).toBe("that");
    expect(p1.differentiator).toBe("ships nocturnal builds");

    const p2 = parseOnlynessFormula("Acme is the only bakery that bakes at midnight");
    expect(p2.matchedPrefix).toBe(true);
    expect(p2.category).toBe("bakery");
  });
});
