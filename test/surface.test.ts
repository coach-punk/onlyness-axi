import { describe, expect, it } from "vitest";
import { createSession } from "../src/session/store.js";
import { renderSurface } from "../src/surface/template.js";

describe("surface template", () => {
  it("renders paradox and statement scaffold", () => {
    const html = renderSurface(createSession({}));
    expect(html).toContain("Pepsi Paradox");
    expect(html).toContain("I am the only");
    expect(html).toContain("/api/submit");
  });

  it("includes step section ids for client poll toggle", () => {
    const html = renderSurface(createSession({}));
    for (const id of [
      "sec-paradox",
      "sec-arena",
      "sec-stand",
      "sec-axis",
      "sec-off-axis",
      "sec-onlyness",
      "sec-truthmode",
      "sec-done",
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("STEP_SECS");
    expect(html).toContain("syncStepSections");
    expect(html).toContain("id=\"coach-budget-header\"");
    expect(html).toContain("id=\"coach-budget-aside\"");
  });
});
