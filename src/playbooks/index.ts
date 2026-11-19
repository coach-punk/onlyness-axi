export type PlaybookId =
  | "paradox"
  | "arena"
  | "stand"
  | "axis"
  | "off-axis"
  | "onlyness"
  | "truthmode"
  | "pitch"
  | "prune"
  | "coach";

export const PLAYBOOK_IDS: PlaybookId[] = [
  "paradox",
  "arena",
  "stand",
  "axis",
  "off-axis",
  "onlyness",
  "truthmode",
  "pitch",
  "prune",
  "coach",
];

const paradox = `# Paradox (Act 0)

## Purpose
Teach why “better” is the wrong game: blind taste vs branded choice (Pepsi Paradox). Name mid-lifecycle pruning — sharpening focus by cutting — so the human expects tradeoffs later.

## What good looks like
- Human tries the blindfold toggle on \`workshop.html\` and acknowledges the paradox.
- They can say in one sentence why winning the axis of better may still lose the market.
- Curiosity is up; defensiveness is down.

## Common fails
- Skipping Act 0 and jumping to features.
- Treating paradox as trivia instead of a framing tool.
- Coaching abstract theory with empty arena.

## Agent instructions
1. Gather mutual context (chat, memory tools, prior \`.onlyness/\` sessions, seed) before generic lecture.
2. Point them at the interactive blindfold toggle in \`workshop.html\` (or explain in chat for headless runs).
3. Record ack via canvas or \`submit <id> --json '{"paradoxAck":true}'\`; never unlock Step 1 without Act 0 complete.
4. Prefill arena via \`prefill <id>\` when context justifies it.
`;

const arena = `# Arena (Act 0)

## Purpose
Ground the workshop in a real assignment: industry/category, offering, and who you sell to — so coaching and the spatial map aren’t generic.

## What good looks like
- Three short, concrete lines (industry, offering, audience).
- Language the human already uses; \`prefill <id>\` may populate defaults + a custom \`--example-json\` specimen.
- Worked specimen (default Carvana, or arena analogue) sits visibly on the canvas as teaching, not their answer.

## Common fails
- Vague category wishes (“people need a website”).
- Empty arena while burning coach budget on lectures.
- Treating the worked specimen as the human’s draft.

## Agent instructions
1. Gather mutual context first; prefill arena via \`prefill <id>\` and record \`--source\`.
2. Do not burn coach budget until arena is filled enough to ground metaphors.
3. Gate: paradox ack + arena filled before advancing to stand.
4. Ask prune/cuts when entry is prune or after Steps 3–4: if this onlyness were true, what would you cut?
`;

const stand = `# Stand (Step 1)

## Purpose
Capture problem parameters: who hurts, what job they’re hiring for, what “solved” looks like. These stay pinned in the compass strip across Steps 2–4.

## What good looks like
- Specific who (not “everyone”).
- Clear job-to-be-done / constraint.
- Concrete solved state in the buyer’s words.

## Common fails
- Category wishes instead of pain.
- Internal product goals dressed as customer jobs.
- Answers that ignore the arena.

## Agent instructions
1. Coach within the 3-turn budget (clarify -> ground -> mirror) using \`coach <id> --text "…"\`.
2. Reject vagueness using arena language.
3. Inspect progress anytime with \`status <id>\`.
4. After a solid stand, optionally ask what they would cut if the eventual onlyness were true.
`;

const axis = `# Axis of better (Step 2)

## Purpose
Name the industry’s bad->good poles from Stand, drop Brad Pitt rivals onto the 1D spatial line, place your own marker, and name what happens if you *win that race*.

## What good looks like
- Clear \`leftPole\` and \`rightPole\` rooted in Step 1 (not a random feature list).
- Real rival markers plotted along the line showing where everyone crowds.
- Honest placement of their idea + clear “if we win this axis, customers only get ___.”

## Common fails
- Inventing a flattering axis unrelated to Stand.
- Leaving rivals empty so crowding stays invisible.
- Pretending they already own a paradigm (that’s Step 3).

## Agent instructions
1. Have them plot rivals and drag their marker on the 1D axis in \`workshop.html\` (or relay via \`submit\`).
2. When they park next to rivals, mirror how interchangeable the race looks.
3. Budget: clarify -> ground -> mirror, then exits.
4. Prune prompt when useful: winning this axis usually means cutting what?
`;

const offAxis = `# Off-axis (Step 3)

## Purpose
Leave fizzy-water competition. Open the vertical dimension on the 2D spatial canvas and drag off the crowded floor into territory (feeling / ritual / model) even if a rival “tastes better.”

## What good looks like
- Vertical dimension label (\`axisLabel\`) and \`territory\` that are not synonyms of Step 2’s axis.
- Clear vertical lift (\`selfY\`) on the 2D map leaving Brad Pitt rivals glued to the floor.
- A claim a find-replace rival cannot steal.

## Common fails
- Synonyms of the better-axis (“premium,” “faster,” “AI-powered”).
- Hovering near the floor with no real leap.
- Geographic or inventory scarcity.

## Agent instructions
1. Block axis synonyms hard; send back rather than pep-talk.
2. Use adversarial mirror: “a rival could say the same…”
3. Ask: if this off-axis territory were true, what would you cut?
4. If they later fail truthmode, return here via \`revise <id> off_axis\`.
`;

