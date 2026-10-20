# onlyness-axi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local-first AXI CLI + thin skill that walks a human through Pepsi Paradox → arena → four steps → onlyness statement → truthmode, with coach-in-loop polling and TOON handoff.

**Architecture:** Scaffold from `axi-axi`, replace placeholder commands with session store under `.onlyness/<slug>/`, a tiny Node HTTP server serving `surface.html`, long-poll events for submit/need-coach, and pure functions for step gates, coach budget, and truthmode rubric. Agent does coaching text and adversarial swap; CLI owns state, gates, and deterministic checks.

**Tech Stack:** Node ≥20, TypeScript, vitest, axi-axi scaffold (TOON emitter, router, help), Node `http` (no Express), filesystem JSON sessions.

**Spec:** `docs/superpowers/specs/2026-10-19-onlyness-axi-design.md`

## Global Constraints

- Package name: `onlyness-axi`; bin: `onlyness-axi`; skill name: `onlyness`
- AXI spec: `axi/1.0-2026-07` — TOON stdout, content-first bare invoke, exit 2 on unknown flags, stderr silent on success
- Sessions live only under `.onlyness/<slug>/` in cwd; no cloud
- Coach budget: max 3 turns per step (`clarify` → `ground` → `mirror`), then exits
- Never skip Act 0 (paradox + arena + example) or truthmode
- Skill file stays thin; playbooks served by CLI `playbook <id>`
- Keep existing `docs/superpowers/` when scaffolding into repo root
- No Lavish dependency

---

## File structure

| Path | Responsibility |
| --- | --- |
| `bin/onlyness-axi.js` | Bin entry → `dist/index.js` |
| `src/index.ts` | Process entry; dispatch router |
| `src/cli/*` | Keep scaffold args/help/router/spec |
| `src/output/*` | Keep scaffold TOON/errors/suggest/truncate |
| `src/session/types.ts` | Session, steps, events, truthmode types |
| `src/session/store.ts` | Load/save/list sessions under `.onlyness/` |
| `src/session/steps.ts` | Step order, advance gates, answer shape |
| `src/session/coach.ts` | Budget consume/reset |
| `src/truthmode/rubric.ts` | Deterministic Pass 1 checks |
| `src/server/events.ts` | Durable event log append/tail/since (`.onlyness/<id>/events.jsonl`) |
| `src/server/http.ts` | Loopback server with token auth, Origin check, static surface & API |
| `src/server/meta.ts` | Server PID, port, token metadata for lifecycle management |
| `src/surface/template.ts` | Static client shell HTML/JS (paradox→truthmode + localStorage drafts) |
| `src/commands/home.ts` | List sessions (content-first) |
| `src/commands/start.ts` | Create session, token, spawn serve, print prominent URL |
| `src/commands/serve.ts` | Standalone server daemon process for session |
| `src/commands/poll.ts` | Durable file-tailing poll + timeout + prompt fencing + dead-server recovery |
| `src/commands/submit.ts` | Chat-only headless submission command |
| `src/commands/init.ts` | Write AGENTS.md discovery instructions for Copilot/Cursor |
| `src/commands/reply.ts` | Append coach message to session + push to surface |
| `src/commands/advance.ts` | Gate check + step transition |
| `src/commands/result.ts` | Emit full worksheet TOON |
| `src/commands/end.ts` | Mark ended; stop server if idle |
| `src/commands/playbook.ts` | Print playbook text by id |
| `src/commands/truthmode.ts` | Rubric check + store swap / pass3 fields |
| `src/playbooks/*.ts` | Paradox, arena, stand, axis, off-axis, onlyness, truthmode, prune, coach |
| `src/skill/content.ts` | Thin skill + home render |
| `test/*.test.ts` | Unit + CLI smoke + dumb-driver cross-process tests |
| `skills/onlyness/SKILL.md` | Generated via `npm run skill:gen` |

Delete scaffold `src/commands/items.ts` after real commands exist.

---

### Task 1: Scaffold AXI package into repo root

**Files:**
- Create: scaffold output at repo root (merge with existing `docs/`)
- Modify: `package.json` description; `.gitignore` to ignore `.onlyness/`
- Test: `test/cli.test.ts` (scaffold smoke)

**Interfaces:**
- Produces: buildable `onlyness-axi` bin; `npm test` green on scaffold smoke

