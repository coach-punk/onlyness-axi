# onlyness-axi Design

**Date:** 2026-10-19  
**Status:** Approved for implementation planning  
**Package:** `onlyness-axi`  
**Skill:** `onlyness`

## Problem

Founders and builders default to an “axis of better” (faster, cheaper, tastier, prettier). Winning that race still loses the Pepsi Paradox: people pick the branded choice, not the blind-taste winner. Generic pitches (and generic “we’ll build you a website” spam) are Brad Pitts — interchangeable. What’s missing is a guided way to step *off* that axis into paradigm-level **onlyness** (Jack Black / Carvana’s car vending machine): a sticky itch the category ignored.

This is useful at day zero *and* mid-lifecycle. Feature creep is often axis-of-better cosplay; onlyness is a knife for pruning as much as for inventing.

## Solution

A greenfield **AXI** (Agent eXperience Interface): installable agent skill + `npx -y onlyness-axi` CLI. Local-first interactive workshop surface, coach-in-the-loop polling, structured TOON handoff. Inspired by Lavish’s review loop; not dependent on Lavish.

## Goals

- Walk a human through Pepsi Paradox → arena + worked example → four steps → onlyness statement → truthmode
- Agent coaches between steps with a **per-step budget** (clarify → ground → mirror), then calm exits — not a single pushback and not an infinite roast
- Tailor the experience from **mutual understanding**: conversation context, seed, prior `.onlyness` sessions, and any memory the agent already has about this human/product
- Optional seed (URL/one-pager/blurb); blank by default
- Truthmode: rubric + adversarial swap + Carvana/Jack Black bar
- Support **find** and **prune** entry intents
- AXI-compliant: TOON, content-first, contextual next steps, structured errors

## Non-goals (v1)

- Accounts, cloud sync, hosted multiplayer
- Auto site scraping beyond optional pasted seed
- Requiring a specific memory product (Supermemory, etc.) — use what’s available; degrade gracefully to arena + seed + conversation
- Generating a full marketing site or brand system (downstream of `result`)
- Replacing Lavish or wrapping it as a dependency

## Architecture

```
Agent (skill: onlyness)
    │  npx -y onlyness-axi …
    ▼
CLI ──► .onlyness/<slug>/
    │     session.json
    │     surface.html
    │     seed.md (optional)
    │
    ├── local HTTP server (serve surface, accept submit / need-coach)
    └── long-poll → TOON payload → agent reply → surface update
```

### Session lifecycle

1. `onlyness-axi start [--seed …] [--entry blank|seed|prune]` — create session, open browser, return TOON (`session`, `step`, `next[]`)
2. Agent loads **mutual context** (chat, memory tools if present, prior sessions under `.onlyness/`, seed) and may `reply` an arena draft / tailored example before the human starts typing
3. Human works current act/step on `surface.html`
4. `onlyness-axi poll <session>` — long-poll until submit, need-coach, or advance
5. Agent coaches within the step’s **3-turn budget**, may `reply`, human revises
6. Advance: paradox → arena+example → stand → axis → off-axis → onlyness draft → truthmode
7. `onlyness-axi result <session>` — worksheet + statement + truthmode verdict
8. `onlyness-axi end <session>` — close session

Bare `onlyness-axi` (no args) lists active sessions (AXI content-first).

### Commands (agent-facing)

| Command | Role |
| --- | --- |
| `(none)` / `list` | Active sessions, status, current step |
| `start` | Create session; optional `--seed`, `--entry` |
| `poll <session>` | Long-poll human events |
| `reply <session>` | Post coach message onto surface |
| `advance <session>` | Move to next step when gate satisfied |
| `result <session>` | Final structured worksheet |
| `end <session>` | End session; stop idle server when last session ends |
| `playbook <id>` | On-demand step/truthmode/prune guidance |
| `--help` | Concise per-subcommand reference |

Playbook ids: `paradox`, `arena`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `prune`, `coach`.

## Workshop arc

### Act 0 — Pepsi Paradox + arena + worked example

