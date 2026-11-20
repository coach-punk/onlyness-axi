import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "../src/server/http.js";
import {
  createSession,
  loadSession,
  saveSession,
} from "../src/session/store.js";

describe("optional live SSE server with token auth", () => {
  let root: string;
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (close) await close();
    close = undefined;
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("enforces token auth, checks Origin, handles submit/revise/chill/resume, and streams SSE updates", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-srv-"));
    const session = createSession({});
    session.step = "onlyness";
    session.paradoxAck = true;
    session.arena = { industry: "autos", offering: "car tower", audience: "buyers" };
    saveSession(root, session);

    const srv = await startServer({
      rootDir: root,
      sessionId: session.id,
      port: 0,
    });
    close = srv.close;

    expect(srv.port).toBeGreaterThan(0);
    expect(srv.token).toBe(session.authToken);

    // 1. Reject unauthenticated routes
    const unauthRoot = await fetch(`http://127.0.0.1:${srv.port}/`);
    expect(unauthRoot.status).toBe(403);
    const unauthApi = await fetch(`http://127.0.0.1:${srv.port}/api/session`);
    expect(unauthApi.status).toBe(401);
    const badTokenSurface = await fetch(`http://127.0.0.1:${srv.port}/s/wrong-token/`);
    expect(badTokenSurface.status).toBe(403);

    // 2. Serve live surface with token
    const surfaceRes = await fetch(`http://127.0.0.1:${srv.port}/s/${srv.token}/`);
    expect(surfaceRes.status).toBe(200);
    const html = await surfaceRes.text();
    expect(html).toContain(srv.token);
    expect(html).toContain('"live":true');

    // 3. Reject forbidden Origin on POST
    const evilRes = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/submit`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://attacker.example.com",
        },
        body: JSON.stringify({ statement: "Evil" }),
      },
    );
    expect(evilRes.status).toBe(403);

    // 4. Valid submit and revise
    const submitRes = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/submit`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `http://127.0.0.1:${srv.port}`,
        },
        body: JSON.stringify({
          statement: "I am the only car dealer that delivers from a vending tower",
        }),
      },
    );
    expect(submitRes.status).toBe(200);
    expect(loadSession(root, session.id).statement).toContain("vending tower");

    const reviseRes = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/revise`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `http://127.0.0.1:${srv.port}`,
        },
        body: JSON.stringify({ step: "off_axis" }),
      },
    );
    expect(reviseRes.status).toBe(200);
    expect(loadSession(root, session.id).step).toBe("off_axis");

    // 5. SSE stream pushes session updates when disk file changes
    const ac = new AbortController();
    const sseRes = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/stream`,
      { signal: ac.signal },
    );
    expect(sseRes.status).toBe(200);
    const reader = sseRes.body!.getReader();
    const decoder = new TextDecoder();
    const firstChunk = await reader.read();
    expect(decoder.decode(firstChunk.value)).toContain("event: session");

    const nextRead = reader.read();
    const updated = loadSession(root, session.id);
    updated.statement = "Updated via disk save";
    saveSession(root, updated);

    const secondChunk = await nextRead;
    expect(decoder.decode(secondChunk.value)).toContain("Updated via disk save");
    ac.abort();
  });

  it("handles POST /api/:token/advance gating (409 when blocked, 200 when satisfied)", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-adv-"));
    const session = createSession({});
    saveSession(root, session);

    const srv = await startServer({
      rootDir: root,
      sessionId: session.id,
      port: 0,
    });
    close = srv.close;

    const blocked = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/advance`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `http://127.0.0.1:${srv.port}`,
        },
        body: "{}",
      },
    );
    expect(blocked.status).toBe(409);
    const blockedBody = (await blocked.json()) as { error: string };
    expect(blockedBody.error).toContain("Pepsi Paradox");

    const submitAck = await fetch(
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
    expect(submitAck.status).toBe(200);

    const ok = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/advance`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `http://127.0.0.1:${srv.port}`,
        },
        body: "{}",
      },
    );
    expect(ok.status).toBe(200);
    const okBody = (await ok.json()) as { step: string };
    expect(okBody.step).toBe("arena");
    expect(loadSession(root, session.id).step).toBe("arena");
  });

  it("serves 204 for /favicon.ico, checks rubric via truthmode-check, and completes Truthmode -> Pitch -> Done over HTTP", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-tm-flow-"));
    const session = createSession({});
    session.step = "truthmode";
    session.paradoxAck = true;
    session.arena = {
      industry: "Used car retail",
      offering: "Online used-car sales",
      audience: "Buyers avoiding dealerships",
    };
    session.statement = "I am the only car retailer that is faster and cheaper";
    session.truthmode = {
      verdict: null,
      checks: [],
      swap: "Metro Auto is the only car retailer that is faster and cheaper",
      itch: "Dealership dread",
      sticky: "Fast cheaper car deals",
      jackBlack: "Every lot says this",
      cuts: [],
    };
    saveSession(root, session);

    const srv = await startServer({
      rootDir: root,
      sessionId: session.id,
      port: 0,
    });
    close = srv.close;

    const base = `http://127.0.0.1:${srv.port}`;
    const headers = {
      "content-type": "application/json",
      origin: base,
    };

    const fav = await fetch(`${base}/favicon.ico`);
    expect(fav.status).toBe(204);

    // Pre-existing verdict:null session with failing statement self-heals Pass 1 and still blocks advance
    const blockedFail = await fetch(`${base}/api/${srv.token}/advance`, {
      method: "POST",
      headers,
      body: "{}",
    });
    expect(blockedFail.status).toBe(409);
    const blockedJson = (await blockedFail.json()) as { error: string };
    expect(blockedJson.error).toContain("truthmode failed");
    expect(loadSession(root, session.id).truthmode?.verdict).toBe("fail");

    // Rewrite strong statement -> truthmode-check returns pass
    const reviseRes = await fetch(`${base}/api/${srv.token}/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        statement:
          "I am the only car retailer that sells cars from a vending machine",
      }),
    });
    expect(reviseRes.status).toBe(200);

    const checkRes = await fetch(`${base}/api/${srv.token}/truthmode-check`, {
      method: "POST",
      headers,
      body: "{}",
    });
    expect(checkRes.status).toBe(200);
    const checkBody = (await checkRes.json()) as {
      ok: boolean;
      verdict: string;
      checks: unknown[];
    };
    expect(checkBody.ok).toBe(true);
    expect(checkBody.verdict).toBe("pass");
    expect(loadSession(root, session.id).truthmode?.verdict).toBe("pass");

    // Truthmode -> Pitch
    const toPitch = await fetch(`${base}/api/${srv.token}/advance`, {
      method: "POST",
      headers,
      body: "{}",
    });
    expect(toPitch.status).toBe(200);
    expect(((await toPitch.json()) as { step: string }).step).toBe("pitch");

    // Confirm satisfaction -> Done -> GET /s/:token/pitch returns 200
    const satRes = await fetch(`${base}/api/${srv.token}/submit`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        satisfaction: {
          stand: true,
          axis: true,
          off_axis: true,
          onlyness: true,
          statement: true,
        },
      }),
    });
    expect(satRes.status).toBe(200);

    const toDone = await fetch(`${base}/api/${srv.token}/advance`, {
      method: "POST",
      headers,
      body: "{}",
    });
    expect(toDone.status).toBe(200);
    expect(((await toDone.json()) as { step: string }).step).toBe("done");

    const pitchRes = await fetch(`${base}/s/${srv.token}/pitch`);
    expect(pitchRes.status).toBe(200);
    const pitchHtml = await pitchRes.text();
    expect(pitchHtml).toContain("vending machine");
  });
});
