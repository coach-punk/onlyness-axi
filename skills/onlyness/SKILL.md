---
name: onlyness
description: "Use when positioning, USP stuckness, Pepsi Paradox framing, feature-creep prune, or drafting an onlyness statement. Gather mutual context first and prefill; run statelessly via npx -y onlyness-axi; fetch playbooks from the CLI; coach ≤3 turns/step (clarify → ground → mirror); revise backwards via revise on weak/fail truthmode; offer chill (coach --offer-chill) only when hostile/stuck; pitch.html is the philosophy deliverable after satisfaction; never skip Act 0 or truthmode."
---

# onlyness

Local-first narrated spatial workshop: Pepsi Paradox → 2D off-axis map → onlyness → truthmode (built against AXI spec axi/1.0-2026-07). Run the commands below with npx — no install needed.

## When to use

Positioning, USP stuckness, Pepsi Paradox teaching, feature-creep prune, or drafting `I am the only ______ that ______`.

## How to run (stateless AXI loop)

- Invoke with `npx -y onlyness-axi` (no global install, no blocking poll loops).
- **Interaction loop**: `start` (creates session, serves interactive spatial canvas + British narrator over local loopback HTTP SSE `http://127.0.0.1:<port>/s/<token>/` for full macOS Secure Context support, or standalone `workshop.html` with `--no-server`) → gather **mutual context** and `prefill` arena → inspect via `status <id>` or relay chat answers via `submit <id> --json '…'` → coach via `coach <id> --text "…"` → `advance <id>` when gate ready (or `revise <id> <step>` to step back); `end <id>` stops the server.
- If the background server idles out or only `workshop.html` was opened, run `view <id> --bg` (or `view <id>`) to serve over HTTP.
- Fetch guidance on demand: `playbook <playbook-id>` (`paradox`, `arena`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `pitch`, `prune`, `coach`). Do not paste stale playbooks into this skill.

## Coach budget (per step)

Up to **3** turns, then stop and offer exits — not another roast:

1. **Clarify** — make the answer specific
2. **Ground** — reframe with their arena / mutual context
3. **Mirror** — adversarial “a rival could say the same…”

Do not burn budget on generic lectures when arena is empty — prefill arena first. Prefer `revise <id> off_axis` / `onlyness` over pep talk on weak/fail truthmode.

## Chill (agent-only)

No permanent escape hatch. If the human is hostile, shame-spiraling, or forcing more turns will make it worse: **one** offer via `coach <id> --system --offer-chill --text "…"` (no budget burn). Accept → `chill <id>`; later `resume <id>`. Do not nag if declined.

## Pitch deliverable

After truthmode (with Pass 2 `set-swap` recorded), land on `pitch` step. When they confirm satisfaction with stand/axis/off-axis/onlyness/statement, run `pitch <id>` and open `pitch.html` — reverse walk 4→3→2→1 plotted on their 2D spatial map, bookended by the statement.

## Hard rules

- **Never skip Act 0** (Pepsi Paradox ack + arena + worked example) before Step 1 (`weakAdvance` cannot bypass Act 0).
- **Never skip truthmode** (`check` + `set-swap`) after a drafted onlyness statement.

## Commands

```
commands[18]{command,summary}:
  npx -y onlyness-axi start,Create session + serve local HTTP workshop
  npx -y onlyness-axi status <id>,"Inspect step, gate, coach job, and answers"
  npx -y onlyness-axi prefill <id>,"Prefill arena, contextSources, and specimen"
  npx -y onlyness-axi submit <id>,Apply human submission or chat answer JSON
  npx -y onlyness-axi coach <id>,Post coach or system message (alias: reply)
  npx -y onlyness-axi advance <id>,Move to next step when gate is satisfied
  npx -y onlyness-axi revise <id> <step>,Step back to revise without losing work
  npx -y onlyness-axi truthmode check <id>,Run Pass 1 rubric
  npx -y onlyness-axi truthmode set-swap <id>,Record Pass 2 adversarial swap (--text)
  npx -y onlyness-axi pitch <id>,Generate reverse-walk pitch.html deliverable
  npx -y onlyness-axi chill <id>,Pause workshop (after coach offers break)
  npx -y onlyness-axi resume <id>,Unpause after chill
  npx -y onlyness-axi view <id>,Open or ensure live SSE HTTP workshop server
  npx -y onlyness-axi result <id>,Worksheet + statement + truthmode + pitchFile
  npx -y onlyness-axi end <id>,Stop HTTP server and end session
  npx -y onlyness-axi playbook <playbook-id>,Fetch step / coach / prune / pitch guidance
  npx -y onlyness-axi list,List active and paused sessions
  npx -y onlyness-axi init,Write onlyness-axi discovery block to AGENTS.md
help[3]:
  npx -y onlyness-axi start --entry blank
  npx -y onlyness-axi playbook paradox
  npx -y onlyness-axi --help
```

Every command supports `--help`. Exit codes: 0 success/no-op, 1 error, 2 usage error. All output is TOON on stdout.
