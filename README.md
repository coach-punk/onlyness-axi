# onlyness-axi

Local-first narrated spatial AXI workshop: Pepsi Paradox → arena → 1D/2D off-axis positioning map → onlyness statement → truthmode → **pitch** (philosophy deliverable). Serves over a local loopback HTTP SSE server by default (`http://127.0.0.1:<port>/s/<token>/`) so macOS / Safari / Chrome run in a real Secure Context with full Web Speech British narration and live sync (no `file://` restrictions, no blocking `poll` loops).

Design spec: [docs/superpowers/specs/2026-10-19-onlyness-axi-design.md](docs/superpowers/specs/2026-10-19-onlyness-axi-design.md)

## Quick start

```bash
# no install required (launches local HTTP workshop server automatically)
npx -y onlyness-axi start --entry blank

# or from a clone
npm install && npm run build
ONLYNESS_NO_BROWSER=1 node bin/onlyness-axi.js start --entry blank

# headless / sandboxed run without launching a background server
node bin/onlyness-axi.js start --entry blank --no-server --no-open

# prefill arena from conversation / context
node bin/onlyness-axi.js prefill <session-id> --industry "used cars" --offering "car vending" --audience "buyers"

# inspect current state, live URL, gate, and coach job guidance
node bin/onlyness-axi.js status <session-id>

# re-open or ensure live SSE HTTP server anytime
node bin/onlyness-axi.js view <session-id> --bg

# relay answers in chat or headless mode
node bin/onlyness-axi.js submit <session-id> --json '{"paradoxAck":true}'

# coach (<=3 turns/step), check rubric, record Pass 2 swap, revise if needed
node bin/onlyness-axi.js coach <session-id> --text "Who hurts specifically?"
node bin/onlyness-axi.js truthmode check <session-id>
node bin/onlyness-axi.js truthmode set-swap <session-id> --text "Rival test..."
node bin/onlyness-axi.js revise <session-id> off_axis

# after satisfaction on the pitch step:
node bin/onlyness-axi.js pitch <session-id> --open
node bin/onlyness-axi.js result <session-id>
node bin/onlyness-axi.js end <session-id>   # stops HTTP server + marks ended
```

Skill for agents: `skills/onlyness/SKILL.md` (name: `onlyness`). Regenerate with `npm run skill:gen`; drift fails `npm run skill:check`.

## Interactive Visualizer & British Narrator

Every workshop mutation regenerates a self-contained `.onlyness/<slug>/workshop.html` stage:

- **Act 0 (Pepsi Paradox):** Interactive blind-taste vs. branded-choice comparison flip showing why winning "better" loses to sticky identity.
- **Step 2 (Axis of Better):** Interactive 1D SVG spectrum where you drop "Brad Pitt" competitors and drag your own marker to see where the category crowds.
- **Step 3 (Step Off the Axis):** Opens the vertical dimension on a 2D SVG positioning stage—drag yourself vertically off the crowded floor while rivals remain pinned below.
- **Step 4 & Truthmode Lab:** Structured `I am / We are the only [category] that [paradigm]` builder with live inline rubric checks, interactive Brad Pitt find-replace preview, and a Prune Knife board.
- **Deep British Narrator:** Toggleable Web Speech API `en-GB` voice selector with tuned lower pitch/rate and live accessible captions reacting as you flip the blindfold, crowd rivals, lift off the axis, or test a rival swap.

## Commands

| Command | Role |
| --- | --- |
| `(none)` / `list` | Active and paused sessions (`--all` includes ended) |
| `start` | Create session + launch local HTTP SSE server (`--no-server`, `--port`, `--no-open`, `--seed`, `--entry`) |
| `status <session>` | Inspect current step, gate, `coachJob`, fenced answers (`--full`) |
| `prefill <session>` | Prefill arena, `contextSources`, or custom `--example-json` |
| `submit <session>` | Apply human submission JSON from chat or clipboard (`--json`, `--file`) |
| `coach <session>` | Post coach/system message (`reply` alias; `--offer-chill` for break offer) |
| `advance <session>` | Move to next step when the gate is satisfied |
| `revise <session> <step>` | Step back to `arena`, `stand`, `axis`, `off_axis`, `onlyness`, or `truthmode` |
| `truthmode check\|set-swap` | Pass 1 deterministic rubric + Pass 2 adversarial rival swap |
| `pitch <session>` | Generate standalone reverse-walk `pitch.html` (`--open`) |
| `chill <session>` / `resume` | Pause workshop on coach break offer / resume later |
| `view <session>` | Open or ensure loopback SSE HTTP server (`--bg`, `--port`, `--no-open`) |
| `result <session>` | Full worksheet + spatial coords + truthmode + `pitchFile` (`--full`) |
| `end <session>` | Stop local HTTP server and mark session ended |
| `playbook <id>` | On-demand step / coach / pitch / prune guidance |
| `init` | Idempotently write `onlyness-axi` discovery instructions into `AGENTS.md` |
| `--help` | Concise per-subcommand reference |

Playbook ids: `paradox`, `arena`, `stand`, `axis`, `off-axis`, `onlyness`, `truthmode`, `pitch`, `prune`, `coach`.

## Session layout

```text
.onlyness/<slug>/
  session.json      # atomic versioned state, arena, 1D/2D coords, answers, truthmode, satisfaction
  server.json       # live HTTP server pid, port, and token while running
  workshop.html     # standalone fallback canvas + British narrator
  chill.html        # calm pause room when status is paused
  pitch.html        # reverse-walk 2D map + elevator pitch deliverable
  seed.md           # optional, when started with seed material
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

`onlyness-axi` translates this concept into a local-first interactive workshop and AI agent protocol (AXI spec `axi/1.0-2026-07`), adding deterministic rubric testing (Truthmode Pass 1), adversarial rival claims (Pass 2), spatial 1D→2D positioning, and mid-lifecycle pruning.

## License

[MIT](LICENSE) © 2026 John Stansbury
