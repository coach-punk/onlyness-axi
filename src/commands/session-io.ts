import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AxiError } from "../output/errors.js";
import type { Session, TruthmodeState } from "../session/types.js";
import { loadSession, onlynessRoot, sessionDir } from "../session/store.js";
import { renderWorkshop } from "../surface/workshop.js";

export function root(): string {
  return onlynessRoot(process.cwd());
}

export function requireSession(id: string | undefined): Session {
  if (!id || !id.trim()) {
    throw new AxiError(
      "missing session id",
      "pass a session id, e.g. onlyness-axi status s-…",
    );
  }
  try {
    return loadSession(root(), id);
  } catch {
    throw new AxiError(
      `session not found: ${id}`,
      "run onlyness-axi (no args) to list sessions, or start a new one",
    );
  }
}

export function workshopFilePath(sessionId: string): string {
  return join(sessionDir(root(), sessionId), "workshop.html");
}

export function pitchFilePath(sessionId: string): string {
  return join(sessionDir(root(), sessionId), "pitch.html");
}

export function chillFilePath(sessionId: string): string {
  return join(sessionDir(root(), sessionId), "chill.html");
}

export function writeWorkshopFile(
  session: Session,
  rootDir = root(),
): string {
  const path = join(sessionDir(rootDir, session.id), "workshop.html");
  writeFileSync(
    path,
    renderWorkshop(session, { live: false, token: "" }),
    "utf8",
  );
  return path;
}

export function writeSurfaceFile(session: Session): void {
  writeWorkshopFile(session);
}

export function emptyTruthmode(): TruthmodeState {
  return {
    verdict: null,
    checks: [],
    swap: "",
    itch: "",
    sticky: "",
    jackBlack: "",
    cuts: [],
  };
}

export function openInBrowser(target: string): void {
  if (process.env["ONLYNESS_NO_BROWSER"] === "1") return;
  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === "darwin") {
    cmd = "open";
    args = [target];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", target];
  } else {
    cmd = "xdg-open";
    args = [target];
  }
  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Best-effort browser open.
  }
}