- [ ] **Step 1: Scaffold into a temp dir, then copy into repo (preserve docs)**

```bash
cd /Users/johnstansbury/Code/onlyness/Untitled
npx -y axi-axi new onlyness-axi --dir /tmp/onlyness-axi-scaffold
# Copy scaffold files into repo root without deleting docs/
rsync -a --exclude '.git' /tmp/onlyness-axi-scaffold/ ./
```

- [ ] **Step 2: Update package.json description and .gitignore**

Set description to: `Local-first AXI workshop: Pepsi Paradox → onlyness statement → truthmode.`

Append to `.gitignore`:

```
.onlyness/
node_modules/
dist/
```

- [ ] **Step 3: Install, build, run scaffold tests**

```bash
npm install && npm test
```

Expected: vitest PASS on AXI contract smoke tests.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold onlyness-axi from axi-axi

Preserve design docs and establish the AXI CLI package skeleton.
EOF
)"
```

---

### Task 2: Session types and filesystem store

**Files:**
- Create: `src/session/types.ts`
- Create: `src/session/store.ts`
- Create: `test/session-store.test.ts`
- Delete later: nothing yet

**Interfaces:**
- Produces:
  - `export type StepId = "paradox" | "arena" | "stand" | "axis" | "off_axis" | "onlyness" | "truthmode" | "done"`
  - `export type EntryKind = "blank" | "seed" | "prune"`
  - `export type CoachJob = "clarify" | "ground" | "mirror"`
  - `export interface Session { id: string; createdAt: string; entry: EntryKind; step: StepId; paradoxAck: boolean; arena: { industry: string; offering: string; audience: string }; contextSources: string[]; answers: Record<string, unknown>; statement: string; truthmode: TruthmodeState | null; coachLog: CoachEntry[]; coachBudget: { used: number; max: 3; lastJob: CoachJob | null }; status: "active" | "ended"; weakAdvance?: boolean; port?: number }`
  - `createSession(opts): Session`
  - `saveSession(rootDir, session): void`
  - `loadSession(rootDir, id): Session`
  - `listSessions(rootDir): Session[]`
  - `sessionDir(rootDir, id): string`

- [ ] **Step 1: Write failing store tests**

```ts
// test/session-store.test.ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSession, listSessions, loadSession, saveSession } from "../src/session/store.js";

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("session store", () => {
  it("creates, saves, loads, and lists a session", () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-"));
    const s = createSession({ entry: "blank" });
    expect(s.step).toBe("paradox");
    expect(s.coachBudget.max).toBe(3);
    saveSession(root, s);
    const loaded = loadSession(root, s.id);
    expect(loaded.id).toBe(s.id);
    expect(listSessions(root)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- test/session-store.test.ts
```

Expected: FAIL cannot find module / createSession

- [ ] **Step 3: Implement types + store**

```ts
// src/session/types.ts
export type StepId =
  | "paradox"
  | "arena"
  | "stand"
  | "axis"
  | "off_axis"
  | "onlyness"
  | "truthmode"
  | "done";

export type EntryKind = "blank" | "seed" | "prune";
export type CoachJob = "clarify" | "ground" | "mirror";

export interface Arena {
  industry: string;
  offering: string;
  audience: string;
}

export interface CoachEntry {
  at: string;
  step: StepId;
  role: "human" | "coach" | "system";
  job?: CoachJob;
  text: string;
}

export interface TruthmodeCheck {
  id: string;
  severity: "fail" | "weak";
  detail: string;
}

export interface TruthmodeState {
  verdict: "pass" | "weak" | "fail" | null;
  checks: TruthmodeCheck[];
  swap: string;
  itch: string;
  sticky: string;
  jackBlack: string;
  cuts: string[];
}

export interface Session {
  id: string;
  createdAt: string;
  entry: EntryKind;
  step: StepId;
  paradoxAck: boolean;
  arena: Arena;
  contextSources: string[];
  answers: Record<string, unknown>;
  statement: string;
  truthmode: TruthmodeState | null;
  coachLog: CoachEntry[];
  coachBudget: { used: number; max: 3; lastJob: CoachJob | null };
  status: "active" | "ended";
  weakAdvance?: boolean;
  port?: number;
}
```

```ts
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- test/session-store.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/session test/session-store.test.ts
git commit -m "feat: add session types and filesystem store"
```

---

### Task 3: Step machine and advance gates

**Files:**
- Create: `src/session/steps.ts`
- Create: `test/steps.test.ts`

**Interfaces:**
- Consumes: `Session`, `StepId` from types
- Produces:
  - `STEP_ORDER: StepId[]`
  - `canAdvance(session): { ok: boolean; reason?: string }`
  - `nextStep(step): StepId`
  - `applyHumanSubmit(session, payload): Session` — merges answers / paradoxAck / arena / statement / truthmode fields

- [ ] **Step 1: Write failing tests**

```ts
// test/steps.test.ts
import { describe, expect, it } from "vitest";
import { createSession } from "../src/session/store.js";
import { canAdvance, nextStep } from "../src/session/steps.js";

describe("steps", () => {
  it("blocks advance from paradox until ack", () => {
    const s = createSession({});
    expect(canAdvance(s).ok).toBe(false);
    s.paradoxAck = true;
    // still need arena before leaving arena step — paradox advances to arena
    expect(nextStep("paradox")).toBe("arena");
  });

  it("requires arena fields before leaving arena", () => {
    const s = createSession({});
    s.step = "arena";
    s.paradoxAck = true;
    expect(canAdvance(s).ok).toBe(false);
    s.arena = { industry: "autos", offering: "car vending", audience: "buyers" };
    expect(canAdvance(s).ok).toBe(true);
  });

  it("requires statement before truthmode advance to done", () => {
    const s = createSession({});
    s.step = "truthmode";
    s.statement = "I am the only X that Y";
    s.truthmode = {
      verdict: "pass",
      checks: [],
      swap: "rival cannot claim",
      itch: "a",
      sticky: "b",
      jackBlack: "c",
      cuts: [],
    };
    expect(canAdvance(s).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test -- test/steps.test.ts
```

- [ ] **Step 3: Implement `src/session/steps.ts`**

```ts
import type { Session, StepId } from "./types.js";

export const STEP_ORDER: StepId[] = [
  "paradox",
  "arena",
  "stand",
  "axis",
  "off_axis",
  "onlyness",
  "truthmode",
  "done",
];

export function nextStep(step: StepId): StepId {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)]!;
}

function nonEmpty(...vals: string[]): boolean {
  return vals.every((v) => v.trim().length > 0);
}

export function canAdvance(session: Session): { ok: boolean; reason?: string } {
  switch (session.step) {
    case "paradox":
      return session.paradoxAck
        ? { ok: true }
        : { ok: false, reason: "acknowledge Pepsi Paradox first" };
    case "arena":
      return nonEmpty(
        session.arena.industry,
        session.arena.offering,
        session.arena.audience,
      )
        ? { ok: true }
        : { ok: false, reason: "fill industry, offering, and audience" };
    case "stand": {
      const a = session.answers.stand as { who?: string; job?: string; solved?: string } | undefined;
      return a && nonEmpty(a.who ?? "", a.job ?? "", a.solved ?? "")
        ? { ok: true }
        : { ok: false, reason: "stand needs who, job, and solved" };
    }
    case "axis": {
      const a = session.answers.axis as { scale?: string; place?: string; ifWin?: string } | undefined;
      return a && nonEmpty(a.scale ?? "", a.place ?? "", a.ifWin ?? "")
        ? { ok: true }
        : { ok: false, reason: "axis needs scale, place, and ifWin" };
    }
    case "off_axis": {
      const a = session.answers.off_axis as { territory?: string } | undefined;
      return a && nonEmpty(a.territory ?? "")
        ? { ok: true }
        : { ok: false, reason: "off_axis needs territory" };
    }
    case "onlyness":
      return nonEmpty(session.statement)
        ? { ok: true }
        : { ok: false, reason: "draft an onlyness statement" };
    case "truthmode": {
      const t = session.truthmode;
      if (!t) return { ok: false, reason: "run truthmode first" };
      if (!nonEmpty(t.itch, t.sticky, t.jackBlack)) {
        return { ok: false, reason: "fill itch, sticky, and jackBlack" };
      }
      if (t.verdict === "fail" && !session.weakAdvance) {
        return { ok: false, reason: "truthmode failed — revise or set weak advance" };
      }
      return { ok: true };
    }
    case "done":
      return { ok: false, reason: "session already done" };
    default: {
      const _exhaustive: never = session.step;
      return { ok: false, reason: String(_exhaustive) };
    }
  }
}

export function advanceSession(session: Session): Session {
  const gate = canAdvance(session);
  if (!gate.ok) throw new Error(gate.reason ?? "cannot advance");
  const next = nextStep(session.step);
  return {
    ...session,
    step: next,
    coachBudget: { used: 0, max: 3, lastJob: null },
    weakAdvance: false,
  };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test -- test/steps.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/session/steps.ts test/steps.test.ts
git commit -m "feat: add step order and advance gates"
```

---

### Task 4: Coach budget

**Files:**
- Create: `src/session/coach.ts`
- Create: `test/coach.test.ts`

**Interfaces:**
- Produces:
  - `nextCoachJob(used): CoachJob | null` — 0→clarify, 1→ground, 2→mirror, 3→null
  - `consumeCoachTurn(session, text): { session: Session; job: CoachJob } | { exhausted: true; session: Session }`
  - `resetBudgetIfAnswerChanged(session, prevAnswerKey, prevValue, nextValue): Session`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { consumeCoachTurn, nextCoachJob } from "../src/session/coach.js";
import { createSession } from "../src/session/store.js";

describe("coach budget", () => {
  it("orders clarify → ground → mirror then exhausts", () => {
    expect(nextCoachJob(0)).toBe("clarify");
    expect(nextCoachJob(1)).toBe("ground");
    expect(nextCoachJob(2)).toBe("mirror");
    expect(nextCoachJob(3)).toBe(null);
    let s = createSession({});
    s.step = "stand";
    for (const job of ["clarify", "ground", "mirror"] as const) {
      const r = consumeCoachTurn(s, `push ${job}`);
      expect("job" in r && r.job).toBe(job);
      s = r.session;
    }
    const done = consumeCoachTurn(s, "too much");
    expect("exhausted" in done && done.exhausted).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/session/coach.ts
import type { CoachJob, Session } from "./types.js";

const JOBS: CoachJob[] = ["clarify", "ground", "mirror"];

export function nextCoachJob(used: number): CoachJob | null {
  return JOBS[used] ?? null;
}

export function consumeCoachTurn(
  session: Session,
  text: string,
):
  | { session: Session; job: CoachJob; exhausted?: undefined }
  | { session: Session; exhausted: true; job?: undefined } {
  const job = nextCoachJob(session.coachBudget.used);
  if (!job) {
    return { exhausted: true, session };
  }
  const next: Session = {
    ...session,
    coachBudget: {
      used: session.coachBudget.used + 1,
      max: 3,
      lastJob: job,
    },
    coachLog: [
      ...session.coachLog,
      {
        at: new Date().toISOString(),
        step: session.step,
        role: "coach",
        job,
        text,
      },
    ],
  };
  return { session: next, job };
}

export function substantiveChanged(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(a) !== norm(b);
}

export function resetBudget(session: Session): Session {
  return { ...session, coachBudget: { used: 0, max: 3, lastJob: null } };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/session/coach.ts test/coach.test.ts
git commit -m "feat: add three-turn coach budget"
```

---

### Task 5: Truthmode rubric (Pass 1)

**Files:**
- Create: `src/truthmode/rubric.ts`
- Create: `test/rubric.test.ts`

**Interfaces:**
- Produces: `runRubric(statement: string, arena?: Arena): { verdict: "pass" | "weak" | "fail"; checks: TruthmodeCheck[] }`
- Rules (any `fail` ⇒ verdict fail; only `weak` ⇒ weak; else pass):
  - `geo` fail: /\bonly\b.*\b(in|on|at)\b.*\b(city|town|street|curb|zip|area|edge|block)\b/i or "this whole"
  - `category_restate` fail: statement restates selling the obvious noun from arena.offering with no extra clause value (heuristic: length < 40 after "I am the only" OR matches `/only .+ who (sells|makes|provides)/i` with no further differentiator beyond offering words)
  - `better_axis` fail: /\b(better|faster|cheaper|prettier|best|improved|ai-?powered)\b/i
  - `no_itch` weak: missing `\bthat\b` clause or that-clause < 4 words
  - `find_replace` weak: statement has no concrete noun beyond arena.industry tokens

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { runRubric } from "../src/truthmode/rubric.js";

describe("runRubric", () => {
  it("fails geographic scarcity", () => {
    const r = runRubric(
      "I am the only used car salesman on this whole edge of dealerships",
    );
    expect(r.verdict).toBe("fail");
    expect(r.checks.some((c) => c.id === "geo")).toBe(true);
  });

  it("fails better-axis cosplay", () => {
    const r = runRubric("I am the only CRM that is faster and cheaper");
    expect(r.verdict).toBe("fail");
    expect(r.checks.some((c) => c.id === "better_axis")).toBe(true);
  });

  it("passes a paradigm-shaped line", () => {
    const r = runRubric(
      "I am the only car retailer that sells cars from a vending machine",
    );
    expect(r.verdict).toBe("pass");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `src/truthmode/rubric.ts`** with the heuristics above; compute verdict = fail if any fail check, else weak if any weak, else pass.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/truthmode test/rubric.test.ts
git commit -m "feat: add deterministic truthmode rubric"
```

---

### Task 6: Durable Event Log, Atomic Store & Token-Authed HTTP Server

**Portability fixes addressed:**
- *The Blocker*: `events.ts` module state eliminated; events are appended to `.onlyness/<id>/events.jsonl` with an incrementing `seq`. `poll --since <seq>` directly tails this file.
- *Gap 4*: Atomic writes for `session.json` via temp file + rename plus `version` field.
- *Gap 5*: Server binds strictly to loopback (`127.0.0.1`), generates a cryptographically random session token in the URL (`/s/:token/`), and validates `Origin` headers on state-changing requests.
- *Self-healing daemon*: Standalone `serve <sessionId>` daemon command and process metadata. If the server dies or sandboxes kill background processes, `poll` automatically relaunches it.

**Files:**
- Create: `src/server/events.ts` (durable event append, tailing, and reading from `events.jsonl`)
- Create: `src/server/http.ts` (loopback-only HTTP server, token authentication, Origin checking, static surface serving, API endpoints)
- Create: `src/server/meta.ts` (`meta.json` storage: port, token, pid, process health)
- Create: `src/commands/serve.ts` (standalone server command for background daemonization)
- Modify: `src/session/store.ts` (atomic writes with tempfile rename and monotonic versioning)
- Modify: `src/session/types.ts` (add `version`, `authToken`, `port`)
- Create: `test/server.test.ts`
- Create: `test/events.test.ts`

**Interfaces:**
- Event schema (`events.jsonl`):
  ```ts
  export type HumanEventType = "submit" | "need_coach" | "weak_advance" | "chill_accept" | "chill_resume";
  export type HumanEvent = {
    seq: number;
    type: HumanEventType;
    at: string;
    payload: Record<string, unknown>;
  };
  ```
- Functions:
  - `appendEvent(rootDir: string, sessionId: string, type: HumanEventType, payload: Record<string, unknown>): Promise<HumanEvent>`
  - `readEventsSince(rootDir: string, sessionId: string, sinceSeq: number): HumanEvent[]`
  - `tailEvents(rootDir: string, sessionId: string, sinceSeq: number, timeoutMs: number): Promise<HumanEvent | null>`
  - `saveSessionAtomic(rootDir: string, session: Session): void` (writes to `session.json.tmp.<pid>`, flushes, then atomic `renameSync`)
  - `startServer(opts: { rootDir: string; sessionId: string; port?: number; token: string }): Promise<{ port: number; token: string; close: () => Promise<void> }>`
- Routes:
  - `GET /s/:token/` → serves static `surface.html`
  - `GET /api/:token/session` → session JSON (rejects if token invalid or expired)
  - `POST /api/:token/submit` → validates Origin, updates `session.json` atomically, appends `submit` event to `events.jsonl`
  - `POST /api/:token/need-coach` → appends `need_coach` event to `events.jsonl`
  - `POST /api/:token/weak-advance` → appends `weak_advance` event to `events.jsonl`
  - `POST /api/:token/chill/accept` & `resume` → appends chill events

- [x] **Step 1: Write unit tests for durable events & atomic store**
  - Verify `appendEvent` assigns strictly incrementing `seq` (1, 2, 3...) to `events.jsonl`.
  - Verify `readEventsSince` returns only events with `seq > sinceSeq`.
  - Verify `tailEvents` resolves immediately if an event with `seq > sinceSeq` already exists, or waits and resolves when written from another process.
  - Verify `saveSessionAtomic` does not corrupt `session.json` on concurrent read/write and increments `version`.

- [x] **Step 2: Write server integration test**
  - Verify server binds to `127.0.0.1` only.
  - Verify unauthorized requests without token return 401/403.
  - Verify invalid `Origin` on POST returns 403.
  - Verify valid POST appends event to disk and updates session JSON.

- [x] **Step 3: Implement durable events, atomic store, and token-authed server**
  - Implement `appendEvent`, `readEventsSince`, `tailEvents` in `src/server/events.ts`.
  - Update `src/session/store.ts` with atomic write helper.
  - Implement loopback HTTP server with token validation in `src/server/http.ts`.
  - Implement `src/commands/serve.ts` and `src/server/meta.ts`.

- [x] **Step 4: Run tests & verify PASS**

```bash
npm test test/events.test.ts test/server.test.ts
```

- [x] **Step 5: Commit**

```bash
git add src/server src/session src/commands/serve.ts test/events.test.ts test/server.test.ts
git commit -m "feat: add durable event log, atomic session store, and token-authed loopback server"
```

---

### Task 7: Static Surface Shell with Client-Side Drafts

**Portability fixes addressed:**
- *Gap 6*: Eliminate server-side page re-renders per step. The human's active editing state is never clobbered mid-typing.
- The surface is a static single-page shell loaded from `/s/:token/`. It hydrates itself by fetching `/api/:token/session`.
- In-progress inputs (statements, answers, arena candidates) are cached in client-side storage (`localStorage`) so network drops or step transitions never lose human drafts.
- Works offline/decoupled from agent turn cycles.

**Files:**
- Create: `src/surface/template.ts`
- Create: `test/surface.test.ts`

**Interfaces:**
- Produces: `renderSurface(token: string): string` — static HTML/JS/CSS client shell:
  - Header: Session ID, active step badge, live connection status indicator, and prompt/assignment summary.
  - Act 0 View: Pepsi Paradox teaching copy + acknowledge checkbox/button.
  - Arena View: 3 competitor comparison matrix + Carvana worked example teaching card.
  - Step Views: Stand, Axis, Off-Axis, Onlyness forms with live field binding.
  - Truthmode View: Rubric checklist (itch, sticky, Jack Black, cuts), Pass 2 adversarial swap, and verdict display.
  - Coach Panel: Collapsible log of coach replies + budget indicator (e.g. Turn 1/3: Clarify).
  - Client script:
    - Queries `/api/:token/session` on load and polls on interval or user action.
    - Autosaves form drafts to `localStorage`.
    - Handles form submissions via `fetch('/api/:token/submit', ...)` with JSON payload.
    - Handles "Need Coach" and "Advance Weak" buttons.

- [ ] **Step 1: Write surface HTML test**
  - Verify `renderSurface(token)` generates static HTML containing the client script, token-bound endpoints, localStorage draft logic, and UI containers for all steps (Paradox through Truthmode).
  - Verify no dynamic server-rendered step-specific branching that destroys unsubmitted form values.

- [ ] **Step 2: Implement static surface shell in `src/surface/template.ts`**
  - Build clean, minimal, non-slop CSS (neutral dark slate/cool gray typography, ink blue accent, high contrast, zero generic purple gradients).
  - Include Carvana worked miniature example in the static arena section.

- [ ] **Step 3: Run test & verify PASS**

```bash
npm test test/surface.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/surface test/surface.test.ts
git commit -m "feat: add static workshop surface shell with client-side draft preservation"
```

---

### Task 8: Resilient CLI Commands, Agent Guardrails & Dumb-Driver Test

**Portability fixes addressed:**
- *Gap 1 (Human's browser unreachable)*: `start` adds `--no-open`, prominently prints the URL with session token, and explains port forwarding for remote containers/cloud agents (Codespaces, Copilot Workspace, Claude Code web).
- *Gap 2 (No chat-only path)*: Add `submit <session> --step <step> --json <payload>` command so headless agents without a browser surface can directly relay human answers typed in chat.
- *Gap 3 (60-second blocking poll timing out)*: `poll` defaults to ~25s wait (`--wait 25`), supports custom `--wait <seconds>`, and emits structured `event: timeout` with retry hints in `next[]`.
- *Gap 7 (Human free-text prompt injection)*: `poll` fences human free-text in a clearly labeled payload block (`--- BEGIN HUMAN SUBMISSION ---`), truncates by default, and provides `--full` flag.
- *Weaker Model Guidance*: `poll` output explicitly reports `coachJob: <clarify | ground | mirror>` plus 1 line explaining the specific coaching job for the step, so smaller models don't guess what to do.
- *Skill discovery beyond Claude*: Add `onlyness-axi init` command that writes/appends standard instructions to `AGENTS.md` for Copilot, Cursor, and other agent harnesses.
- *Dumb Driver Test*: Standalone end-to-end driver importing none of the project's internal code, verifying the full cross-process loop.

**Files:**
- Create: `src/commands/start.ts`
- Create: `src/commands/poll.ts`
- Create: `src/commands/submit.ts` (headless chat-only submission)
- Create: `src/commands/init.ts` (writes `AGENTS.md` discovery block)
- Create: `src/commands/reply.ts`
- Create: `src/commands/advance.ts`
- Create: `src/commands/result.ts`
- Create: `src/commands/end.ts`
- Create: `src/commands/playbook.ts`
- Create: `src/commands/truthmode.ts`
- Modify: `src/cli/router.ts` (register new commands & flags)
- Create: `test/dumb-driver.test.ts` (cross-process integration test)
- Modify: `test/cli.test.ts`

**CLI TOON Specifications:**

1. `start` command:
   - Flags: `--entry <blank|seed|prune>`, `--seed <path>`, `--seed-text <str>`, `--no-open`, `--port <n>`
   - Spawns background `serve` daemon, saves `meta.json`.
   - Output:
     ```
     session: s-2026-…
     step: paradox
     port: 7843
     token: tok_a8f9…
     url: http://127.0.0.1:7843/s/tok_a8f9…
     remote: Note: forward port 7843 if running in Codespaces/cloud container
     next[3]:
       1. Gather mutual context; optional reply with arena draft
       2. onlyness-axi poll s-2026-… --since 0
       3. onlyness-axi playbook paradox
     ```

2. `poll` command:
   - Args: `<sessionId>`
   - Flags: `--since <seq>` (default 0), `--wait <seconds>` (default 25), `--full`
   - Algorithm:
     - Directly checks and tails `.onlyness/<id>/events.jsonl`.
     - Health-check: Checks if `serve` process is alive via PID/port in `meta.json`. If dead, automatically relaunches `onlyness-axi serve <id>` in the background.
     - On timeout (no events within `--wait` duration):
       ```
       event: timeout
       session: s-2026-…
       step: stand
       lastSeq: 3
       next[2]:
         1. onlyness-axi poll s-2026-… --since 3
         2. onlyness-axi playbook stand
       ```
     - On event received:
       - Fences user payload to mitigate prompt injection.
       - Outputs current coach turn and explicit job guidance:
       ```
       event: submit
       seq: 4
       session: s-2026-…
       step: stand
       coachBudgetUsed: 1
       coachJob: clarify
       coachJobGuidance: Ask 1 question pinning down what they take a stand AGAINST in the arena.
       payload:
       --- BEGIN HUMAN SUBMISSION ---
       {"stand": "We refuse to do multi-day job estimation quotes."}
       --- END HUMAN SUBMISSION ---
       next[2]:
         1. Coach within budget (playbook coach) then reply
         2. onlyness-axi advance s-2026-… when gate ready
       ```

3. `submit` command (chat-only headless fallback):
   - Signature: `onlyness-axi submit <sessionId> --step <step> --json <payload>`
   - Directly appends `{ seq, type: "submit", payload }` to `events.jsonl` and merges into `session.json`.
   - Allows agents in environments without browsers to relay chat answers seamlessly.

4. `init` command:
   - Signature: `onlyness-axi init`
   - Writes or updates `AGENTS.md` at workspace root with the `onlyness-axi` tool usage snippet, enabling non-Claude agents (Copilot, Cursor, etc.) to discover and operate the CLI.

- [ ] **Step 1: Implement commands**
  - Implement `submit.ts`, `init.ts`, `start.ts` (with `--no-open` & remote notice), and `poll.ts` (with `--since`, `--wait 25`, prompt injection fencing, `coachJob` directive, and dead-server relaunch).
  - Register commands in `src/cli/router.ts`.

- [ ] **Step 2: Implement the 5-step cross-process "Dumb Driver" test in `test/dumb-driver.test.ts`**
  - Step 1: Run `onlyness-axi start --entry blank --no-open` in child process; extract `session`, `port`, `token`, `url`.
  - Step 2: POST a submit event to the printed URL with token via HTTP client.
  - Step 3: Run `onlyness-axi poll <id> --since 0` as an independent separate process; verify it exits 0 and returns the submit event from `events.jsonl`.
  - Step 4: POST another submit while no poll process is running; confirm subsequent `onlyness-axi poll <id> --since <lastSeq>` returns the new event.
  - Step 5: Kill the running server process (via PID from `meta.json`); run `onlyness-axi poll <id> --since <seq>`; verify poll detects the dead server, relaunches it via `serve`, and returns cleanly.

- [ ] **Step 3: Run dumb driver and CLI tests**

```bash
npm test test/dumb-driver.test.ts test/cli.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/commands src/cli test/dumb-driver.test.ts test/cli.test.ts
git commit -m "feat: wire resilient CLI commands with durable polling, chat submit, prompt fencing, and dumb-driver test"
```

---

### Task 9: Thin skill + README + axi-axi validate

**Files:**
- Modify: `src/skill/content.ts`
- Run: `npm run skill:gen` → `skills/onlyness/SKILL.md` (adjust gen script if it names skill `onlyness-axi`; prefer folder `skills/onlyness/` per spec)
- Modify: `README.md`
- Test: `npx -y axi-axi validate "node bin/onlyness-axi.js" --dir .`

**Skill frontmatter must include:** when to use (positioning, USP, Pepsi Paradox, prune); gather mutual context first; `npx -y onlyness-axi`; fetch playbooks from CLI; coach budget rules; never skip Act 0 or truthmode.

- [ ] **Step 1: Update skill content strings; generate skill file; fix name to `onlyness` if needed**

- [ ] **Step 2: Rewrite README** — quick start, command table, session layout, link to design spec

- [ ] **Step 3: Validate**

```bash
npm run build
npx -y axi-axi validate "node bin/onlyness-axi.js" --dir .
```

Expected: compliance checks pass (or fix listed failures until pass).

- [ ] **Step 4: Manual smoke (human)**

```bash
ONLYNESS_NO_BROWSER=1 node bin/onlyness-axi.js start
# open printed url, ack paradox, fill arena, submit through steps
node bin/onlyness-axi.js poll <id>
node bin/onlyness-axi.js truthmode check <id>
node bin/onlyness-axi.js result <id>
node bin/onlyness-axi.js end <id>
```

- [ ] **Step 5: Commit**

```bash
git commit -m "docs: add onlyness skill, README, and AXI validation"
```

---

### Task 10: Dogfood fixture — curb salesman fails, Carvana passes

**Files:**
- Create: `test/dogfood-truthmode.test.ts`

- [ ] **Step 1: Integration-style unit test** — create session, set statement to curb salesman, `runRubric` fail; set Carvana line, pass; simulate coach exhaust returns exhausted.

- [ ] **Step 2: Pass + commit**

```bash
git commit -m "test: dogfood truthmode and coach exhaustion cases"
```

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
| --- | --- |
| Greenfield AXI + skill | 1, 8, 9 |
| Pepsi → arena+example → 4 steps → truthmode | 3, 7, 8 |
| Coach budget clarify/ground/mirror + exits | 4, 7, 8 |
| Mutual context / contextSources / seed | 2, 8, 9 |
| find + prune entry | 8 (`--entry`), playbook prune |
| Truthmode rubric + swap storage + Jack Black fields | 5, 7, 8 |
| Local `.onlyness/` + poll loop | 2, 6, 8 |
| TOON / axi principles | 1, 8, 9 |
| Non-goals (no cloud, no Lavish) | honored throughout |

**Locked open items from spec:**
- Poll event schema: `submit` \| `need_coach` \| `weak_advance` (Task 6)
- Rubric: fail vs weak heuristics as in Task 5
- Package: TypeScript axi-axi scaffold at repo root
- Prior sessions: `list` shows them; skill tells agent to read prior `result` when relevant (no auto-merge in v1)
- Teaching copy: generic “cola taste test” wording OK; use Carvana as example not trademark claim

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-19-onlyness-axi.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with executing-plans and checkpoints  

Which approach?
