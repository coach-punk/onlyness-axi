import type { Session } from "../session/types.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function field(
  answers: Record<string, unknown>,
  key: string,
  name: string,
): string {
  const block = answers[key];
  if (!block || typeof block !== "object" || Array.isArray(block)) return "";
  const v = (block as Record<string, unknown>)[name];
  return typeof v === "string" ? v.trim() : "";
}

type ReverseBeat = {
  step: "4" | "3" | "2" | "1";
  title: string;
  yours: string;
  theirs: string;
};

function beats(session: Session): ReverseBeat[] {
  const standWho = field(session.answers, "stand", "who");
  const standJob = field(session.answers, "stand", "job");
  const standSolved = field(session.answers, "stand", "solved");
  const axisScale = field(session.answers, "axis", "scale");
  const axisPlace = field(session.answers, "axis", "place");
  const axisIfWin = field(session.answers, "axis", "ifWin");
  const territory = field(session.answers, "off_axis", "territory");
  const industry = session.arena.industry || "the category";

  return [
    {
      step: "4",
      title: "Onlyness — paradigm, not inventory",
      yours: session.statement || "(no statement yet)",
      theirs: `Brad Pitts in ${industry} keep restating the category: better, faster, cheaper — or “the only one on this curb.” Find-replace the brand name and the claim still works.`,
    },
    {
      step: "3",
      title: "Off the axis — the job they actually hire",
      yours: territory || "(no off-axis territory)",
      theirs: `Everyone else stays in the fizzy-water race on “${axisScale || "better"}.” They sell the ingredient, not the summer-day job.`,
    },
    {
      step: "2",
      title: "Axis of better — the race you refuse to win",
      yours: [
        axisScale && `Scale: ${axisScale}`,
        axisPlace && `Where we sat: ${axisPlace}`,
        axisIfWin && `If we won that race: ${axisIfWin}`,
      ]
        .filter(Boolean)
        .join(" · ") || "(no axis filled)",
      theirs: `Rivals keep climbing that same bad→good ladder. Winning it still loses the Pepsi Paradox — preference without brand ≠ choice with brand.`,
    },
    {
      step: "1",
      title: "Where you stand — the real problem parameters",
      yours: [
        standWho && `Who: ${standWho}`,
        standJob && `Job: ${standJob}`,
        standSolved && `Solved looks like: ${standSolved}`,
      ]
        .filter(Boolean)
        .join(" · ") || "(no stand filled)",
      theirs: `Most pitches skip the itch and jump to features. They describe a product; they never name who hurts or what “solved” means in that person’s world.`,
    },
  ];
}

/** Elevator pitch HTML: statement → reverse 4→3→2→1 → statement. */
export function renderPitch(session: Session): string {
  const statement = session.statement.trim() || "I am the only ______ that ______";
  const reverse = beats(session);
  const beatHtml = reverse
    .map(
      (b) => `
<section class="beat" data-step="${b.step}" id="step-${b.step}">
  <p class="eyebrow">Step ${b.step} · looking back</p>
  <h2>${escapeHtml(b.title)}</h2>
  <div class="split">
    <div>
      <p class="label">You</p>
      <p class="yours">${escapeHtml(b.yours)}</p>
    </div>
    <div>
      <p class="label">What everyone else does</p>
      <p class="theirs">${escapeHtml(b.theirs)}</p>
    </div>
  </div>
</section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Onlyness pitch</title>
<style>
  :root {
    --bg: #e8eaee;
    --surface: #f4f5f7;
    --ink: #1a1d23;
    --muted: #5c6370;
    --accent: #0b3d91;
    --line: #c5cad3;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.5;
  }
  .stage {
    max-width: 42rem;
    margin: 0 auto;
    padding: 2.5rem 1.25rem 4rem;
  }
  .hero, .landing {
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 2rem 1.5rem;
    margin-bottom: 2rem;
    opacity: 0;
    transform: translateY(12px);
    animation: rise 0.7s ease forwards;
  }
  .landing { animation-delay: 0.15s; }
  .beat {
    border-top: 1px solid var(--line);
    padding: 1.75rem 0;
    opacity: 0;
    transform: translateY(10px);
    animation: rise 0.65s ease forwards;
  }
  .beat:nth-of-type(1) { animation-delay: 0.25s; }
  .beat:nth-of-type(2) { animation-delay: 0.4s; }
  .beat:nth-of-type(3) { animation-delay: 0.55s; }
  .beat:nth-of-type(4) { animation-delay: 0.7s; }
  @keyframes rise {
    to { opacity: 1; transform: none; }
  }
  h1 {
    font-size: clamp(1.4rem, 4vw, 1.85rem);
    font-weight: 650;
    letter-spacing: -0.02em;
    margin: 0;
    color: var(--accent);
  }
  h2 {
    font-size: 1.15rem;
    margin: 0 0 0.85rem;
  }
  .eyebrow, .label {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.7rem;
    color: var(--muted);
    margin: 0 0 0.5rem;
  }
  .split {
    display: grid;
    gap: 1rem;
  }
  @media (min-width: 640px) {
    .split { grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  }
  .yours { margin: 0; color: var(--ink); }
  .theirs { margin: 0; color: var(--muted); }
  .nav {
    position: sticky;
    top: 0;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(6px);
    padding: 0.6rem 0;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }
  .nav a { color: var(--accent); margin-right: 0.85rem; text-decoration: none; }
  .nav a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="stage">
  <nav class="nav" aria-label="Pitch sections">
    <a href="#open">Statement</a>
    <a href="#step-4">4</a>
    <a href="#step-3">3</a>
    <a href="#step-2">2</a>
    <a href="#step-1">1</a>
    <a href="#close">Landing</a>
  </nav>

  <header class="hero" id="open" data-role="statement-open">
    <p class="eyebrow">Onlyness</p>
    <h1>${escapeHtml(statement)}</h1>
  </header>

  ${beatHtml}

  <footer class="landing" id="close" data-role="statement-close">
    <p class="eyebrow">Elevator landing</p>
    <h1>${escapeHtml(statement)}</h1>
    <p class="theirs" style="margin-top:1rem">That’s the philosophy — not a stack, not a feature list. The thing nobody else can find-replace.</p>
  </footer>
</div>
</body>
</html>
`;
}
