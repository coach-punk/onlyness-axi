import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { waitForEvent } from "../src/server/events.js";
import { startServer } from "../src/server/http.js";
import { createSession, saveSession } from "../src/session/store.js";

describe("http server", () => {
  let root: string;
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    if (close) await close();
    rmSync(root, { recursive: true, force: true });
  });

  it("accepts submit and wakes waitForEvent", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-"));
    const s = createSession({});
    saveSession(root, s);
    const dir = join(root, s.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "surface.html"), "<html>ok</html>");
    const srv = await startServer({ rootDir: root, sessionId: s.id, port: 0 });
    close = srv.close;
    const pending = waitForEvent(s.id, 2000);
    await fetch(`http://127.0.0.1:${srv.port}/api/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paradoxAck: true }),
    });
    const ev = await pending;
    expect(ev?.type).toBe("submit");
  });
});
