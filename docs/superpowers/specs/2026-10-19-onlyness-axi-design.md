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

- Walk a human through Pepsi Paradox → four steps → onlyness statement → truthmode
- Agent coaches between steps (one sharp pushback per turn)
- Optional seed (URL/one-pager/blurb); blank by default
- Truthmode: rubric + adversarial swap + Carvana/Jack Black bar
- Support **find** and **prune** entry intents
- AXI-compliant: TOON, content-first, contextual next steps, structured errors

## Non-goals (v1)

- Accounts, cloud sync, hosted multiplayer
- Auto site scraping beyond optional pasted seed
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
2. Human works current act/step on `surface.html`
3. `onlyness-axi poll <session>` — long-poll until submit, need-coach, or advance
4. Agent coaches (max one pushback), may `reply`, human revises
5. Advance: paradox → stand → axis → off-axis → onlyness draft → truthmode
6. `onlyness-axi result <session>` — worksheet + statement + truthmode verdict
7. `onlyness-axi end <session>` — close session

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

Playbook ids: `paradox`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `prune`.

## Workshop arc

### Act 0 — Pepsi Paradox

Teach why “better” isn’t the game (blind taste vs branded choice). Gate: human acknowledges “I get why better isn’t the game” before Step 1 unlocks. Copy also mentions mid-lifecycle pruning: sharpening focus by cutting.

### Step 1 — Where do you stand

Capture **problem parameters**: who hurts, what job they’re hiring for, constraints, what “solved” looks like. Coach rejects vague category wishes (“people need a website”).

### Step 2 — Axis of better

Name the industry’s bad→good scale from Step 1. Place the idea on it. Name the outcome if they *win that race*. Surface: simple scale + “if we win this axis, customers get ___.”

### Step 3 — Step off the axis

Leave fizzy-water. Own the Coca-Cola summer-day job (feeling / ritual / identity territory) even if a rival “tastes better.” Coach blocks synonyms of Step 2’s axis.

### Step 4 — Draft onlyness

Fill: `I am the only ______ that ______`. Unique as a **paradigm**, not geographic or category scarcity. Agent may offer 2–3 candidates; human owns final wording.

### Between steps

Human submits → `poll` → agent coaches → `reply` → revise or advance. Optional seed pre-fills Step 1 as draft, marked fight-with-me. After Steps 3–4 and in truthmode, coach may ask: *If this onlyness were true, what would you cut?*

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
- Coach rules: one pushback max per poll cycle; never skip Act 0 or truthmode; prefer send-back over pep talk on weak/fail

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
| `answers` | Per-step structured answers |
| `statement` | Draft / final onlyness string |
| `truthmode` | `{ verdict, checks[], swap, itch, sticky, jackBlack, cuts[] }` |
| `coachLog` | Chronological coach/human turns |

Optional `seed.md` when started with seed material.

## AXI compliance notes

Follow axi/1.0 principles: TOON output, minimal defaults, truncation with `--full`, pre-computed status, definitive empty states, structured errors/exit codes, ambient skill discovery, content-first bare invoke, contextual `next[]`, consistent `--help`. Scaffold and validate with `axi-axi` during implementation.

## Success criteria

- Agent can run a full blank session end-to-end via CLI alone
- Seed and prune entry paths work without separate products
- Truthmode rejects the “only used-car salesman on this curb” class of statements
- Adversarial swap visibly wakes the human when the claim is generic
- `result` is enough for a downstream agent to write pitch copy without re-asking the four steps

## Open implementation details (plan phase)

- Exact poll event schema and HTTP surface API
- Rubric scoring weights (fail vs weak thresholds)
- Package repo layout (TypeScript vs JS) and publish name confirmation
- Attribution/wording for Pepsi Paradox teaching copy (fair-use teaching, not trademark misuse in examples)
