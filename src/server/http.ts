import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, watch, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pauseSession } from "../commands/chill.js";
import { resumeSession } from "../commands/resume.js";
import { writeWorkshopFile } from "../commands/session-io.js";
import {
  applyHumanSubmit,
  canAdvance,
  REVISABLE_STEPS,
  reviseStep,
  type HumanSubmitPayload,
} from "../session/steps.js";
import { loadSession, saveSession, sessionDir } from "../session/store.js";
import type { StepId } from "../session/types.js";
import { renderChill } from "../surface/chill.js";
import { renderPitch } from "../surface/pitch.js";
import { renderWorkshop } from "../surface/workshop.js";

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

  const activeStreams = new Set<() => void>();

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const method = req.method ?? "GET";
      const pathname = url.pathname;

      let reqToken: string | null = null;
      let effectivePath = pathname;

      if (pathname.startsWith("/s/")) {
        const parts = pathname.slice(3).split("/");
        reqToken = parts[0] || null;
        effectivePath = "/" + parts.slice(1).join("/");
        if (effectivePath === "/index.html") effectivePath = "/";
      } else if (pathname.startsWith("/api/")) {
        const parts = pathname.slice(5).split("/");
        if (parts.length >= 2 && parts[0] === token) {
          reqToken = parts[0];
          effectivePath = "/api/" + parts.slice(1).join("/");
        } else {
          effectivePath = pathname;
        }
      }

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

      // Workshop / chill HTML route (/s/:token/)
      if (
        method === "GET" &&
        (pathname === "/" || (pathname.startsWith("/s/") && effectivePath === "/"))
      ) {
        if (reqToken !== token) {
          sendText(
            res,
            403,
            pathname.startsWith("/s/")
              ? "invalid session token"
              : "token required: access via /s/<token>/",
            "text/plain; charset=utf-8",
          );
          return;
        }
        const session = loadSession(rootDir, sessionId);
        const html =
          session.status === "paused"
            ? renderChill(session, session.chillReason, { live: true, token })
            : renderWorkshop(session, { live: true, token });
        sendText(res, 200, html, "text/html; charset=utf-8");
        return;
      }

      // Pitch HTML route (/s/:token/pitch or /pitch with token)
      if (
        method === "GET" &&
        (effectivePath === "/pitch" || pathname === "/pitch")
      ) {
        if (reqToken !== token) {
          sendText(res, 403, "forbidden", "text/plain; charset=utf-8");
          return;
        }
        const pitchPath = join(dir, "pitch.html");
        if (!existsSync(pitchPath)) {
          const session = loadSession(rootDir, sessionId);
          if (
            canAdvance({ ...session, step: "pitch" }).ok ||
            session.step === "done"
          ) {
            const generated = renderPitch(session);
            writeFileSync(pitchPath, generated, "utf8");
            sendText(res, 200, generated, "text/html; charset=utf-8");
            return;
          }
          sendText(res, 404, "pitch.html not found", "text/plain; charset=utf-8");
          return;
        }
        sendText(
          res,
          200,
          readFileSync(pitchPath, "utf8"),
          "text/html; charset=utf-8",
        );
        return;
      }

      // API authorization
      if (effectivePath.startsWith("/api/")) {
        if (token && reqToken !== token) {
          sendJson(res, 401, {
            error: "unauthorized: valid session token required",
          });
          return;
        }
      }

      // GET /api/:token/session
      if (method === "GET" && effectivePath === "/api/session") {
        const session = loadSession(rootDir, sessionId);
        sendJson(res, 200, session);
        return;
      }

      // GET /api/:token/stream (SSE live sync)
      if (method === "GET" && effectivePath === "/api/stream") {
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });

        let lastKey = "";
        let closed = false;

        const pushIfChanged = () => {
          if (closed) return;
          try {
            const latest = loadSession(rootDir, sessionId);
            const key = `${latest.version}:${latest.updatedAt}`;
            if (key !== lastKey) {
              lastKey = key;
              res.write(`event: session\ndata: ${JSON.stringify(latest)}\n\n`);
            }
          } catch {
            // Ignore transient atomic rename races
          }
        };

        pushIfChanged();

        let watcher: ReturnType<typeof watch> | null = null;
        try {
          watcher = watch(dir, () => pushIfChanged());
        } catch {
          watcher = null;
        }
        const pollTimer = setInterval(pushIfChanged, 400);

        const cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(pollTimer);
          if (watcher) {
            try {
              watcher.close();
            } catch {
              // Ignore
            }
          }
          activeStreams.delete(cleanup);
          try {
            res.end();
          } catch {
            // Ignore
          }
        };

        activeStreams.add(cleanup);
        req.on("close", cleanup);
        return;
      }

      // POST /api/:token/submit
      if (method === "POST" && effectivePath === "/api/submit") {
        let session = loadSession(rootDir, sessionId);
        if (session.status !== "active") {
          sendJson(res, 409, {
            error: `session ${session.status} — resume or start a new session`,
          });
          return;
        }
        const body = parseJsonBody(await readBody(req));
        session = applyHumanSubmit(session, body as HumanSubmitPayload);
        saveSession(rootDir, session);
        writeWorkshopFile(session, rootDir);
        sendJson(res, 200, {
          ok: true,
          version: session.version,
          step: session.step,
          status: session.status,
        });
        return;
      }

      // POST /api/:token/revise
      if (method === "POST" && effectivePath === "/api/revise") {
        let session = loadSession(rootDir, sessionId);
        if (session.status !== "active") {
          sendJson(res, 409, { error: `session ${session.status}` });
          return;
        }
        const body = parseJsonBody(await readBody(req));
        const target = typeof body["step"] === "string" ? body["step"] : "";
        if (!REVISABLE_STEPS.includes(target as StepId)) {
          sendJson(res, 400, {
            error: `invalid revise step '${target}'`,
            valid: REVISABLE_STEPS,
          });
          return;
        }
        session = reviseStep(session, target as StepId);
        saveSession(rootDir, session);
        writeWorkshopFile(session, rootDir);
        sendJson(res, 200, {
          ok: true,
          version: session.version,
          step: session.step,
          status: session.status,
        });
        return;
      }

      // POST /api/:token/need-coach
      if (method === "POST" && effectivePath === "/api/need-coach") {
        let session = loadSession(rootDir, sessionId);
        if (session.status !== "active") {
          sendJson(res, 409, { error: `session ${session.status}` });
          return;
        }
        const raw = await readBody(req);
        const body = raw.trim() ? parseJsonBody(raw) : {};
        const reason =
          typeof body["reason"] === "string" && body["reason"].trim()
            ? body["reason"].trim()
            : "stuck";
        session = applyHumanSubmit(session, {
          humanMessage: `need-coach: ${reason}`,
        });
        saveSession(rootDir, session);
        writeWorkshopFile(session, rootDir);
        sendJson(res, 200, {
          ok: true,
          version: session.version,
          step: session.step,
          status: session.status,
        });
        return;
      }

      // POST /api/:token/weak-advance
      if (method === "POST" && effectivePath === "/api/weak-advance") {
        let session = loadSession(rootDir, sessionId);
        if (session.status !== "active") {
          sendJson(res, 409, { error: `session ${session.status}` });
          return;
        }
        session = applyHumanSubmit(session, { weakAdvance: true });
        saveSession(rootDir, session);
        writeWorkshopFile(session, rootDir);
        sendJson(res, 200, {
          ok: true,
          version: session.version,
          step: session.step,
          status: session.status,
        });
        return;
      }

      // POST /api/:token/chill
      if (
        method === "POST" &&
        (effectivePath === "/api/chill" || effectivePath === "/api/chill/accept")
      ) {
        const raw = await readBody(req);
        const body = raw.trim() ? parseJsonBody(raw) : {};
        const reason =
          typeof body["reason"] === "string" ? body["reason"] : undefined;
        const session = pauseSession(rootDir, sessionId, reason);
        sendJson(res, 200, {
          ok: true,
          version: session.version,
          step: session.step,
          status: session.status,
        });
        return;
      }

      // POST /api/:token/resume
      if (
        method === "POST" &&
        (effectivePath === "/api/resume" ||
          effectivePath === "/api/chill/resume")
      ) {
        const session = resumeSession(rootDir, sessionId);
        sendJson(res, 200, {
          ok: true,
          version: session.version,
          step: session.step,
          status: session.status,
        });
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
    close: async () => {
      for (const cleanup of [...activeStreams]) {
        cleanup();
      }
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
