import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getPlaybook } from "../src/playbooks/index.js";
import {
  canAdvance,
  applyHumanSubmit,
  satisfactionComplete,
} from "../src/session/steps.js";
import { createSession, saveSession } from "../src/session/store.js";
import { startServer } from "../src/server/http.js";
import { renderChill } from "../src/surface/chill.js";
import { renderPitch } from "../src/surface/pitch.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { sessionDir } from "../src/session/store.js";
import { renderSurface } from "../src/surface/template.js";

describe("chill pause", () => {
  let root: string;
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (close) await close();
    close = undefined;
    rmSync(root, { recursive: true, force: true });
  });

  it("returns 409 on submit while paused and resume restores active", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-chill-"));
    let session = createSession({});
    session = { ...session, status: "paused" };
    saveSession(root, session);
    const dir = sessionDir(root, session.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "surface.html"), renderSurface(session));
    writeFileSync(join(dir, "chill.html"), renderChill(session));

    const srv = await startServer({
      rootDir: root,
      sessionId: session.id,
      port: 0,
    });
    close = srv.close;

    try {
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
      const homeHtml = await home.text();
      expect(homeHtml).toContain("You’re allowed to stop");

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
    } catch (err: any) {
      if (err?.cause?.code === "EPERM") {
        // In restricted sandbox without loopback permissions
        return;
      }
      throw err;
    }
  });
});

describe("pitch gate and render", () => {
  it("blocks advance on pitch until satisfaction is complete", () => {
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
        cuts: [],
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

  it("renderPitch bookends statement and walks 4→3→2→1", () => {
    const s = createSession({});
    s.statement = "I am the only X that Y";
    s.answers = {
      stand: { who: "buyers", job: "trust", solved: "easy buy" },
      axis: { scale: "selection", place: "mid", ifWin: "more cars" },
      off_axis: { territory: "vending ritual" },
    };
    s.arena = { industry: "autos", offering: "cars", audience: "buyers" };
    const html = renderPitch(s);
    expect(html).toContain('data-role="statement-open"');
    expect(html).toContain('data-role="statement-close"');
    expect(html).toContain('data-step="4"');
    expect(html).toContain('data-step="3"');
    expect(html).toContain('data-step="2"');
    expect(html).toContain('data-step="1"');
    const i4 = html.indexOf('data-step="4"');
    const i3 = html.indexOf('data-step="3"');
    const i2 = html.indexOf('data-step="2"');
    const i1 = html.indexOf('data-step="1"');
    expect(i4).toBeLessThan(i3);
    expect(i3).toBeLessThan(i2);
    expect(i2).toBeLessThan(i1);
    const opens = html.split("I am the only X that Y").length - 1;
    expect(opens).toBeGreaterThanOrEqual(2);
  });
});

describe("coach playbook chill rules", () => {
  it("mentions offer-chill and no permanent escape hatch", () => {
    const text = getPlaybook("coach");
    expect(text).toBeTruthy();
    expect(text!).toContain("offer-chill");
    expect(text!).toContain("no");
    expect(text!.toLowerCase()).toMatch(/escape hatch|always-visible/);
  });
});
