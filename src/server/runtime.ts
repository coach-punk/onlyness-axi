import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { sessionDir } from "../session/store.js";

export type ServerInfo = {
  pid: number;
  port: number;
  token: string;
  startedAt: string;
};

const START_TIMEOUT_MS = 5_000;
const START_POLL_MS = 50;

export function serverInfoPath(rootDir: string, sessionId: string): string {
  return join(sessionDir(rootDir, sessionId), "server.json");
}

export function readServerInfo(
  rootDir: string,
  sessionId: string,
): ServerInfo | null {
  const path = serverInfoPath(rootDir, sessionId);
  if (!existsSync(path)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      raw === null ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      typeof (raw as ServerInfo).pid !== "number" ||
      typeof (raw as ServerInfo).port !== "number" ||
      typeof (raw as ServerInfo).token !== "string"
    ) {
      return null;
    }
    return raw as ServerInfo;
  } catch {
    return null;
  }
}

export function writeServerInfo(
  rootDir: string,
  sessionId: string,
  info: ServerInfo,
): void {
  const dir = sessionDir(rootDir, sessionId);
  mkdirSync(dir, { recursive: true });
  const targetPath = serverInfoPath(rootDir, sessionId);
  const tempPath = join(
    dir,
    `server.json.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`,
  );
  writeFileSync(tempPath, JSON.stringify(info, null, 2), "utf8");
  renameSync(tempPath, targetPath);
}

export function clearServerInfo(rootDir: string, sessionId: string): void {
  const path = serverInfoPath(rootDir, sessionId);
  if (!existsSync(path)) return;
  try {
    unlinkSync(path);
  } catch {
    // Best-effort cleanup.
  }
}

export function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    return code === "EPERM";
  }
}

export function serverUrl(info: ServerInfo): string {
  return `http://127.0.0.1:${info.port}/s/${info.token}/`;
}

export function serverPitchUrl(info: ServerInfo): string {
  return `http://127.0.0.1:${info.port}/s/${info.token}/pitch`;
}

export async function isServerHealthy(info: ServerInfo): Promise<boolean> {
  if (!isPidAlive(info.pid)) return false;
  try {
    const res = await fetch(
      `http://127.0.0.1:${info.port}/api/${encodeURIComponent(info.token)}/session`,
      { signal: AbortSignal.timeout(1500) },
    );
    return res.ok;
  } catch {
    return false;
  }
}

function resolveCliEntry(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const binCandidate = join(here, "..", "..", "bin", "onlyness-axi.js");
  if (existsSync(binCandidate)) return binCandidate;
  const fromArgv = process.argv[1];
  if (fromArgv && fromArgv.length > 0) return fromArgv;
  throw new Error("cannot locate onlyness-axi CLI entry point");
}

function tryKill(pid: number | undefined): void {
  if (typeof pid !== "number" || pid <= 0) return;
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Process may already have exited.
  }
}

export async function ensureViewServer(
  rootDir: string,
  sessionId: string,
  opts?: { port?: number },
): Promise<ServerInfo> {
  const existing = readServerInfo(rootDir, sessionId);
  if (existing && (await isServerHealthy(existing))) {
    return existing;
  }
  if (existing) {
    clearServerInfo(rootDir, sessionId);
  }

  const entryBin = resolveCliEntry();
  const args = [entryBin, "view", sessionId, "--daemon"];
  if (typeof opts?.port === "number" && opts.port > 0) {
    args.push("--port", String(opts.port));
  }

  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
    cwd: process.cwd(),
    env: process.env,
  });
  child.unref();

  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const info = readServerInfo(rootDir, sessionId);
    if (info && (await isServerHealthy(info))) {
      return info;
    }
    if (child.exitCode !== null) {
      break;
    }
    await delay(START_POLL_MS);
  }

  const stale = readServerInfo(rootDir, sessionId);
  tryKill(stale?.pid ?? child.pid);
  clearServerInfo(rootDir, sessionId);
  throw new Error(`local workshop server failed to start for ${sessionId}`);
}

export function stopViewServer(rootDir: string, sessionId: string): void {
  const info = readServerInfo(rootDir, sessionId);
  if (info) {
    tryKill(info.pid);
    clearServerInfo(rootDir, sessionId);
  }
}
