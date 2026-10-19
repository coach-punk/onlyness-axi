import { describe, expect, it } from "vitest";
import { runRubric } from "../src/truthmode/rubric.js";

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

  it("passes a paradigm-shaped line", () => {
    const r = runRubric(
      "I am the only car retailer that sells cars from a vending machine",
    );
    expect(r.verdict).toBe("pass");
  });
});
