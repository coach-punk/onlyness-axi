import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pauseSession } from "../commands/chill.js";
import { resumeSession } from "../commands/resume.js";
import { applyHumanSubmit, type HumanSubmitPayload } from "../session/steps.js";
import { loadSession, saveSession, sessionDir } from "../session/store.js";
import { pushEvent, waitForEvent, type HumanEvent, type HumanEventType } from "./events.js";

export type StartServerOpts = {
  rootDir: string;
  sessionId: string;
  port?: number;
};

export type StartedServer = {
  port: number;
  close: () => Promise<void>;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data),
  });
  res.end(data);
}

function sendText(
  res: ServerResponse,
  status: number,
  body: string,
  contentType: string,
): void {
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function parseJsonBody(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function eventOf(
  type: HumanEventType,
  payload: Record<string, unknown>,
): HumanEvent {
  return { type, at: new Date().toISOString(), payload };
}

export async function startServer(opts: StartServerOpts): Promise<StartedServer> {
  const { rootDir, sessionId } = opts;
  const listenPort = opts.port ?? 0;
  const dir = sessionDir(rootDir, sessionId);

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://127.0.0.1`);
      const method = req.method ?? "GET";
      const path = url.pathname;

      if (method === "GET" && path === "/") {
        const session = loadSession(rootDir, sessionId);
        const file =
          session.status === "paused"
            ? join(dir, "chill.html")
            : join(dir, "surface.html");
        if (!existsSync(file)) {
          sendText(
            res,
            404,
            session.status === "paused"
              ? "chill.html not found"
              : "surface.html not found",
            "text/plain; charset=utf-8",
          );
          return;
        }
        const html = readFileSync(file, "utf8");
        sendText(res, 200, html, "text/html; charset=utf-8");
        return;
      }

      if (method === "GET" && path === "/pitch") {
        const pitchPath = join(dir, "pitch.html");
        if (!existsSync(pitchPath)) {
          sendText(res, 404, "pitch.html not found", "text/plain; charset=utf-8");
          return;
        }
        sendText(res, 200, readFileSync(pitchPath, "utf8"), "text/html; charset=utf-8");
        return;
      }

      if (method === "GET" && path === "/api/session") {
        const session = loadSession(rootDir, sessionId);
        sendJson(res, 200, session);
        return;
      }

      if (method === "POST" && path === "/api/submit") {
        let session = loadSession(rootDir, sessionId);
        if (session.status === "paused") {
          sendJson(res, 409, {
            error: "session paused — resume before submitting",
            hint: "POST /api/resume or onlyness-axi resume " + sessionId,
          });
          return;
        }
        const body = parseJsonBody(await readBody(req));
        const payload = body as HumanSubmitPayload;
        session = applyHumanSubmit(session, payload);
        saveSession(rootDir, session);
        pushEvent(sessionId, eventOf("submit", body));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "POST" && path === "/api/need-coach") {
        const session = loadSession(rootDir, sessionId);
        if (session.status === "paused") {
          sendJson(res, 409, {
            error: "session paused — resume before coaching",
            hint: "POST /api/resume or onlyness-axi resume " + sessionId,
          });
          return;
        }
        const raw = await readBody(req);
        const body = raw.trim() ? parseJsonBody(raw) : {};
        pushEvent(sessionId, eventOf("need_coach", body));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "POST" && path === "/api/weak-advance") {
        let session = loadSession(rootDir, sessionId);
        if (session.status === "paused") {
          sendJson(res, 409, {
            error: "session paused — resume first",
            hint: "POST /api/resume or onlyness-axi resume " + sessionId,
          });
          return;
        }
        session = applyHumanSubmit(session, { weakAdvance: true });
        saveSession(rootDir, session);
        pushEvent(sessionId, eventOf("weak_advance", { weakAdvance: true }));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "POST" && path === "/api/chill") {
        const raw = await readBody(req);
        const body = raw.trim() ? parseJsonBody(raw) : {};
        const reason =
          typeof body["reason"] === "string" ? body["reason"] : undefined;
        const session = pauseSession(rootDir, sessionId, reason);
        pushEvent(sessionId, eventOf("submit", { chill: true, reason: reason ?? "" }));
        sendJson(res, 200, { ok: true, status: session.status });
        return;
      }

      if (method === "POST" && path === "/api/resume") {
        const session = resumeSession(rootDir, sessionId);
        pushEvent(sessionId, eventOf("submit", { resume: true }));
        sendJson(res, 200, { ok: true, status: session.status });
        return;
      }

      if (method === "GET" && path === "/api/events") {
        const timeoutRaw = url.searchParams.get("timeoutMs");
        const parsed = timeoutRaw !== null ? Number(timeoutRaw) : 60_000;
        const timeoutMs =
          Number.isFinite(parsed) && parsed >= 0 ? parsed : 60_000;
        const event = await waitForEvent(sessionId, timeoutMs);
        sendJson(res, 200, { event });
        return;
      }

      if (method === "GET" && path === "/api/poll") {
        // Optional long-poll for browser; agents use GET /api/events.
        sendJson(res, 200, { events: [] });
        return;
      }

      sendJson(res, 404, { error: "not found" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 500, { error: message });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(listenPort, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (addr === null || typeof addr === "string") {
    throw new Error("failed to bind server");
  }

  return {
    port: addr.port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
