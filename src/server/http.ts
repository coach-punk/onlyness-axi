import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pauseSession } from "../commands/chill.js";
import { resumeSession } from "../commands/resume.js";
import { applyHumanSubmit, type HumanSubmitPayload } from "../session/steps.js";
import { loadSession, saveSession, sessionDir } from "../session/store.js";
import { appendEvent, tailEvents } from "./events.js";

export type StartServerOpts = {
  rootDir: string;
  sessionId: string;
  port?: number;
  token?: string;
};

export type StartedServer = {
  port: number;
  token: string;
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

export async function startServer(opts: StartServerOpts): Promise<StartedServer> {
  const { rootDir, sessionId } = opts;
  const listenPort = opts.port ?? 0;
  const dir = sessionDir(rootDir, sessionId);
  const initialSession = loadSession(rootDir, sessionId);
  const token = opts.token ?? initialSession.authToken;

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const method = req.method ?? "GET";
      const pathname = url.pathname;

      // Extract token from path, header, or query
      let reqToken: string | null = null;
      let effectivePath = pathname;

      // Path token patterns: /s/:token or /s/:token/...
      if (pathname.startsWith("/s/")) {
        const parts = pathname.slice(3).split("/");
        reqToken = parts[0] || null;
        effectivePath = "/" + parts.slice(1).join("/");
        if (effectivePath === "/index.html") effectivePath = "/";
      } else if (pathname.startsWith("/api/")) {
        const parts = pathname.slice(5).split("/");
        // Check if first segment is token or action
        if (parts.length >= 2 && parts[0] === token) {
          reqToken = parts[0];
          effectivePath = "/api/" + parts.slice(1).join("/");
        } else {
          effectivePath = pathname;
        }
      }

      // Check header or query if not in path
      if (!reqToken) {
        const authHeader = req.headers["authorization"];
        if (authHeader && authHeader.startsWith("Bearer ")) {
          reqToken = authHeader.slice(7).trim();
        } else if (typeof req.headers["x-onlyness-token"] === "string") {
          reqToken = req.headers["x-onlyness-token"].trim();
        } else if (url.searchParams.has("token")) {
          reqToken = url.searchParams.get("token");
        }
      }

      // Origin check for state-changing POST requests
      if (method === "POST") {
        const originHeader = req.headers["origin"];
        if (typeof originHeader === "string" && originHeader.trim() !== "") {
          try {
            const originUrl = new URL(originHeader);
            const host = originUrl.hostname;
            if (host !== "127.0.0.1" && host !== "localhost") {
              sendJson(res, 403, { error: "forbidden origin" });
              return;
            }
          } catch {
            sendJson(res, 403, { error: "invalid origin header" });
            return;
          }
        }
      }

      // Surface HTML serving (/s/:token/ or /)
      if (method === "GET" && (pathname.startsWith("/s/") || pathname === "/")) {
        // Enforce token if path was /s/ or if token is required
        if (pathname.startsWith("/s/") && reqToken !== token) {
          sendText(res, 403, "invalid session token", "text/plain; charset=utf-8");
          return;
        }
        if (pathname === "/" && reqToken !== token && token) {
          // If accessing root directly without token, check if token provided
          sendText(res, 403, "token required: access via /s/<token>/", "text/plain; charset=utf-8");
          return;
        }

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

      // Pitch deliverable
      if (method === "GET" && (effectivePath === "/pitch" || pathname === "/pitch")) {
        if (reqToken !== token && token) {
          sendText(res, 403, "forbidden", "text/plain; charset=utf-8");
          return;
        }
        const pitchPath = join(dir, "pitch.html");
        if (!existsSync(pitchPath)) {
          sendText(res, 404, "pitch.html not found", "text/plain; charset=utf-8");
          return;
        }
        sendText(res, 200, readFileSync(pitchPath, "utf8"), "text/html; charset=utf-8");
        return;
      }

      // API token authorization
      if (effectivePath.startsWith("/api/")) {
        if (token && reqToken !== token) {
          sendJson(res, 401, { error: "unauthorized: valid session token required" });
          return;
        }
      }

      // GET /api/session
      if (method === "GET" && effectivePath === "/api/session") {
        const session = loadSession(rootDir, sessionId);
        sendJson(res, 200, session);
        return;
      }

      // POST /api/submit
      if (method === "POST" && effectivePath === "/api/submit") {
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
        const event = appendEvent(rootDir, sessionId, "submit", body);
        sendJson(res, 200, { ok: true, seq: event.seq });
        return;
      }

      // POST /api/need-coach
      if (method === "POST" && effectivePath === "/api/need-coach") {
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
        const event = appendEvent(rootDir, sessionId, "need_coach", body);
        sendJson(res, 200, { ok: true, seq: event.seq });
        return;
      }

      // POST /api/weak-advance
      if (method === "POST" && effectivePath === "/api/weak-advance") {
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
        const event = appendEvent(rootDir, sessionId, "weak_advance", { weakAdvance: true });
        sendJson(res, 200, { ok: true, seq: event.seq });
        return;
      }

      // POST /api/chill (or /api/chill/accept)
      if (method === "POST" && (effectivePath === "/api/chill" || effectivePath === "/api/chill/accept")) {
        const raw = await readBody(req);
        const body = raw.trim() ? parseJsonBody(raw) : {};
        const reason =
          typeof body["reason"] === "string" ? body["reason"] : undefined;
        const session = pauseSession(rootDir, sessionId, reason);
        const event = appendEvent(rootDir, sessionId, "chill_accept", { chill: true, reason: reason ?? "" });
        sendJson(res, 200, { ok: true, status: session.status, seq: event.seq });
        return;
      }

      // POST /api/resume (or /api/chill/resume)
      if (method === "POST" && (effectivePath === "/api/resume" || effectivePath === "/api/chill/resume")) {
        const session = resumeSession(rootDir, sessionId);
        const event = appendEvent(rootDir, sessionId, "chill_resume", { resume: true });
        sendJson(res, 200, { ok: true, status: session.status, seq: event.seq });
        return;
      }

      // GET /api/events (polling endpoint)
      if (method === "GET" && effectivePath === "/api/events") {
        const sinceParam = url.searchParams.get("since") ?? url.searchParams.get("sinceSeq");
        const sinceSeq = sinceParam !== null ? Number(sinceParam) : 0;
        const timeoutRaw = url.searchParams.get("timeoutMs");
        const parsedTimeout = timeoutRaw !== null ? Number(timeoutRaw) : 25_000;
        const timeoutMs =
          Number.isFinite(parsedTimeout) && parsedTimeout >= 0 ? parsedTimeout : 25_000;

        const event = await tailEvents(rootDir, sessionId, sinceSeq, timeoutMs);
        sendJson(res, 200, { event });
        return;
      }

      // GET /api/poll
      if (method === "GET" && effectivePath === "/api/poll") {
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
    token,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
