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
});
