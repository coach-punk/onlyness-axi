# onlyness-axi

Local-first AXI workshop: Pepsi Paradox → arena → four steps → onlyness statement → truthmode. Agents coach in the loop; sessions stay on disk under `.onlyness/`.

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
| `reply <session>` | Post coach message onto the surface |
| `advance <session>` | Move to next step when the gate is satisfied |
| `result <session>` | Worksheet + statement + truthmode |
| `end <session>` | End session; stop idle server when last ends |
| `playbook <id>` | On-demand step / coach / prune / truthmode guidance |
| `truthmode check\|swap\|pass3 <session>` | Rubric, adversarial swap, Jack Black fields |
| `--help` | Concise per-subcommand reference |

Playbook ids: `paradox`, `arena`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `prune`, `coach`.

## Session layout

```
.onlyness/<slug>/
  session.json      # state, arena, answers, coach budget, truthmode
  surface.html      # workshop UI served locally
  seed.md           # optional, when started with seed material
```

All output is TOON on stdout. Exit codes: `0` success/no-op, `1` error, `2` usage error.
