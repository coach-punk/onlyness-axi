import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pushEvent, type HumanEvent, type HumanEventType } from "./events.js";
import { applyHumanSubmit, type HumanSubmitPayload } from "../session/steps.js";
import { loadSession, saveSession, sessionDir } from "../session/store.js";

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
        const surfacePath = join(dir, "surface.html");
        if (!existsSync(surfacePath)) {
          sendText(res, 404, "surface.html not found", "text/plain; charset=utf-8");
          return;
        }
        const html = readFileSync(surfacePath, "utf8");
        sendText(res, 200, html, "text/html; charset=utf-8");
        return;
      }

      if (method === "GET" && path === "/api/session") {
        const session = loadSession(rootDir, sessionId);
        sendJson(res, 200, session);
        return;
      }

      if (method === "POST" && path === "/api/submit") {
        const body = parseJsonBody(await readBody(req));
        const payload = body as HumanSubmitPayload;
        let session = loadSession(rootDir, sessionId);
        session = applyHumanSubmit(session, payload);
        saveSession(rootDir, session);
        pushEvent(sessionId, eventOf("submit", body));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "POST" && path === "/api/need-coach") {
        const raw = await readBody(req);
        const body = raw.trim() ? parseJsonBody(raw) : {};
        pushEvent(sessionId, eventOf("need_coach", body));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "POST" && path === "/api/weak-advance") {
        let session = loadSession(rootDir, sessionId);
        session = applyHumanSubmit(session, { weakAdvance: true });
        saveSession(rootDir, session);
        pushEvent(sessionId, eventOf("weak_advance", { weakAdvance: true }));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "GET" && path === "/api/poll") {
        // Optional long-poll for browser; CLI uses in-process waitForEvent.
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
