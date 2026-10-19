---
name: onlyness
description: "Use when positioning, USP stuckness, Pepsi Paradox framing, feature-creep prune, or drafting an onlyness statement. Gather mutual context first; run via npx -y onlyness-axi; fetch playbooks from the CLI; coach ≤3 turns/step (clarify → ground → mirror); offer chill (reply --offer-chill) only when hostile/stuck — no permanent escape hatch; pitch.html is the philosophy deliverable after satisfaction; never skip Act 0 or truthmode."
---

# onlyness

Local-first workshop: Pepsi Paradox → onlyness statement → truthmode (built against AXI spec axi/1.0-2026-07). Run the commands below with npx — no install needed.

## When to use

Positioning, USP stuckness, Pepsi Paradox teaching, feature-creep prune, or drafting `I am the only ______ that ______`.

## How to run

- Invoke with `npx -y onlyness-axi` (no global install).
- Before `start` / during Act 0: gather **mutual context** (chat, memory tools if present, prior `.onlyness/` sessions, seed) and prefill arena / pick a fitting worked example.
- Fetch guidance on demand: `playbook <id>` (`paradox`, `arena`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `pitch`, `prune`, `coach`). Do not paste stale playbooks into this skill.

## Coach budget (per step)

Up to **3** turns, then stop and offer exits — not another roast:

1. **Clarify** — make the answer specific
2. **Ground** — reframe with their arena / mutual context
3. **Mirror** — adversarial “a rival could say the same…”

Do not burn budget on generic lectures when arena is empty — fill arena first. Prefer send-back over pep talk on weak/fail truthmode.

## Chill (agent-only)

No permanent escape hatch. If the human is hostile, shame-spiraling, or forcing more turns will make it worse: **one** offer via `reply --system --offer-chill --text "…"` (no budget burn). Accept → `chill` / surface Accept break; later `resume`. Do not nag if declined.

## Pitch deliverable

After truthmode, land on `pitch` step. When they confirm satisfaction with stand/axis/off-axis/onlyness/statement, run `pitch <id>` and open `/pitch` — reverse walk 4→3→2→1 bookended by the statement. That page is the philosophy deliverable, not a tech stack.

## Hard rules

- **Never skip Act 0** (Pepsi Paradox ack + arena + worked example) before Step 1.
- **Never skip truthmode** after a drafted onlyness statement.

## Commands

```
commands[13]{command,summary}:
  npx -y onlyness-axi start,Create session + open surface
  npx -y onlyness-axi serve <id>,Long-lived HTTP surface daemon
  npx -y onlyness-axi poll <id>,Long-poll human events
  npx -y onlyness-axi reply <id>,Post coach message to surface
  npx -y onlyness-axi advance <id>,Move to next step when gated
  npx -y onlyness-axi playbook <id>,Fetch step / coach / prune / pitch guidance
  npx -y onlyness-axi truthmode check <id>,Run Pass 1 rubric
  npx -y onlyness-axi pitch <id>,Generate reverse-walk pitch.html deliverable
  npx -y onlyness-axi chill <id>,Pause workshop (after coach offers break)
  npx -y onlyness-axi resume <id>,Unpause after chill
  npx -y onlyness-axi result <id>,Worksheet + statement + truthmode + pitchUrl
  npx -y onlyness-axi end <id>,End session; close idle servers
  npx -y onlyness-axi list,List active workshop sessions
help[3]:
  npx -y onlyness-axi start --entry blank
  npx -y onlyness-axi playbook paradox
  npx -y onlyness-axi --help
```

Every command supports `--help`. Exit codes: 0 success/no-op, 1 error, 2 usage error. All output is TOON on stdout.
