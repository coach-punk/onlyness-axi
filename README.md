# onlyness-axi

Local-first AXI workshop: Pepsi Paradox → arena → four steps → onlyness statement → truthmode → **pitch** (philosophy deliverable). Agents coach in the loop; sessions stay on disk under `.onlyness/`.

Design: [docs/superpowers/specs/2026-10-19-onlyness-axi-design.md](docs/superpowers/specs/2026-10-19-onlyness-axi-design.md)

## Quick start

```bash
# no install required
npx -y onlyness-axi start --entry blank

# or from a clone
npm install && npm run build
ONLYNESS_NO_BROWSER=1 node bin/onlyness-axi.js start --entry blank
# open the printed URL, ack paradox, fill arena, work the steps
node bin/onlyness-axi.js poll <session-id>
node bin/onlyness-axi.js playbook paradox
node bin/onlyness-axi.js truthmode check <session-id>
# after satisfaction on the pitch step:
node bin/onlyness-axi.js pitch <session-id>
# open http://127.0.0.1:<port>/pitch
node bin/onlyness-axi.js result <session-id>
node bin/onlyness-axi.js end <session-id>
```

Skill for agents: `skills/onlyness/SKILL.md` (name: `onlyness`). Regenerate with `npm run skill:gen`; drift fails `npm run skill:check`.

## Commands

| Command | Role |
| --- | --- |
| `(none)` / `list` | Active sessions (content-first home) |
| `start` | Create session; optional `--seed`, `--entry blank\|seed\|prune` |
| `serve <session>` | Long-lived HTTP surface + event bus (daemon) |
| `poll <session>` | Long-poll human submit / need-coach events |
| `reply <session>` | Post coach message; `--offer-chill` for a one-shot break offer |
| `advance <session>` | Move to next step when the gate is satisfied |
| `pitch <session>` | Generate reverse-walk `pitch.html` (philosophy deliverable) |
| `chill <session>` | Pause workshop after a coach chill offer |
| `resume <session>` | Unpause after chill |
| `result <session>` | Worksheet + statement + truthmode + `pitchUrl` |
| `end <session>` | End session; stop idle server when last ends |
| `playbook <id>` | On-demand step / coach / pitch / prune guidance |
| `truthmode check\|set-swap <session>` | Rubric, adversarial swap |
| `--help` | Concise per-subcommand reference |

Playbook ids: `paradox`, `arena`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `pitch`, `prune`, `coach`.

## Session layout

```
.onlyness/<slug>/
  session.json      # state, arena, answers, coach budget, truthmode, satisfaction
  surface.html      # workshop UI served locally
  chill.html        # pause page when status is paused
  pitch.html        # reverse-walk elevator pitch deliverable
  seed.md           # optional, when started with seed material
  server.json       # daemon pid/port while serve is running
```

All output is TOON on stdout. Exit codes: `0` success/no-op, `1` error, `2` usage error.

## Background & Attribution

The core framework in this workshop is based on the **Onlyness Statement** developed by **Marty Neumeier** in his book [*Zag: The Number One Strategy of High-Performance Brands*](https://www.martyneumeier.com/zag) (2006).

Neumeier's core thesis is that in saturated markets, being *better* on an established axis is a losing game (the Pepsi Paradox). Instead, high-performance brands "zag" when competitors "zig": they define a new, uncontested space by discovering and owning their radical differentiation.

The fundamental test is Neumeier's onlyness formula:
> **"Our brand is the ONLY ______ that ______."**
> 
> - **Part 1 (The Category / What):** What arena or paradigm you operate in.
> - **Part 2 (The Differentiator / How & Why):** The singular value, capability, or belief that no competitor can legitimately claim without sounding ridiculous.

`onlyness-axi` translates this concept into a local-first interactive workshop and AI agent protocol (AXI spec `axi/1.0-2026-07`), adding deterministic rubric testing (Truthmode Pass 1), adversarial rival claims (Pass 2), and mid-lifecycle pruning.

## License

[MIT](LICENSE) © 2026 John Stansbury

