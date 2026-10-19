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
| `src/server/events.ts` | In-memory event queue per session |
| `src/server/http.ts` | Serve surface + API + long-poll |
| `src/surface/template.ts` | HTML workshop string (paradox→truthmode) |
| `src/commands/home.ts` | List sessions (content-first) |
| `src/commands/start.ts` | Create session, write surface, open browser, start server |
| `src/commands/poll.ts` | Long-poll human events |
| `src/commands/reply.ts` | Append coach message to session + push to surface |
| `src/commands/advance.ts` | Gate check + step transition |
| `src/commands/result.ts` | Emit full worksheet TOON |
| `src/commands/end.ts` | Mark ended; stop server if idle |
| `src/commands/playbook.ts` | Print playbook text by id |
| `src/commands/truthmode.ts` | Rubric check + store swap / pass3 fields |
| `src/playbooks/*.ts` | Paradox, arena, stand, axis, off-axis, onlyness, truthmode, prune, coach |
| `src/skill/content.ts` | Thin skill + home render |
| `test/*.test.ts` | Unit + CLI smoke tests |
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

### Task 6: Event bus + HTTP server

**Files:**
- Create: `src/server/events.ts`
- Create: `src/server/http.ts`
- Create: `test/server.test.ts`

**Interfaces:**
- Produces:
  - `type HumanEvent = { type: "submit" | "need_coach" | "weak_advance"; at: string; payload: Record<string, unknown> }`
  - `pushEvent(sessionId, event)`, `waitForEvent(sessionId, timeoutMs): Promise<HumanEvent | null>`
  - `startServer(opts: { rootDir: string; sessionId: string; port?: number }): Promise<{ port: number; close: () => Promise<void> }>`
  - Routes:
    - `GET /` → `surface.html`
    - `GET /api/session` → session JSON
    - `POST /api/submit` body JSON → merge into session via helper, push `submit` event
    - `POST /api/need-coach` → push `need_coach`
    - `POST /api/weak-advance` → set weakAdvance, push event
    - `GET /api/poll?since=` → long-poll coach replies (optional for browser); CLI uses in-process `waitForEvent`

Keep server map keyed by sessionId in module state. Persist session after each POST.

- [ ] **Step 1: Write failing test** — start server on ephemeral port, POST submit, `waitForEvent` resolves with type submit.

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSession, onlynessRoot, saveSession } from "../src/session/store.js";
import { waitForEvent } from "../src/server/events.js";
import { startServer } from "../src/server/http.js";
import { writeFileSync, mkdirSync } from "node:fs";

