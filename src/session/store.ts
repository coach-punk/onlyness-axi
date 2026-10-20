import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type { EntryKind, PitchSatisfaction, Session } from "./types.js";

export function emptySatisfaction(): PitchSatisfaction {
  return {
    stand: false,
    axis: false,
    off_axis: false,
    onlyness: false,
    statement: false,
  };
}

const ROOT_NAME = ".onlyness";

export function onlynessRoot(cwd = process.cwd()): string {
  return join(cwd, ROOT_NAME);
}

export function sessionDir(rootDir: string, id: string): string {
  return join(rootDir, id);
}

function slug(): string {
  const t = new Date().toISOString().replace(/[:.]/g, "-");
  const r = Math.random().toString(36).slice(2, 6);
  return `s-${t}-${r}`;
}

export function randomToken(): string {
  return randomBytes(16).toString("hex");
}

export function createSession(opts: {
  entry?: EntryKind;
  contextSources?: string[];
  seedText?: string;
  authToken?: string;
}): Session {
  return {
    id: slug(),
    createdAt: new Date().toISOString(),
    entry: opts.entry ?? "blank",
    step: "paradox",
    paradoxAck: false,
    arena: { industry: "", offering: "", audience: "" },
    contextSources: opts.contextSources ?? [],
    answers: {},
    statement: "",
    truthmode: null,
    coachLog: [],
    coachBudget: { used: 0, max: 3, lastJob: null },
    status: "active",
    authToken: opts.authToken ?? randomToken(),
    version: 1,
    chillOfferedAt: null,
    satisfaction: emptySatisfaction(),
  };
}

export function saveSessionAtomic(rootDir: string, session: Session): void {
  const dir = sessionDir(rootDir, session.id);
  mkdirSync(dir, { recursive: true });
  const targetPath = join(dir, "session.json");
  if (existsSync(targetPath)) {
    session.version = (session.version ?? 0) + 1;
  } else {
    session.version = session.version ?? 1;
  }
  const tempPath = join(
    dir,
    `session.json.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`,
  );
  writeFileSync(tempPath, JSON.stringify(session, null, 2), "utf8");
  renameSync(tempPath, targetPath);
}

export function saveSession(rootDir: string, session: Session): void {
  saveSessionAtomic(rootDir, session);
}

export function loadSession(rootDir: string, id: string): Session {
  const path = join(sessionDir(rootDir, id), "session.json");
  if (!existsSync(path)) {
    throw new Error(`session not found: ${id}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf8")) as Session;
  return {
    ...raw,
    authToken: raw.authToken ?? slug(),
    version: raw.version ?? 1,
    chillOfferedAt: raw.chillOfferedAt ?? null,
    satisfaction: raw.satisfaction ?? emptySatisfaction(),
  };
}

export function listSessions(rootDir: string): Session[] {
  if (!existsSync(rootDir)) return [];
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      try {
        return loadSession(rootDir, d.name);
      } catch {
        return null;
      }
    })
    .filter((s): s is Session => s !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function writeSeed(rootDir: string, id: string, text: string): void {
  const dir = sessionDir(rootDir, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "seed.md"), text);
}