const onlyness = `# Onlyness draft (Step 4)

## Purpose
Fill \`I am the only ______ that ______\` (or \`We are / Our brand is the only\`) as a paradigm claim, not geographic or category scarcity.

## What good looks like
- Clear category noun and concrete differentiator clause tied to off-axis territory + stand.
- Survives the live rubric pre-check and the Brad Pitt find-replace preview.
- Human owns final wording (agent may offer 2–3 candidates grounded in context).

## Common fails
- “Only dealer on this curb” / inventory scarcity.
- “Only X who sells X.”
- Better/faster/cheaper cosplay.

## Agent instructions
1. Ground candidates in arena + spatial leap + mutual context.
2. Offer options; do not overwrite human ownership.
3. Ask prune/cuts: if this onlyness were true, what would you cut?
4. Advance to truthmode; never skip Pass 1–3.
`;

const truthmodePb = `# Truthmode

## Purpose
Stress-test the draft: deterministic rubric, adversarial swap, then itch / sticky / Jack Black bar (+ optional cuts).

## What good looks like
- \`truthmode check\` run with concrete fail/weak reasons.
- Pass 2 swap stored via \`truthmode set-swap\` — generic rival rewrite that breaks or exposes lame symmetry.
- Surface/chat answers for itch, sticky, jackBlack; cuts[] when prune intent.

## Common fails
- Skipping rubric or swap.
- Pep-talking past fail/weak instead of using \`revise <id> off_axis\` or \`revise <id> onlyness\`.
- Treating weak insistence as a clean pass downstream.

## Agent instructions
1. Run \`onlyness-axi truthmode check <session>\` then coach from checks.
2. Write Pass 2 with \`truthmode set-swap <id> --text "…"\`.
3. On fail or weak, prefer \`revise <id> off_axis\` / \`revise <id> onlyness\` over pep talk.
4. Include cuts question for prune paths.
`;

const prune = `# Prune entry

## Purpose
Mid-lifecycle sharpening: use onlyness work to decide what to cut, not only what to claim.

## What good looks like
- Entry \`prune\` or explicit cuts conversation.
- Cuts tied to a true onlyness (features, audiences, channels that fight the claim).
- Human leaves with a short cuts[] list on the Prune Knife board, not just a slogan.

## Common fails
- Cutting randomly without a paradigm hook.
- Using prune as an excuse to skip Act 0 or truthmode.
- Empty cuts after a “pass” statement.

## Agent instructions
1. Still run full arc: paradox -> arena -> steps -> truthmode.
2. Repeatedly ask: if this onlyness were true, what would you cut?
3. Persist cuts on truthmode / result for downstream agents.
4. Prefer mutual context (prior sessions, seed) to spot feature creep.
`;

const pitchPb = `# Pitch deliverable

## Purpose
The human-facing deliverable is a **concrete philosophy** — reverse-walk elevator pitch with their spatial map and rival contrast — not specs or a tech stack.

## What good looks like
- Truthmode is pass (or weak they own), with Pass 2 swap recorded.
- Human confirms satisfaction with stand, axis, off-axis, onlyness, **and** the statement.
- \`pitch.html\` opens on the statement, walks 4->3->2->1 against their real plotted rivals and cuts, and lands on the statement again.

## Common fails
- Generating pitch before satisfaction checkboxes or Pass 2 swap.
- Treating pitch as a feature list or stack dump.
- Skipping the reverse walk.

## Agent instructions
1. After truthmode, advance to \`pitch\` step; wait for satisfaction submit (or use \`revise\` if anything feels weak).
2. Run \`onlyness-axi pitch <id> --open\` to generate and view \`pitch.html\`.
3. Advance to \`done\` when they are happy with the pitch page.
4. \`result\` emits the complete worksheet + \`pitchFile\` path.
`;

const coach = `# Coach budget

## Purpose
Stubborn humans need nudges; infinite roasting loses them. Cap at 3 turns per step, then calm exits.

## What good looks like
| Turn | Job | Intent |
| --- | --- | --- |
| 1 | clarify | Make the answer specific |
| 2 | ground | Reframe using arena / mutual context |
| 3 | mirror | Adversarial “a rival could say the same…” |

Then surface exits: examples, stuck/need-coach, revise, or advance with weak flag. Budget resets on step advance, \`revise\`, or substantive answer change.

## Chill (agent-only)
There is **no** always-visible escape hatch. If the human is hostile, contemptuous, shame-spiraling, or clearly “not getting it” and forcing more turns will make it worse:
1. Offer **one** chill break via \`coach <id> --system --offer-chill --text "…"\` (does **not** burn coach budget).
2. Do not nag if they decline; continuing work clears it.
3. If they accept (or you run \`chill <id>\`), stop pressure — let them resume later with \`resume <id>\`.
4. Never invent a permanent “take a break” button on the workshop.

## Common fails
- Burning turns on lectures while arena is empty.
- Fourth roast after budget exhausted.
- Using \`coach\` without \`--system\` for housekeeping notes (burns budget).
- Offering chill every turn (nagging).

## Agent instructions
1. \`coach --text\` (alias \`reply\`) consumes budget unless \`--system\` or \`--offer-chill\`.
2. After exhausted, stop coaching; suggest exits, \`revise\`, or \`advance\` when gate ready.
3. Inspect anytime with \`status <id>\`; relay chat answers via \`submit <id> --json\`.
4. Never skip Act 0 or truthmode.
`;

export const PLAYBOOKS: Record<PlaybookId, string> = {
  paradox,
  arena,
  stand,
  axis,
  "off-axis": offAxis,
  onlyness,
  truthmode: truthmodePb,
  pitch: pitchPb,
  prune,
  coach,
};

export function getPlaybook(id: string): string | null {
  if (!PLAYBOOK_IDS.includes(id as PlaybookId)) return null;
  return PLAYBOOKS[id as PlaybookId];
}
