import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getPlaybook } from "../src/playbooks/index.js";
import { startServer } from "../src/server/http.js";
import {
  applyHumanSubmit,
  canAdvance,
  satisfactionComplete,
} from "../src/session/steps.js";
import { createSession, saveSession } from "../src/session/store.js";
import { renderPitch } from "../src/surface/pitch.js";

describe("chill pause via live server", () => {
  let root: string;
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (close) await close();
    close = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("blocks submit while paused, serves chill room at /s/:token/, and resume restores active", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-chill-"));
    let session = createSession({});
    session = { ...session, status: "paused", chillReason: "Rest first" };
    saveSession(root, session);

    const srv = await startServer({
      rootDir: root,
      sessionId: session.id,
      port: 0,
    });
    close = srv.close;

    const blocked = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/submit`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `http://127.0.0.1:${srv.port}`,
        },
        body: JSON.stringify({ paradoxAck: true }),
      },
    );
    expect(blocked.status).toBe(409);

    const home = await fetch(`http://127.0.0.1:${srv.port}/s/${srv.token}/`);
    expect(home.status).toBe(200);
    const homeHtml = await home.text();
    expect(homeHtml).toContain("You are permitted to stop.");

    const resumed = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/resume`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `http://127.0.0.1:${srv.port}`,
        },
        body: "{}",
      },
    );
    expect(resumed.status).toBe(200);

    const ok = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/submit`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `http://127.0.0.1:${srv.port}`,
        },
        body: JSON.stringify({ paradoxAck: true }),
      },
    );
    expect(ok.status).toBe(200);
  });
});

describe("pitch gate and render", () => {
  it("blocks advance on pitch until satisfaction and swap are complete", () => {
    let s = createSession({});
    s = {
      ...s,
      step: "pitch",
      statement: "I am the only car retailer that sells cars from a vending machine",
      truthmode: {
        verdict: "pass",
        checks: [],
        swap: "rival cannot claim the machine",
        itch: "trust",
        sticky: "vending machine",
        jackBlack: "yes",
        cuts: ["haggling"],
      },
    };
    expect(canAdvance(s).ok).toBe(false);
    s = applyHumanSubmit(s, {
      satisfaction: {
        stand: true,
        axis: true,
        off_axis: true,
        onlyness: true,
        statement: true,
      },
    });
    expect(satisfactionComplete(s.satisfaction)).toBe(true);
    expect(canAdvance(s).ok).toBe(true);
  });

  it("renderPitch bookends statement, walks 4->3->2->1, and renders cuts", () => {
    const s = createSession({});
    s.statement = "I am the only bakery that bakes at midnight";
    s.answers = {
      stand: { who: "shift workers", job: "hot bread after shift", solved: "warm loaf at 1am" },
      axis: {
        leftPole: "stale rack",
        rightPole: "cheaper bagels",
        scale: "stale rack to cheaper bagels",
        place: "mid",
        ifWin: "margin war",
        rivals: [{ id: "r1", label: "Daytime Loaf", x: 60 }],
      },
      off_axis: { territory: "nocturnal bakery ritual", axisLabel: "Hour of bake", selfX: 50, selfY: 88 },
    };
    s.arena = { industry: "bakery", offering: "midnight sourdough", audience: "night shift" };
    s.truthmode = {
      verdict: "pass",
      checks: [],
      swap: "Daytime Loaf says it bakes at midnight while closing at 5pm",
      itch: "warm bread at 1am",
      sticky: "midnight oven window",
      jackBlack: "daytime bakeries cannot stay open",
      cuts: ["Morning pastries"],
    };
    const html = renderPitch(s);
    expect(html).toContain('data-role="statement-open"');
    expect(html).toContain('data-role="statement-close"');
    expect(html).toContain("Daytime Loaf");
    expect(html).toContain("Morning pastries");
    const i4 = html.indexOf('data-step="4"');
    const i3 = html.indexOf('data-step="3"');
    const i2 = html.indexOf('data-step="2"');
    const i1 = html.indexOf('data-step="1"');
    expect(i4).toBeLessThan(i3);
    expect(i3).toBeLessThan(i2);
    expect(i2).toBeLessThan(i1);
  });
});

describe("coach playbook rules", () => {
  it("mentions offer-chill, revise, and no permanent escape hatch", () => {
    const text = getPlaybook("coach");
    expect(text).toBeTruthy();
    expect(text!).toContain("offer-chill");
    expect(text!).toContain("revise");
    expect(text!.toLowerCase()).toMatch(/escape hatch/);
  });
});
