export type PlaybookId =
  | "paradox"
  | "arena"
  | "stand"
  | "axis"
  | "off-axis"
  | "onlyness"
  | "truthmode"
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
  "prune",
  "coach",
];

const paradox = `# Paradox (Act 0)

## Purpose
Teach why “better” is the wrong game: blind taste vs branded choice (Pepsi Paradox). Name mid-lifecycle pruning — sharpening focus by cutting — so the human expects tradeoffs later.

## What good looks like
- Human acknowledges the paradox (not just skims).
- They can say in one sentence why winning the axis of better may still lose the market.
- Curiosity is up; defensiveness is down.

## Common fails
- Skipping ack and jumping to features.
- Treating paradox as trivia instead of a framing tool.
- Coaching abstract theory with empty arena.

## Agent instructions
1. Prefer mutual context (chat, memory tools, prior \`.onlyness/\` sessions, seed) before generic lecture.
2. Keep teaching short; point at the surface paradox copy.
3. After ack, move to arena + worked example — never unlock Step 1 without Act 0 complete.
4. Optional prune seed question: if this positioning were true, what would you cut?
`;

const arena = `# Arena (Act 0)

## Purpose
Ground the workshop in a real assignment: industry/category, offering, and who you sell to — so coaching isn’t generic.

## What good looks like
- Three short, concrete lines (industry, offering, audience).
- Language the human already uses; seed/memory may prefill.
- Worked example (default Carvana-style or arena analogue) is visible as teaching, not their answer.

## Common fails
- Vague category wishes (“people need a website”).
- Empty arena while burning coach budget on lectures.
- Treating the worked example as the human’s draft.

## Agent instructions
1. Gather mutual context first; prefill arena via \`reply --system\` when justified; record contextSources.
2. Do not burn coach budget until arena is filled enough to ground metaphors.
3. Gate: paradox ack + arena filled before advancing to stand.
4. Ask prune/cuts when entry is prune or after Steps 3–4: if this onlyness were true, what would you cut?
`;

const stand = `# Stand (Step 1)

## Purpose
Capture problem parameters: who hurts, what job they’re hiring for, what “solved” looks like.

## What good looks like
- Specific who (not “everyone”).
- Clear job-to-be-done / constraint.
- Concrete solved state in the buyer’s words.

## Common fails
- Category wishes instead of pain.
- Internal product goals dressed as customer jobs.
- Answers that ignore the arena.

## Agent instructions
1. Coach within the 3-turn budget (clarify → ground → mirror); use \`playbook coach\`.
2. Reject vagueness using arena language.
3. Prefer mutual context over starting from zero.
4. After a solid stand, optionally ask what they would cut if the eventual onlyness were true.
`;

const axis = `# Axis of better (Step 2)

## Purpose
Name the industry’s bad→good scale from Stand, place the idea on it, and name the outcome if they *win that race*.

## What good looks like
- Named scale rooted in Step 1 (not a random feature list).
- Honest placement of their idea on that scale.
- Clear “if we win this axis, customers get ___.”

## Common fails
- Inventing a flattering axis unrelated to Stand.
- Listing features instead of a single competitive scale.
- Pretending they already own a paradigm (that’s later).

## Agent instructions
1. Keep them on one axis; mirror when they sneak in onlyness claims early.
2. Ground metaphors in arena + mutual context.
3. Budget: clarify → ground → mirror, then exits.
4. Prune prompt when useful: winning this axis usually means cutting what?
`;

const offAxis = `# Off-axis (Step 3)

## Purpose
Leave fizzy-water competition. Own the territory (feeling / ritual / identity) even if a rival “tastes better.”

## What good looks like
- Territory that is not a synonym of Step 2’s axis.
- A claim a find-replace rival cannot steal.
- Language that foreshadows the onlyness draft.

## Common fails
- Synonyms of the better-axis (“premium,” “faster,” “AI-powered”).
- Geographic or inventory scarcity.
- Category restatement.

## Agent instructions
1. Block axis synonyms hard; send back rather than pep-talk.
2. Use adversarial mirror: “a rival could say the same…”
3. Ask: if this off-axis territory were true, what would you cut?
4. Do not skip ahead to truthmode; draft onlyness next.
`;

const onlyness = `# Onlyness draft (Step 4)

## Purpose
Fill \`I am the only ______ that ______\` as a paradigm claim, not geographic or category scarcity.

## What good looks like
- Starts with the onlyness frame.
- Differentiating clause tied to off-axis territory + stand.
- Human owns final wording (agent may offer 2–3 candidates).

## Common fails
- “Only dealer on this curb” / inventory scarcity.
- “Only X who sells X.”
- Better/faster/cheaper cosplay.

## Agent instructions
1. Ground candidates in arena + prior answers + mutual context.
2. Offer options; do not overwrite human ownership.
3. Ask prune/cuts: if this onlyness were true, what would you cut?
4. Advance to truthmode; never skip Pass 1–3.
`;

const truthmodePb = `# Truthmode

## Purpose
Stress-test the draft: deterministic rubric, adversarial swap, then itch / sticky / Jack Black bar (+ optional cuts).

## What good looks like
- \`truthmode check\` run with concrete fail/weak reasons.
- Pass 2 swap stored via \`set-swap\` — generic rival rewrite that breaks or exposes lame symmetry.
- Surface answers for itch, sticky, jackBlack; cuts[] when prune intent.

## Common fails
- Skipping rubric or swap.
- Pep-talking past fail/weak instead of send-back to Step 3/4.
- Treating weak insistence as a clean pass downstream.

## Agent instructions
1. Run \`onlyness-axi truthmode check <session>\` then coach from checks.
2. Write Pass 2 with \`truthmode set-swap --text\`.
3. Prefer revise over pep talk on fail/weak; weakAdvance only if human insists (label it).
4. Include cuts question for prune paths.
`;

const prune = `# Prune entry

## Purpose
Mid-lifecycle sharpening: use onlyness work to decide what to cut, not only what to claim.

## What good looks like
- Entry \`prune\` or explicit cuts conversation.
- Cuts tied to a true onlyness (features, audiences, channels that fight the claim).
- Human leaves with a short cuts[] list, not just a slogan.

## Common fails
- Cutting randomly without a paradigm hook.
- Using prune as an excuse to skip Act 0 or truthmode.
- Empty cuts after a “pass” statement.

## Agent instructions
1. Still run full arc: paradox → arena → steps → truthmode.
2. Repeatedly ask: if this onlyness were true, what would you cut?
3. Persist cuts on truthmode / result for downstream agents.
4. Prefer mutual context (prior sessions, seed) to spot feature creep.
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

Then surface exits: examples, stuck/need-coach, or advance with weak flag. Budget resets on step advance or substantive answer change.

## Common fails
- Burning turns on lectures while arena is empty.
- Fourth roast after budget exhausted.
- Using \`reply\` without \`--system\` for arena prefill / example swap (that should not burn budget).

## Agent instructions
1. \`reply --text\` consumes budget unless \`--system\`.
2. After exhausted, stop coaching; suggest exits / \`advance\` when gate ready.
3. Fetch step playbooks on demand; keep skill thin.
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
  prune,
  coach,
};

export function getPlaybook(id: string): string | null {
  if (!PLAYBOOK_IDS.includes(id as PlaybookId)) return null;
  return PLAYBOOKS[id as PlaybookId];
}