describe("http server", () => {
  let root: string;
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => {
    if (close) await close();
    rmSync(root, { recursive: true, force: true });
  });

  it("accepts submit and wakes waitForEvent", async () => {
    root = mkdtempSync(join(tmpdir(), "onlyness-"));
    const s = createSession({});
    saveSession(root, s);
    const dir = join(root, s.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "surface.html"), "<html>ok</html>");
    const srv = await startServer({ rootDir: root, sessionId: s.id, port: 0 });
    close = srv.close;
    const pending = waitForEvent(s.id, 2000);
    await fetch(`http://127.0.0.1:${srv.port}/api/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paradoxAck: true }),
    });
    const ev = await pending;
    expect(ev?.type).toBe("submit");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement events + http** using `node:http`. On submit, read body, `loadSession`, apply fields:

```ts
// merge logic inside http.ts
if (body.paradoxAck === true) session.paradoxAck = true;
if (body.arena) session.arena = { ...session.arena, ...body.arena };
if (body.answers) session.answers = { ...session.answers, ...body.answers };
if (typeof body.statement === "string") session.statement = body.statement;
if (body.truthmode) {
  session.truthmode = { ...(session.truthmode ?? emptyTruthmode()), ...body.truthmode };
}
```

Write `surface.html` path from `sessionDir`. `port: 0` → use `server.address().port`.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/server test/server.test.ts
git commit -m "feat: add local workshop HTTP server and event bus"
```

---

### Task 7: Surface HTML template

**Files:**
- Create: `src/surface/template.ts`
- Create: `test/surface.test.ts`

**Interfaces:**
- Produces: `renderSurface(session: Session): string` — single HTML document with:
  - Act 0: Pepsi Paradox copy + ack checkbox
  - Arena fields + Carvana miniature worked example (static teaching block)
  - Steps stand/axis/off_axis/onlyness forms (show based on `session.step`)
  - Truthmode: itch/sticky/jackBlack/cuts + show rubric verdict when present
  - Coach panel: last coachLog entries + exhausted exits (Examples / Stuck / Advance weak)
  - JS: `POST /api/submit`, `/api/need-coach`, `/api/weak-advance`; poll `GET /api/session` every 2s to refresh coach messages

Keep CSS minimal but intentional (not purple-gradient AI slop): cream paper off-limits per user taste — use cool gray + one sharp accent (ink blue), system-ui OK for v1 tool UI (this is a workshop tool, not a marketing landing page).

- [ ] **Step 1: Test that renderSurface includes paradox and onlyness template strings**

```ts
import { describe, expect, it } from "vitest";
import { createSession } from "../src/session/store.js";
import { renderSurface } from "../src/surface/template.js";

it("renders paradox and statement scaffold", () => {
  const html = renderSurface(createSession({}));
  expect(html).toContain("Pepsi Paradox");
  expect(html).toContain("I am the only");
  expect(html).toContain("/api/submit");
});
```

- [ ] **Step 2–4: Implement template, pass test, commit**

```bash
git commit -m "feat: add workshop surface HTML template"
```

---

### Task 8: Wire CLI commands (start, list/home, poll, reply, advance, result, end, playbook, truthmode)

**Files:**
- Modify: `src/cli/router.ts` (register commands)
- Modify: `src/commands/home.ts`
- Create: `src/commands/start.ts`, `poll.ts`, `reply.ts`, `advance.ts`, `result.ts`, `end.ts`, `playbook.ts`, `truthmode.ts`
- Create: `src/playbooks/index.ts` (+ per-id markdown strings)
- Modify: `src/skill/content.ts`
- Delete: `src/commands/items.ts`
- Modify: `test/cli.test.ts` — keep smoke; add start/list in temp cwd

**Interfaces (CLI TOON shapes):**

`start` stdout:
```
session: s-…
step: paradox
port: 7843
url: http://127.0.0.1:7843/
entry: blank
next[3]:
  1. Gather mutual context; optional reply with arena draft
  2. onlyness-axi poll s-…
  3. onlyness-axi playbook paradox
```

`poll` stdout on event:
```
event: submit
session: s-…
step: stand
coachBudgetUsed: 0
payload: …
next[2]:
  1. Coach within budget (playbook coach) then reply
  2. onlyness-axi advance s-… when gate ready
```

`reply` flags: `--text` (required), consumes coach budget unless `--system` (arena prefill / example swap without burning budget)

`truthmode check <session>` runs rubric, writes `truthmode.checks` + provisional verdict, returns TOON

`truthmode set-swap <session> --text` stores Pass 2

`result` emits worksheet KV + blocks for answers, statement, truthmode

- [ ] **Step 1: Implement playbooks as string map**

Ids: `paradox`, `arena`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `prune`, `coach`  
Each playbook: purpose, what good looks like, common fails, agent instructions (incl. mutual context + prune cuts question).

- [ ] **Step 2: Implement each command module with CommandSpec; register in router; remove items**

`start` algorithm:
1. Parse `--entry`, `--seed` (path or inline via `--seed-text`)
2. `createSession`, optional `writeSeed`, `contextSources` include `seed` if present
3. `renderSurface` → write `surface.html`
4. `startServer`, save `port` on session
5. Open browser: `process.platform` → `open` / `xdg-open` / `start` (ignore failures)
6. Print TOON + next[]

`poll`: `waitForEvent(id, 60000)` — if null, emit `event: timeout` exit 0 with next retry

`advance`: load → `advanceSession` → save → re-render surface → print new step

`end`: status ended; if no active sessions, close servers

- [ ] **Step 3: Extend CLI tests with temp cwd**

```ts
it("start then list shows session", () => {
  const cwd = mkdtempSync(join(tmpdir(), "onlyness-cli-"));
  const r = spawnSync("node", [bin, "start", "--entry", "blank"], {
    encoding: "utf8",
    cwd,
    env: { ...process.env, ONLYNESS_NO_BROWSER: "1" },
  });
  expect(r.status).toBe(0);
  expect(r.stdout).toMatch(/session:/);
  const list = spawnSync("node", [bin], { encoding: "utf8", cwd });
  expect(list.stdout).toMatch(/sessions\[/);
});
```

Honor `ONLYNESS_NO_BROWSER=1` in start.

- [ ] **Step 4: `npm test` all green**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: wire onlyness-axi workshop CLI commands"
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
