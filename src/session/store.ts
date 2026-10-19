// src/session/store.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { EntryKind, Session } from "./types.js";

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

export function createSession(opts: {
  entry?: EntryKind;
  contextSources?: string[];
  seedText?: string;
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
  };
}

export function saveSession(rootDir: string, session: Session): void {
  const dir = sessionDir(rootDir, session.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "session.json"), JSON.stringify(session, null, 2));
}

export function loadSession(rootDir: string, id: string): Session {
  const path = join(sessionDir(rootDir, id), "session.json");
  if (!existsSync(path)) {
    throw new Error(`session not found: ${id}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as Session;
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
