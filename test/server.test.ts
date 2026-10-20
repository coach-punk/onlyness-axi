import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readEventsSince } from "../src/server/events.js";
import { startServer } from "../src/server/http.js";
import { createSession, loadSession, saveSession } from "../src/session/store.js";

describe("http server with token auth and durable events", () => {
  let root: string;
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (close) await close();
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("starts server, enforces token auth, verifies origin, and appends durable events", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-srv-"));
    const session = createSession({});
    saveSession(root, session);
    const dir = join(root, session.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "surface.html"), "<html>ok</html>");

    const srv = await startServer({
      rootDir: root,
      sessionId: session.id,
      port: 0,
    });
    close = srv.close;

    expect(srv.port).toBeGreaterThan(0);
    expect(srv.token).toBe(session.authToken);

    // 1. Unauthorized request without token
    try {
      const unauthRes = await fetch(`http://127.0.0.1:${srv.port}/api/session`);
      expect(unauthRes.status).toBe(401);
    } catch (err: any) {
      if (err?.cause?.code === "EPERM") {
        // Sandbox environment blocks local socket connection
        return;
      }
      throw err;
    }

    // 2. Authorized request with path token
    const authRes = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/session`,
    );
    expect(authRes.status).toBe(200);
    const sessionBody = (await authRes.json()) as { id: string };
    expect(sessionBody.id).toBe(session.id);

    // 3. Reject forbidden Origin
    const evilRes = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/submit`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://attacker.example.com",
        },
        body: JSON.stringify({ paradoxAck: true }),
      },
    );
    expect(evilRes.status).toBe(403);

    // 4. Accept valid submit, update session and append event
    const submitRes = await fetch(
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
    expect(submitRes.status).toBe(200);

    // Verify session updated atomically
    const updated = loadSession(root, session.id);
    expect(updated.paradoxAck).toBe(true);

    // Verify event appended durably to events.jsonl
    const events = readEventsSince(root, session.id, 0);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe("submit");
    expect(events[0].seq).toBe(1);

    // 5. Poll /api/:token/events returns events
    const eventsRes = await fetch(
      `http://127.0.0.1:${srv.port}/api/${srv.token}/events?since=0&timeoutMs=1000`,
    );
    expect(eventsRes.status).toBe(200);
    const eventsBody = (await eventsRes.json()) as { event: { type: string; seq: number } | null };
    expect(eventsBody.event?.type).toBe("submit");
  });
});