**Why (paradox):** Teach why “better” isn’t the game (blind taste vs branded choice). Copy also mentions mid-lifecycle pruning: sharpening focus by cutting.

**Where (arena):** Before Step 1, capture a short **arena** block so coaching isn’t generic and the human knows the assignment’s setting:

- Industry / category
- Product or service (one line)
- Who you sell to (one line)

Seed and mutual memory may prefill arena; human can edit. Gate: paradox ack **and** arena filled enough to ground examples.

**How (worked example):** Show one miniature full arc (default Carvana-style, or an analogue closer to their arena when mutual context allows) so “stand → axis → off-axis → onlyness” is visible before they do their own. The example is teaching, not their answer.

Only then unlock Step 1.

### Step 1 — Where do you stand

Capture **problem parameters**: who hurts, what job they’re hiring for, constraints, what “solved” looks like. Coach rejects vague category wishes (“people need a website”), using arena language.

### Step 2 — Axis of better

Name the industry’s bad→good scale from Step 1. Place the idea on it. Name the outcome if they *win that race*. Surface: simple scale + “if we win this axis, customers get ___.”

### Step 3 — Step off the axis

Leave fizzy-water. Own the Coca-Cola summer-day job (feeling / ritual / identity territory) even if a rival “tastes better.” Coach blocks synonyms of Step 2’s axis.

### Step 4 — Draft onlyness

Fill: `I am the only ______ that ______`. Unique as a **paradigm**, not geographic or category scarcity. Agent may offer 2–3 candidates grounded in arena + prior understanding; human owns final wording.

### Coach budget (per step)

Stubborn or confused humans need more than one nudge; infinite roasting loses them. Per step, up to **3 coach turns**, then stop and offer exits:

| Turn | Job | Intent |
| --- | --- | --- |
| 1 | **Clarify** | Make the answer specific |
| 2 | **Ground** | Reframe using their arena / mutual context |
| 3 | **Mirror** | Adversarial “a rival could say the same…” |

After budget exhausted, surface offers calm exits (not another roast): **show examples**, **I’m stuck / need-coach** (agent may widen context or swap example), or **advance with weak flag**. Reset the 3-turn budget when the step’s substantive answer changes (not on typos).

### Mutual understanding

The skill instructs the agent to **prefer existing shared context** over starting from zero:

- Current conversation and any product/project facts already established
- Optional memory tools if connected (e.g. prior VOLUMES / brand work) — never required
- Prior local sessions in `.onlyness/` (read `result` / arena / statement for continuity)
- `seed.md` when present

Tailoring means: arena prefills, worked-example choice, coach metaphors, and candidate onlyness lines should sound like *this* human’s world. Persist what was used under `contextSources[]` on the session for transparency (not a cloud profile).

### Between steps

Human submits → `poll` → agent coaches within budget → `reply` → revise or advance. Optional seed pre-fills Step 1 as draft, marked fight-with-me. After Steps 3–4 and in truthmode, coach may ask: *If this onlyness were true, what would you cut?*

## Truthmode

Runs only after a drafted statement. Verdicts: `pass` | `weak` | `fail`. Fail/weak send back (usually Step 3 or 4) with concrete reasons.

### Pass 1 — Rubric (deterministic)

Fail or heavy-weak if the statement is mostly:

- Geographic / inventory scarcity (“only dealer on this curb”)
- Category restatement (“only used-car salesman who sells cars”)
- Axis-of-better cosplay (better / faster / cheaper / prettier / AI-powered)
- No buyer itch (missing who + job/pain)
- Anyone in the category could claim it via find-replace on the brand name

### Pass 2 — Adversarial swap

Rewrite as a generic rival’s claim. If it still works → fail (lame symmetry is the wake-up). If it breaks on a paradigm hook → evidence for pass. Result stored on session.

### Pass 3 — Carvana / Jack Black bar

On-surface prompts:

1. **Itch** — what scratch did the category ignore?
2. **Sticky** — what’s the “vending machine” (memorable mental cache)?
3. **Jack Black** — would Brad Pitts in the market sound ridiculous saying this?

