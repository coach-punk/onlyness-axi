import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sessionDir } from "../session/store.js";

export type ServerMeta = {
  pid: number;
  port: number;
  token?: string;
  startedAt?: string;
};

export function serverMetaPath(rootDir: string, sessionId: string): string {
  return join(sessionDir(rootDir, sessionId), "server.json");
}

export function writeServerMeta(
  rootDir: string,
  sessionId: string,
  meta: ServerMeta,
): void {
  writeFileSync(serverMetaPath(rootDir, sessionId), JSON.stringify(meta, null, 2));
}

export function readServerMeta(
  rootDir: string,
  sessionId: string,
): ServerMeta | null {
  const path = serverMetaPath(rootDir, sessionId);
  if (!existsSync(path)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (
      raw === null ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      typeof (raw as ServerMeta).pid !== "number" ||
      typeof (raw as ServerMeta).port !== "number"
    ) {
      return null;
    }
    return raw as ServerMeta;
  } catch {
    return null;
  }
}

export function deleteServerMeta(rootDir: string, sessionId: string): void {
  const path = serverMetaPath(rootDir, sessionId);
  if (!existsSync(path)) return;
  try {
    unlinkSync(path);
  } catch {
    // Best-effort cleanup.
  }
}
