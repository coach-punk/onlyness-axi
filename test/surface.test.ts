import { describe, expect, it } from "vitest";
import { createSession } from "../src/session/store.js";
import { renderChill } from "../src/surface/chill.js";
import { renderPitch } from "../src/surface/pitch.js";
import { renderWorkshop } from "../src/surface/workshop.js";

function richSession() {
  const s = createSession({ entry: "prune", seedText: "Legacy onboarding deck notes." });
  s.step = "off_axis";
  s.paradoxAck = true;
  s.arena = {
    industry: "Used cars",
    offering: "Car vending tower",
    audience: "First-time buyers",
  };
  s.answers = {
    stand: {
      who: "First-time buyers",
      job: "Buy a car without dealer pressure",
      solved: "Pick online and retrieve from a glass tower",
    },
    axis: {
      leftPole: "Sketchy curb lot",
      rightPole: "Discount warehouse",
      scale: "Sketchy curb lot to Discount warehouse",
      selfX: 70,
      place: "Position 70/100",
      rivals: [
        { id: "r1", label: "Metro Auto", x: 42 },
        { id: "r2", label: "Honest Bob", x: 75 },
      ],
      ifWin: "Margin compression on the same lot",
    },
    off_axis: {
      axisLabel: "Vending theater pickup",
      territory: "Glass vending tower experience",
      selfX: 65,
      selfY: 85,
    },
  };
  s.statement = "I am the only car retailer that sells cars from a vending machine";
  s.truthmode = {
    verdict: "pass",
    checks: [],
    swap: "Honest Bob claims a vending machine despite running a gravel lot.",
    itch: "Eliminates negotiation dread",
    sticky: "Glass car vending tower",
    jackBlack: "Traditional dealerships sound absurd making that claim",
    cuts: ["Haggling desks", "Paper finance folders"],
  };
  return s;
}

describe("narrated spatial surface templates", () => {
  it("renders Kiln workshop stage with interactive 1D/2D SVGs, narrator, and revise controls", () => {
    const html = renderWorkshop(richSession(), { live: false, token: "" });
    expect(html).toContain("Hallmark");
    expect(html).toContain("--color-paper");
    expect(html).toContain("Boska");
    expect(html).toContain("svg-axis-1d");
    expect(html).toContain("svg-off-axis-2d");
    expect(html).toContain("paradox-svg");
    expect(html).toContain("narrator-voice-select");
    expect(html).toContain("aria-live=\"polite\"");
    expect(html).toContain("en-GB");
    expect(html).toContain("btn-brad-toggle");
    expect(html).toContain("btn-brad-speak");
    expect(html).toContain("btn-add-cut");
    expect(html).toContain("btn-revise-off-axis");
    expect(html).toContain("btn-copy-submit");
    expect(html).toContain('id="tm-swap"');
    expect(html).toContain('id="btn-gen-swap"');
    expect(html).toContain('id="btn-speak-swap"');
    expect(html).toContain('id="btn-run-truthmode-check"');
    expect(html).toContain('id="step-feedback"');
    expect(html).toContain('<link rel="icon"');
    expect(html).not.toMatch(/\/api\/submit/);
    expect(html).not.toMatch(/\/api\/session/);

    // Strip script/style to assert zero em/en dashes in visible HTML prose
    const visible = html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "");
    expect(visible).not.toMatch(/[—–]/);
  });

  it("uses authenticated token paths and EventSource in live mode", () => {
    const html = renderWorkshop(richSession(), { live: true, token: "tok_secret_123" });
    expect(html).toContain("tok_secret_123");
    expect(html).toContain("EventSource");
    expect(html).toContain("/stream");
    expect(html).not.toMatch(/fetch\(["']\/api\/submit/);
  });

  it("renders pitch deliverable with real rivals, swap, cuts, and zero canned boilerplate", () => {
    const html = renderPitch(richSession());
    expect(html).toContain('data-role="statement-open"');
    expect(html).toContain('data-role="statement-close"');
    expect(html).toContain("Metro Auto");
    expect(html).toContain("Honest Bob");
    expect(html).toContain("Haggling desks");
    expect(html).toContain("Honest Bob claims a vending machine");
    expect(html).toContain("btn-narrate-pitch");
    expect(html).toContain('<link rel="icon"');
    expect(html).not.toContain("Keep restating");
    expect(html).not.toContain("fizzy-water race");
  });

  it("renders chill pause room cleanly for standalone and live modes", () => {
    const s = richSession();
    const standalone = renderChill(s, "Step away for tea.", { live: false, token: "" });
    expect(standalone).toContain("You are permitted to stop.");
    expect(standalone).toContain('<link rel="icon"');
    expect(standalone).toContain("btn-copy-resume");
    expect(standalone).not.toContain('id="btn-resume-live"');

    const live = renderChill(s, "Step away for tea.", { live: true, token: "tok_abc" });
    expect(live).toContain('id="btn-resume-live"');
    expect(live).toContain("tok_abc");
  });

  it("emits syntactically valid embedded JS scripts without eaten escapes", () => {
    const s = richSession();
    const pages = [
      { name: "workshop-standalone", html: renderWorkshop(s, { live: false, token: "" }) },
      { name: "workshop-live", html: renderWorkshop(s, { live: true, token: "tok_secret_123" }) },
      { name: "pitch", html: renderPitch(s) },
      { name: "chill-live", html: renderChill(s, "Rest", { live: true, token: "tok_abc" }) },
    ];

    for (const page of pages) {
      const scripts = [
        ...page.html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi),
      ]
        .filter((m) => !/type\s*=\s*["']application\/json/i.test(m[0]))
        .map((m) => m[1]!);

      expect(scripts.length).toBeGreaterThan(0);
      for (const code of scripts) {
        expect(() => new Function(code)).not.toThrow();
        expect(code).not.toMatch(/\x08/);
      }

      if (page.name.startsWith("workshop")) {
        const joined = scripts.join("\n");
        expect(joined).toContain('cuts.join("\\n")');
        expect(joined).toContain("/\\s+/");
      }
    }
  });
});