Plus optional **cuts[]** for prune intent.

### Truthmode TOON output

`verdict`, `checks[]`, swap summary, itch/sticky/jack answers, `cuts[]`, `next[]` (advance / revise step N).

Sessions may end as `weak` if the human insists — labeled so downstream agents don’t treat it as gospel.

## Skill

Thin `onlyness` skill (Agent Skills format):

- When to use: positioning, USP stuckness, Pepsi Paradox, feature-creep prune, onlyness statement work
- Invoke via `npx -y onlyness-axi` (no global install required)
- Current workflow/guidance from CLI (`--help`, `playbook`) — skill file must not duplicate stale playbooks
- Before `start` / during Act 0: gather mutual context; prefill arena and pick a worked example that fits when possible
- Coach rules: up to 3 turns per step (clarify → ground → mirror), then exits; never skip Act 0 (paradox + arena + example) or truthmode; prefer send-back over pep talk on weak/fail; do not burn budget on generic lectures when arena is empty — fill arena first

## Data model

Directory: `.onlyness/<slug>/`

**`session.json` fields:**

| Field | Notes |
| --- | --- |
| `id` | Session slug |
| `createdAt` | ISO timestamp |
| `entry` | `blank` \| `seed` \| `prune` |
| `step` | Current act/step id |
| `paradoxAck` | boolean |
| `arena` | `{ industry, offering, audience }` |
| `contextSources` | What mutual context was used (chat / memory / priorSession / seed) |
| `answers` | Per-step structured answers |
| `statement` | Draft / final onlyness string |
| `truthmode` | `{ verdict, checks[], swap, itch, sticky, jackBlack, cuts[] }` |
| `coachLog` | Chronological coach/human turns |
| `coachBudget` | Per-step `{ used, max: 3, lastJob }` |

Optional `seed.md` when started with seed material.

## AXI compliance notes

Follow axi/1.0 principles: TOON output, minimal defaults, truncation with `--full`, pre-computed status, definitive empty states, structured errors/exit codes, ambient skill discovery, content-first bare invoke, contextual `next[]`, consistent `--help`. Scaffold and validate with `axi-axi` during implementation.

## Chill break (agent-only)

There is **no** always-visible escape hatch. When the human is hostile, shame-spiraling, or forcing more turns will make it worse, the agent offers **one** chill via `reply --system --offer-chill` (does not burn coach budget). Accept → `chill` / surface Accept break → `status: paused` + `chill.html`. Later `resume` restores the workshop. Do not nag if declined.

## Pitch deliverable

After truthmode, step `pitch` collects satisfaction with stand, axis, off-axis, onlyness, and the statement. Then `pitch.html` is the human deliverable: open on the onlyness statement, reverse walk 4→3→2→1 contrasting what Brad Pitts do, land on the statement again — **philosophy, not a tech stack**. Served at `GET /pitch`. `result` includes `pitchUrl` when present.

## Success criteria

- Agent can run a full blank session end-to-end via CLI alone
- Act 0 leaves the human with paradox *and* a clear assignment (arena + worked example) before Step 1
- Coach stops after 3 turns per step and offers exits instead of looping
- When prior context exists, arena/examples/candidates reflect it (`contextSources` non-empty); when not, blank path still works
- Seed and prune entry paths work without separate products
- Truthmode rejects the “only used-car salesman on this curb” class of statements
- Adversarial swap visibly wakes the human when the claim is generic
- `result` is enough for a downstream agent to write pitch copy without re-asking the four steps
- Chill is coach-offered only; paused sessions block submit until resume
- Pitch unlocks only after satisfaction; reverse walk is bookended by the statement

## Open implementation details (plan phase)

- Exact poll event schema and HTTP surface API
- Rubric scoring weights (fail vs weak thresholds)
- Package repo layout (TypeScript vs JS) and publish name confirmation
- Attribution/wording for Pepsi Paradox teaching copy (fair-use teaching, not trademark misuse in examples)
- How aggressively to scan prior `.onlyness/` sessions vs asking the human to pick one
