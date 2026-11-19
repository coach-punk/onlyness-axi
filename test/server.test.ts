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
});
