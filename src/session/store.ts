import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EntryKind,
  PitchSatisfaction,
  Session,
  WorkedExample,
} from "./types.js";

const ROOT_NAME = ".onlyness";

export const DEFAULT_WORKED_EXAMPLE: WorkedExample = {
  name: "Carvana",
  stand:
    "Buyers hiring for a used car without the lot-lot ritual: distrust, time sink, opaque pricing.",
  axisLeft: "Sketchy lot",
  axisRight: "Friendly low-price lot",
  rivals: [
    { label: "Budget Auto", x: 34 },
    { label: "Metro Motors", x: 58 },
    { label: "Honest Bob’s", x: 76 },
  ],
  axisPointX: 82,
  offAxisLabel: "Car vending tower",
  offAxisX: 66,
  offAxisY: 84,
  statement: "I am the only car retailer that sells cars from a vending machine",
};

export function emptySatisfaction(): PitchSatisfaction {
  return {
    stand: false,
    axis: false,
    off_axis: false,
    onlyness: false,
    statement: false,
  };
}

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

/** Read package.json version dynamically so --version never drifts. */
export function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "..", "package.json");
    if (existsSync(pkgPath)) {
      const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        version?: unknown;
      };
      if (typeof parsed.version === "string" && parsed.version.trim()) {
        return parsed.version.trim();
      }
    }
  } catch {
    // Fallback below if package.json is unavailable.
  }
  return "0.3.0";
}

export function createSession(opts: {
  entry?: EntryKind;
  contextSources?: string[];
  seedText?: string;
  authToken?: string;
  workedExample?: WorkedExample;
}): Session {
  const now = new Date().toISOString();
  const seedPreview =
    typeof opts.seedText === "string" && opts.seedText.trim().length > 0
      ? opts.seedText.slice(0, 1200)
      : undefined;

  return {
    id: slug(),
    createdAt: now,
    updatedAt: now,
    entry: opts.entry ?? "blank",
    step: "paradox",
    paradoxAck: false,
    paradoxRevealed: false,
    arena: { industry: "", offering: "", audience: "" },
    workedExample: opts.workedExample
      ? { ...opts.workedExample, rivals: opts.workedExample.rivals.map((r) => ({ ...r })) }
      : { ...DEFAULT_WORKED_EXAMPLE, rivals: DEFAULT_WORKED_EXAMPLE.rivals.map((r) => ({ ...r })) },
    contextSources: [...(opts.contextSources ?? [])],
    ...(seedPreview !== undefined ? { seedPreview } : {}),
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
  session.updatedAt = new Date().toISOString();
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
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<Session>;
  return {
    id: raw.id ?? id,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date(0).toISOString(),
    entry: raw.entry ?? "blank",
    step: raw.step ?? "paradox",
    paradoxAck: Boolean(raw.paradoxAck),
    paradoxRevealed: Boolean(raw.paradoxRevealed),
    arena: raw.arena ?? { industry: "", offering: "", audience: "" },
    workedExample: raw.workedExample ?? {
      ...DEFAULT_WORKED_EXAMPLE,
      rivals: DEFAULT_WORKED_EXAMPLE.rivals.map((r) => ({ ...r })),
    },
    contextSources: Array.isArray(raw.contextSources) ? raw.contextSources : [],
    ...(typeof raw.seedPreview === "string" ? { seedPreview: raw.seedPreview } : {}),
    answers: raw.answers ?? {},
    statement: raw.statement ?? "",
    truthmode: raw.truthmode ?? null,
    coachLog: Array.isArray(raw.coachLog) ? raw.coachLog : [],
    coachBudget: raw.coachBudget ?? { used: 0, max: 3, lastJob: null },
    status: raw.status ?? "active",
    ...(raw.weakAdvance !== undefined ? { weakAdvance: raw.weakAdvance } : {}),
    authToken: raw.authToken ?? randomToken(),
    version: raw.version ?? 1,
    chillOfferedAt: raw.chillOfferedAt ?? null,
    ...(typeof raw.chillReason === "string" ? { chillReason: raw.chillReason } : {}),
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
  writeFileSync(join(dir, "seed.md"), text, "utf8");
}

export function readSeed(rootDir: string, id: string): string | null {
  const path = join(sessionDir(rootDir, id), "seed.md");
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf8");
}
