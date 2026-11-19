import type {
  AxisAnswer,
  CoachEntry,
  OffAxisAnswer,
  RivalMarker,
  Session,
  StandAnswer,
  StepId,
  TruthmodeState,
  WorkedExample,
} from "../session/types.js";
import { STEP_ORDER } from "../session/steps.js";
import { RUBRIC_CLIENT_RULES } from "../truthmode/rubric.js";
import { narratorClientScript, NARRATOR_SCRIPTS } from "./narrator.js";
import { KILN_FONTS_HTML, workshopCss } from "./styles.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function show(step: StepId, target: StepId): string {
  return step === target ? "" : " hidden";
}

function clamp(n: unknown, fallback = 50): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

const STEP_LABELS: Record<StepId, string> = {
  paradox: "0 Paradox",
  arena: "0 Arena",
  stand: "1 Stand",
  axis: "2 Axis",
  off_axis: "3 Off-axis",
  onlyness: "4 Onlyness",
  truthmode: "Truthmode",
  pitch: "Pitch",
  done: "Done",
};

const ICON_CHECK = `<svg class="icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3.2 8.4L6.4 11.6L12.8 4.8"/></svg>`;
const ICON_WARN = `<svg class="icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 2.2L14 13H2L8 2.2z"/><path d="M8 6.4v3.2M8 11.4v.4"/></svg>`;
const ICON_SPEAKER = `<svg class="icon" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M3 5.5v5h2.8L9.5 13V3L5.8 5.5H3zm8.2.3a.75.75 0 0 1 1.06.04 4 4 0 0 1 0 4.32.75.75 0 1 1-1.1-1.02 2.5 2.5 0 0 0 0-2.28.75.75 0 0 1 .04-1.06z"/></svg>`;
const ICON_CLOSE = `<svg class="icon" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

function coachEntriesHtml(log: CoachEntry[]): string {
  if (log.length === 0) {
    return `<p class="field-hint">No coach notes yet. Submit a step or write a note below.</p>`;
  }
  return log
    .slice(-14)
    .map((e) => {
      const roleLabel =
        e.role === "coach"
          ? `Coach (${e.job ?? "note"})`
          : e.role === "human"
            ? "You"
            : "System";
      return `<div class="coach-entry" data-role="${escapeHtml(e.role)}">
        <span class="coach-meta">${escapeHtml(roleLabel)} | ${escapeHtml(STEP_LABELS[e.step] ?? e.step)}</span>
        <p class="coach-text">${escapeHtml(e.text)}</p>
      </div>`;
    })
    .join("\n");
}

function truthmodeServerVerdictHtml(t: TruthmodeState | null): string {
  if (!t || t.verdict === null) {
    return `<div class="lint-item" data-severity="weak">${ICON_WARN}<span>Run truthmode check via your coach to score the statement against the rubric.</span></div>`;
  }
  const icon = t.verdict === "pass" ? ICON_CHECK : ICON_WARN;
  const sev = t.verdict === "pass" ? "pass" : t.verdict === "fail" ? "fail" : "weak";
  const checks = t.checks
    .map((c) => {
      const cIcon = c.severity === "fail" ? ICON_WARN : ICON_WARN;
      return `<li class="lint-item" data-severity="${escapeHtml(c.severity)}">${cIcon}<span><strong>${escapeHtml(c.id)}:</strong> ${escapeHtml(c.detail)}</span></li>`;
    })
    .join("");
  return `<div class="lint-item" data-severity="${sev}">${icon}<span><strong>Rubric verdict:</strong> ${escapeHtml(t.verdict)}</span></div>${checks ? `<ul class="lint-list">${checks}</ul>` : ""}`;
}

function renderWorkedExampleSvg(ex: WorkedExample): string {
  const padL = 42;
  const padR = 42;
  const width = 460;
  const floorY = 186;
  const topY = 36;
  const spanW = width - padL - padR;
  const spanH = floorY - topY;
  const toX = (p: number) => Math.round(padL + (clamp(p) / 100) * spanW);
  const toY = (p: number) => Math.round(floorY - (clamp(p) / 100) * spanH);

  const fx = toX(ex.axisPointX);
  const px = toX(ex.offAxisX);
  const py = toY(ex.offAxisY);

  const rivalDots = ex.rivals
    .map((r) => {
      const rx = toX(r.x);
      return `<circle cx="${rx}" cy="${floorY}" r="5" fill="var(--color-paper-3)" stroke="var(--color-muted)" stroke-width="1.5" />
      <text x="${rx}" y="${floorY + 18}" text-anchor="middle" class="svg-label">${escapeHtml(r.label)}</text>`;
    })
    .join("\n");

  return `<svg class="spatial-svg" viewBox="0 0 460 226" role="img" aria-label="Worked specimen map for ${escapeHtml(ex.name)}">
    <title>${escapeHtml(ex.name)} positioning specimen</title>
    <line x1="${padL}" y1="${topY}" x2="${padL}" y2="${floorY}" stroke="var(--color-rule)" stroke-width="1" />
    <line x1="${padL}" y1="${floorY}" x2="${width - padR}" y2="${floorY}" stroke="var(--color-field-border)" stroke-width="2" />
    <text x="${padL}" y="22" class="svg-label--strong">${escapeHtml(ex.offAxisLabel)}</text>
    <text x="${padL}" y="216" class="svg-label">${escapeHtml(ex.axisLeft)}</text>
    <text x="${width - padR}" y="216" text-anchor="end" class="svg-label">${escapeHtml(ex.axisRight)}</text>
    ${rivalDots}
    <circle cx="${fx}" cy="${floorY}" r="5" fill="var(--color-paper)" stroke="var(--color-muted)" stroke-width="1.5" stroke-dasharray="3 2" />
    <path d="M ${fx} ${floorY} Q ${Math.round((fx + px) / 2)} ${Math.round((floorY + py) / 2 - 14)} ${px} ${py}" fill="none" stroke="var(--color-accent)" stroke-width="2" />
    <circle cx="${px}" cy="${py}" r="11" fill="var(--color-accent)" />
    <text x="${px}" y="${py + 4}" text-anchor="middle" class="svg-label--marker">Ex</text>
  </svg>`;
}

export function renderWorkshop(
  session: Session,
  runtime: { live: boolean; token: string } = { live: false, token: "" },
): string {
  const step = session.step;
  const isLive = Boolean(runtime.live && runtime.token);
  const stand = (session.answers.stand ?? {}) as Partial<StandAnswer>;
  const axis = (session.answers.axis ?? {}) as Partial<AxisAnswer>;
  const off = (session.answers.off_axis ?? {}) as Partial<OffAxisAnswer>;
  const tm = session.truthmode;
  const sat = session.satisfaction;

  const axisSelfX = clamp(axis.selfX, 68);
  const offSelfX = clamp(off.selfX, axisSelfX);
  const offSelfY = clamp(off.selfY, 20);
  const rivals: RivalMarker[] = Array.isArray(axis.rivals) ? axis.rivals : [];
  const cuts = tm?.cuts ?? [];

  const activeStepIdx = STEP_ORDER.indexOf(step);
  const stepNavHtml = STEP_ORDER.map((id, idx) => {
    const current = id === step ? ' aria-current="step"' : "";
    const state = idx < activeStepIdx ? "done" : id === step ? "active" : "todo";
    return `<li><span class="step-chip" data-step-chip="${escapeHtml(id)}" data-state="${state}"${current}>${escapeHtml(STEP_LABELS[id])}</span></li>`;
  }).join("");

  const showCompass = ["axis", "off_axis", "onlyness", "truthmode", "pitch"].includes(step);
  const showExits =
    session.coachBudget.used >= session.coachBudget.max &&
    ["stand", "axis", "off_axis", "onlyness", "truthmode"].includes(step);
  const chillOffered = Boolean(session.chillOfferedAt);
  const initialNarratorKey =
    step === "off_axis"
      ? "off_axis_intro"
      : step === "paradox"
        ? "paradox_intro"
        : step === "arena"
          ? "arena_intro"
          : step === "stand"
            ? "stand_intro"
            : step === "axis"
              ? "axis_intro"
              : step === "onlyness"
                ? "onlyness_intro"
                : step === "truthmode"
                  ? "truthmode_intro"
                  : step === "pitch"
                    ? "pitch_intro"
                    : "done";

  const pitchHref = isLive
    ? `/s/${encodeURIComponent(runtime.token)}/pitch`
    : "./pitch.html";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Interactive Onlyness spatial positioning workshop." />
<title>Onlyness workshop | ${escapeHtml(session.id)}</title>
${KILN_FONTS_HTML}
<style>
${workshopCss()}
</style>
</head>
<body>
<a href="#workshop-main" class="skip-link visually-hidden">Skip to content</a>

<div class="stage-shell">
  <header class="stage-header">
    <div class="stage-header__inner">
      <div class="brand-lockup">
        <h1>Onlyness workshop</h1>
        <div class="session-meta">
          <span class="mono">${escapeHtml(session.id)}</span>
          <span id="header-step-name">${escapeHtml(STEP_LABELS[step])}</span>
          <span class="mode-badge" id="sync-badge" data-live="${isLive ? "true" : "false"}">${isLive ? "Live SSE sync" : "Standalone canvas"}</span>
        </div>
      </div>
      <div class="session-meta">
        <span>Entry: <strong id="entry-kind">${escapeHtml(session.entry)}</strong></span>
        <span>Coach budget: <strong id="coach-budget-header" class="tabular">${session.coachBudget.used}/${session.coachBudget.max}</strong></span>
      </div>
    </div>
    <nav class="step-rail" aria-label="Workshop steps">
      <ol id="step-rail-list">${stepNavHtml}</ol>
    </nav>
  </header>

  <div class="stage-layout">
    <main id="workshop-main" class="stage-main" tabindex="-1">
      <section id="compass-strip" class="compass-strip${showCompass ? "" : " hidden"}" aria-label="Pinned Stand anchor">
        <div class="compass-item">
          <p class="compass-key">Who hurts</p>
          <p class="compass-val" id="compass-who">${escapeHtml(stand.who || "Not defined yet")}</p>
        </div>
        <div class="compass-item">
          <p class="compass-key">Job hired for</p>
          <p class="compass-val" id="compass-job">${escapeHtml(stand.job || "Not defined yet")}</p>
        </div>
        <div class="compass-item">
          <p class="compass-key">Solved looks like</p>
          <p class="compass-val" id="compass-solved">${escapeHtml(stand.solved || "Not defined yet")}</p>
        </div>
      </section>

      <!-- ACT 0: PEPSI PARADOX -->
      <section id="sec-paradox" class="well${show(step, "paradox")}" aria-labelledby="h-paradox">
        <div class="stage-head">
          <h2 id="h-paradox">Act 0: The Pepsi Paradox</h2>
          <span class="field-hint">Why winning the axis of better still loses</span>
        </div>
        <p class="stage-lead">In blind taste tests, consumers routinely prefer Pepsi. Once they can see the label, preference swings decisively to Coca-Cola. People buy a sticky identity, not a slightly sweeter formula.</p>

        <div class="paradox-lab">
          <div>
            <div class="paradox-cups" role="group" aria-label="Taste test perspective">
              <button type="button" class="btn--secondary" id="btn-paradox-blind" aria-pressed="${session.paradoxRevealed ? "false" : "true"}">Blind taste test</button>
              <button type="button" class="btn--primary" id="btn-paradox-branded" aria-pressed="${session.paradoxRevealed ? "true" : "false"}">Remove blindfold</button>
            </div>
            <p class="field-hint" id="paradox-caption" style="margin-top: var(--space-sm);">
              ${session.paradoxRevealed ? "Branded choice: 65% pick Coca-Cola despite Pepsi winning the blind sip." : "Blindfolded sip: 57% prefer the sweeter challenger."}
            </p>
          </div>
          <div>
            <svg id="paradox-svg" class="spatial-svg" viewBox="0 0 360 132" role="img" aria-label="Blind taste versus branded choice comparison chart">
              <title>Pepsi Paradox preference shift</title>
              <text x="8" y="28" class="svg-label--strong" id="paradox-bar1-label">${session.paradoxRevealed ? "Coca-Cola (branded)" : "Pepsi (blind sip)"}</text>
              <rect x="8" y="36" width="260" height="18" rx="4" fill="var(--color-paper-3)" />
              <rect id="paradox-bar1-fill" x="8" y="36" width="260" height="18" rx="4" fill="var(--color-accent)" style="transform-box: fill-box; transform-origin: left center; transform: scaleX(${session.paradoxRevealed ? "0.65" : "0.57"}); transition: transform var(--dur-long) var(--ease-out);" />
              <text x="278" y="50" class="svg-label--strong tabular" id="paradox-bar1-pct">${session.paradoxRevealed ? "65%" : "57%"}</text>

              <text x="8" y="84" class="svg-label" id="paradox-bar2-label">${session.paradoxRevealed ? "Pepsi (branded)" : "Coca-Cola (blind sip)"}</text>
              <rect x="8" y="92" width="260" height="18" rx="4" fill="var(--color-paper-3)" />
              <rect id="paradox-bar2-fill" x="8" y="92" width="260" height="18" rx="4" fill="var(--color-muted)" style="transform-box: fill-box; transform-origin: left center; transform: scaleX(${session.paradoxRevealed ? "0.35" : "0.43"}); transition: transform var(--dur-long) var(--ease-out);" />
              <text x="278" y="106" class="svg-label tabular" id="paradox-bar2-pct">${session.paradoxRevealed ? "35%" : "43%"}</text>
            </svg>
          </div>
        </div>

        <label class="check-row" for="paradoxAck">
          <input type="checkbox" id="paradoxAck" ${session.paradoxAck ? "checked" : ""} />
          <span>I acknowledge the Pepsi Paradox: being measurably better on an existing axis is not onlyness.</span>
        </label>
        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-paradox">Save acknowledgment</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-paradox">Next step</button>
        </div>
      </section>

      <!-- ACT 0: ARENA + WORKED SPECIMEN -->
      <section id="sec-arena" class="well${show(step, "arena")}" aria-labelledby="h-arena">
        <div class="stage-head">
          <h2 id="h-arena">Act 0: Set the arena</h2>
          <span class="field-hint">Ground coaching in your real market</span>
        </div>
        <div class="field-grid">
          <div>
            <label for="arena-industry">Industry or category</label>
            <input type="text" id="arena-industry" value="${escapeHtml(session.arena.industry)}" placeholder="Used automotive retail" />
          </div>
          <div>
            <label for="arena-offering">Product or service (one plain line)</label>
            <input type="text" id="arena-offering" value="${escapeHtml(session.arena.offering)}" placeholder="Online used-car retail with tower pickup" />
          </div>
          <div>
            <label for="arena-audience">Who you sell to</label>
            <input type="text" id="arena-audience" value="${escapeHtml(session.arena.audience)}" placeholder="First-time car buyers avoiding dealerships" />
          </div>
        </div>

        <div style="margin-top: var(--space-lg); padding-top: var(--space-lg); border-top: var(--rule-hair) solid var(--color-rule);">
          <h3 id="specimen-title">Worked specimen: ${escapeHtml(session.workedExample.name)}</h3>
          <div class="spatial-frame">
            ${renderWorkedExampleSvg(session.workedExample)}
          </div>
          <p class="field-hint"><strong>Stand:</strong> ${escapeHtml(session.workedExample.stand)}</p>
          <p class="field-hint"><strong>Onlyness:</strong> ${escapeHtml(session.workedExample.statement)}</p>
        </div>

        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-arena">Save arena</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-arena">Next step</button>
        </div>
      </section>

      <!-- STEP 1: STAND -->
      <section id="sec-stand" class="well${show(step, "stand")}" aria-labelledby="h-stand">
        <div class="stage-head">
          <h2 id="h-stand">Step 1: Where do you stand</h2>
          <span class="field-hint">Problem parameters before solutions</span>
        </div>
        ${session.seedPreview ? `<details style="margin-bottom: var(--space-md);"><summary>Seed material (fight with it)</summary><p class="field-hint" style="margin-top: var(--space-xs);">${escapeHtml(session.seedPreview)}</p></details>` : ""}
        <div class="field-grid">
          <div>
            <label for="stand-who">Who hurts</label>
            <input type="text" id="stand-who" value="${escapeHtml(stand.who ?? "")}" placeholder="Name the exact buyer, not everyone" />
          </div>
          <div>
            <label for="stand-job">Job they are hiring for</label>
            <input type="text" id="stand-job" value="${escapeHtml(stand.job ?? "")}" placeholder="What broken ritual are they paying to escape?" />
          </div>
          <div>
            <label for="stand-solved">What solved looks like</label>
            <textarea id="stand-solved" placeholder="Observable relief in the customer’s own words">${escapeHtml(stand.solved ?? "")}</textarea>
          </div>
        </div>
        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-stand">Save stand</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-stand">Next step</button>
        </div>
      </section>

      <!-- STEP 2: AXIS OF BETTER (INTERACTIVE 1D SPECTRUM) -->
      <section id="sec-axis" class="well${show(step, "axis")}" aria-labelledby="h-axis">
        <div class="stage-head">
          <h2 id="h-axis">Step 2: The Axis of Better</h2>
          <span class="field-hint">Drop your rivals on the line, then place yourself</span>
        </div>
        <div class="field-grid field-grid--two">
          <div>
            <label for="axis-left-pole">Left pole (bad)</label>
            <input type="text" id="axis-left-pole" value="${escapeHtml(axis.leftPole ?? "")}" placeholder="Slow, opaque quotes" />
          </div>
          <div>
            <label for="axis-right-pole">Right pole (better)</label>
            <input type="text" id="axis-right-pole" value="${escapeHtml(axis.rightPole ?? "")}" placeholder="Instant lowest price" />
          </div>
        </div>

        <div class="spatial-frame">
          <svg id="svg-axis-1d" class="spatial-svg" viewBox="0 0 600 180" role="img" aria-label="Interactive 1D Axis of Better positioning line">
            <title>Axis of Better 1D positioning line</title>
            <line x1="48" y1="92" x2="552" y2="92" stroke="var(--color-field-border)" stroke-width="2" />
            <text id="svg1-left-label" x="48" y="148" class="svg-label">${escapeHtml(axis.leftPole || "Bad pole")}</text>
            <text id="svg1-right-label" x="552" y="148" text-anchor="end" class="svg-label">${escapeHtml(axis.rightPole || "Better pole")}</text>
            <g id="svg1-rivals-layer"></g>
            <g id="svg1-self-node" class="drag-node" tabindex="0" role="slider" aria-label="Your position on the Axis of Better" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${axisSelfX}">
              <circle cx="380" cy="92" r="16" fill="var(--color-accent)" />
              <text x="380" y="96" text-anchor="middle" class="svg-label--marker">You</text>
            </g>
          </svg>
          <p id="axis-crowd-status" class="field-hint tabular">Drag You or use Left and Right arrow keys. Position: ${axisSelfX} of 100.</p>
        </div>

        <div class="rival-add">
          <label for="rival-new-label" class="visually-hidden">Add a Brad Pitt competitor</label>
          <input type="text" id="rival-new-label" placeholder="Add a competitor (Brad Pitt)" />
          <button type="button" class="btn--secondary" id="btn-add-rival">Drop on axis</button>
        </div>
        <div id="rival-pill-list" class="rival-row" aria-label="Plotted competitors"></div>

        <div style="margin-top: var(--space-md);">
          <label for="axis-if-win">If we win this axis, customers only get</label>
          <textarea id="axis-if-win" placeholder="What happens if you out-Pepsi everyone on this exact scale?">${escapeHtml(axis.ifWin ?? "")}</textarea>
        </div>

        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-axis">Save axis</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-axis">Next step</button>
          <button type="button" class="btn--ghost" id="btn-revise-from-axis-to-stand">Revise stand</button>
        </div>
      </section>

      <!-- STEP 3: OFF-AXIS (1D -> 2D SPATIAL LEAP) -->
      <section id="sec-off-axis" class="well${show(step, "off_axis")}" aria-labelledby="h-off-axis">
        <div class="stage-head">
          <h2 id="h-off-axis">Step 3: Step off the axis</h2>
          <span class="field-hint">Drag your marker vertically out of the crowded race</span>
        </div>
        <div>
          <label for="off-axis-label">New vertical dimension (ritual, feeling, or model)</label>
          <input type="text" id="off-axis-label" value="${escapeHtml(off.axisLabel ?? "")}" placeholder="Self-service vending theater instead of dealership negotiation" />
        </div>

        <div class="spatial-frame">
          <svg id="svg-off-axis-2d" class="spatial-svg" viewBox="0 0 600 320" role="img" aria-label="Interactive 2D spatial map for stepping off the Axis of Better">
            <title>2D Off-Axis Spatial Leap</title>
            <line x1="56" y1="36" x2="56" y2="262" stroke="var(--color-rule)" stroke-width="1" />
            <line x1="56" y1="149" x2="552" y2="149" stroke="var(--color-rule)" stroke-width="1" />
            <line x1="56" y1="262" x2="552" y2="262" stroke="var(--color-field-border)" stroke-width="2" />
            <text id="svg2-y-label" x="56" y="24" class="svg-label--strong">${escapeHtml(off.axisLabel || "Uncontested dimension")}</text>
            <text id="svg2-left-label" x="56" y="294" class="svg-label">${escapeHtml(axis.leftPole || "Bad pole")}</text>
            <text id="svg2-right-label" x="552" y="294" text-anchor="end" class="svg-label">${escapeHtml(axis.rightPole || "Better pole")}</text>
            <g id="svg2-rivals-layer"></g>
            <circle id="svg2-floor-ghost" cx="380" cy="262" r="6" fill="var(--color-paper)" stroke="var(--color-muted)" stroke-width="2" stroke-dasharray="3 2" />
            <path id="svg2-leap-path" d="M 380 262 Q 380 180 380 120" fill="none" stroke="var(--color-accent)" stroke-width="2.5" />
            <g id="svg2-self-node" class="drag-node" tabindex="0" role="slider" aria-label="Your off-axis position. Use arrow keys to move horizontally and vertically off the floor." aria-valuemin="0" aria-valuemax="100" aria-valuenow="${offSelfY}">
              <circle cx="380" cy="120" r="16" fill="var(--color-accent)" />
              <text x="380" y="124" text-anchor="middle" class="svg-label--marker">You</text>
            </g>
          </svg>
          <p id="off-axis-altitude" class="field-hint tabular">Drag You anywhere on the 2D stage or use all four arrow keys. Vertical lift: ${offSelfY}% off the axis.</p>
        </div>

        <div>
          <label for="off-territory">Name the off-axis territory (not a synonym of Step 2)</label>
          <textarea id="off-territory" placeholder="What territory do you own even if a rival technically scores higher on the old axis?">${escapeHtml(off.territory ?? "")}</textarea>
        </div>

        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-off">Save off-axis leap</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-off-axis">Next step</button>
          <button type="button" class="btn--ghost" id="btn-revise-from-off-to-axis">Revise axis</button>
        </div>
      </section>

      <!-- STEP 4: ONLYNESS + LIVE LINT + BRAD PITT SWAP -->
      <section id="sec-onlyness" class="well${show(step, "onlyness")}" aria-labelledby="h-onlyness">
        <div class="stage-head">
          <h2 id="h-onlyness">Step 4: Draft your Onlyness</h2>
          <span class="field-hint">Paradigm claim with live truthmode lint</span>
        </div>

        <div class="field-grid field-grid--two">
          <div>
            <label for="stmt-prefix">Subject opener</label>
            <select id="stmt-prefix">
              <option value="I am the only">I am the only</option>
              <option value="We are the only">We are the only</option>
              <option value="Our brand is the only">Our brand is the only</option>
            </select>
          </div>
          <div>
            <label for="stmt-category">Category or noun</label>
            <input type="text" id="stmt-category" placeholder="car retailer" />
          </div>
        </div>
        <div style="margin-top: var(--space-md);">
          <label for="stmt-diff">That-clause (the paradigm hook)</label>
          <input type="text" id="stmt-diff" placeholder="that sells cars from a vending machine" />
        </div>

        <div class="formula-preview" id="statement-live-preview">${escapeHtml(session.statement || "I am the only ______ that ______")}</div>

        <div>
          <label for="statement">Full onlyness statement (editable)</label>
          <textarea id="statement" placeholder="I am the only ______ that ______">${escapeHtml(session.statement)}</textarea>
        </div>

        <ul id="live-lint-list" class="lint-list" aria-label="Live rubric pre-check"></ul>

        <div class="brad-pitt-box">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-sm);">
            <strong>Brad Pitt find-replace simulator</strong>
            <div style="display: flex; gap: var(--space-xs);">
              <button type="button" class="btn--secondary btn--compact" id="btn-brad-toggle" aria-pressed="false">Swap brand name</button>
              <button type="button" class="btn--ghost btn--compact" id="btn-brad-speak">${ICON_SPEAKER}<span>Read rival aloud</span></button>
            </div>
          </div>
          <p id="brad-pitt-text" class="field-hint" style="margin-top: var(--space-xs); color: var(--color-ink-2);"></p>
        </div>

        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-statement">Save statement</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-onlyness">Next step</button>
          <button type="button" class="btn--ghost" id="btn-revise-from-only-to-off">Revise off-axis</button>
        </div>
      </section>

      <!-- TRUTHMODE + PRUNE KNIFE -->
      <section id="sec-truthmode" class="well${show(step, "truthmode")}" aria-labelledby="h-truthmode">
        <div class="stage-head">
          <h2 id="h-truthmode">Truthmode stress test</h2>
          <span class="field-hint">Rubric, adversarial swap, and cuts</span>
        </div>

        <div id="truthmode-verdict-box">${truthmodeServerVerdictHtml(tm)}</div>

        <div class="split-compare">
          <div>
            <p class="field-label">Your statement</p>
            <p id="tm-statement-display">${escapeHtml(session.statement || "No statement yet.")}</p>
          </div>
          <div>
            <p class="field-label">Pass 2 adversarial swap (from coach)</p>
            <p id="tm-swap-display">${escapeHtml(tm?.swap || "Waiting for coach to run truthmode set-swap.")}</p>
          </div>
        </div>

        <div class="field-grid">
          <div>
            <label for="tm-itch">Itch: what buyer scratch did the category ignore?</label>
            <textarea id="tm-itch">${escapeHtml(tm?.itch ?? "")}</textarea>
          </div>
          <div>
            <label for="tm-sticky">Sticky: what is the mental vending machine people repeat?</label>
            <textarea id="tm-sticky">${escapeHtml(tm?.sticky ?? "")}</textarea>
          </div>
          <div>
            <label for="tm-jack">Jack Black test: why would Brad Pitts sound ridiculous saying this?</label>
            <textarea id="tm-jack">${escapeHtml(tm?.jackBlack ?? "")}</textarea>
          </div>
        </div>

        <div style="margin-top: var(--space-lg); padding-top: var(--space-md); border-top: var(--rule-hair) solid var(--color-rule);">
          <label for="cut-new-input">${session.entry === "prune" ? "Prune knife (primary focus): if this onlyness were true, what must you cut?" : "Prune knife (optional): what features or audiences would you cut?"}</label>
          <div class="rival-add">
            <input type="text" id="cut-new-input" placeholder="Custom enterprise tier, side-by-side quote tables..." />
            <button type="button" class="btn--secondary" id="btn-add-cut">Add cut</button>
          </div>
          <div id="cuts-chip-list" class="cuts-list">${cuts.map((c, i) => `<span class="cut-chip">${escapeHtml(c)}<button type="button" data-cut-idx="${i}" aria-label="Remove cut ${escapeHtml(c)}">${ICON_CLOSE}</button></span>`).join("")}</div>
          <label for="tm-cuts" class="visually-hidden">Cuts list (one per line)</label>
          <textarea id="tm-cuts" class="hidden">${escapeHtml(cuts.join("\n"))}</textarea>
        </div>

        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-truthmode">Save truthmode</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-truthmode">Next step</button>
          <button type="button" class="btn--secondary" id="btn-revise-off-axis">Revise off-axis</button>
          <button type="button" class="btn--secondary" id="btn-revise-statement">Revise statement</button>
        </div>
      </section>

      <!-- PITCH SATISFACTION -->
      <section id="sec-pitch" class="well${show(step, "pitch")}" aria-labelledby="h-pitch">
        <div class="stage-head">
          <h2 id="h-pitch">Confirm pitch satisfaction</h2>
          <span class="field-hint">Confirm every beat before generating pitch.html</span>
        </div>
        <div class="formula-preview" id="pitch-statement-display">${escapeHtml(session.statement || "No statement yet.")}</div>
        <div class="field-grid">
          <label class="check-row" for="sat-stand"><input type="checkbox" id="sat-stand" ${sat.stand ? "checked" : ""} /><span>Satisfied with Step 1: Stand (who hurts and solved state)</span></label>
          <label class="check-row" for="sat-axis"><input type="checkbox" id="sat-axis" ${sat.axis ? "checked" : ""} /><span>Satisfied with Step 2: Axis of better and plotted rivals</span></label>
          <label class="check-row" for="sat-off"><input type="checkbox" id="sat-off" ${sat.off_axis ? "checked" : ""} /><span>Satisfied with Step 3: Stepping off the axis</span></label>
          <label class="check-row" for="sat-only"><input type="checkbox" id="sat-only" ${sat.onlyness ? "checked" : ""} /><span>Satisfied with Step 4: Onlyness draft and truthmode proof</span></label>
          <label class="check-row" for="sat-stmt"><input type="checkbox" id="sat-stmt" ${sat.statement ? "checked" : ""} /><span>Satisfied with the final statement wording</span></label>
        </div>
        <div class="actions-row">
          <button type="button" class="btn--primary" id="btn-submit-satisfaction">Save satisfaction</button>
          <button type="button" class="btn--secondary${isLive ? "" : " hidden"}" id="btn-next-pitch">Next step</button>
          <button type="button" class="btn--secondary" id="btn-revise-from-pitch">Revise statement</button>
        </div>
      </section>

      <!-- DONE -->
      <section id="sec-done" class="well${show(step, "done")}" aria-labelledby="h-done">
        <div class="stage-head">
          <h2 id="h-done">Workshop complete</h2>
          <span class="field-hint">Your philosophy deliverable is ready</span>
        </div>
        <div class="formula-preview" id="done-statement-display">${escapeHtml(session.statement || "No statement recorded.")}</div>
        <div id="done-verdict-box">${truthmodeServerVerdictHtml(tm)}</div>
        <div class="actions-row">
          <a href="${escapeHtml(pitchHref)}" class="btn btn--primary" id="done-pitch-link">Open pitch deliverable</a>
        </div>
      </section>
    </main>

    <aside id="coach-rail" class="coach-rail" aria-label="Coaching drawer">
      <section class="well">
        <div class="coach-head">
          <h2>Coach</h2>
          <span id="coach-budget-aside" class="coach-budget tabular">Turn ${session.coachBudget.used} of ${session.coachBudget.max}${session.coachBudget.lastJob ? ` (${escapeHtml(session.coachBudget.lastJob)})` : ""}</span>
        </div>

        <div id="coach-log" class="coach-log">${coachEntriesHtml(session.coachLog)}</div>

        <div style="display: grid; gap: var(--space-xs);">
          <label for="human-msg">Reply to coach</label>
          <textarea id="human-msg" placeholder="Push back, answer a coaching question, or explain context..."></textarea>
          <button type="button" class="btn--secondary" id="btn-send-human-msg">Send note to coach</button>
        </div>

        <div id="chill-offer" class="exits-box${chillOffered ? "" : " hidden"}">
          <p class="field-hint">Coach offered a pause room if pushing harder now will backfire.</p>
          <button type="button" class="btn--secondary" id="btn-accept-chill">Accept break</button>
        </div>

        <div id="exhausted-exits" class="exits-box${showExits ? "" : " hidden"}">
          <p class="field-hint">Three coach turns used on this step. Calm exits:</p>
          <button type="button" class="btn--secondary" id="btn-examples">Show worked examples</button>
          <button type="button" class="btn--secondary" id="btn-stuck">I am stuck (request widen)</button>
          <button type="button" class="btn--primary" id="btn-weak">Advance with weak flag</button>
        </div>

        <div class="sync-footer">
          <button type="button" class="btn--ghost${isLive ? " hidden" : ""}" id="btn-copy-submit">Copy update for coach</button>
          <p id="status" class="status-line" role="status" aria-live="polite"></p>
        </div>
      </section>
    </aside>
  </div>
</div>

<div class="narrator-bar" role="region" aria-label="British narrator controls and captions">
  <div class="narrator-bar__inner">
    <div class="narrator-caption">
      <span class="narrator-tag">Narrator</span>
      <p id="narrator-line" class="narrator-line" aria-live="polite">${escapeHtml(NARRATOR_SCRIPTS[initialNarratorKey])}</p>
    </div>
    <div class="narrator-controls">
      <label for="narrator-voice-select" class="visually-hidden">Narrator voice</label>
      <select id="narrator-voice-select" class="narrator-select"></select>
      <button type="button" class="btn--secondary btn--compact" id="narrator-toggle" aria-pressed="false">${ICON_SPEAKER}<span data-label="1">Voice off</span></button>
      <button type="button" class="btn--ghost btn--compact" id="narrator-replay">Replay</button>
    </div>
  </div>
</div>

<script id="session-data" type="application/json">${safeJsonScript(session)}</script>
<script id="runtime-config" type="application/json">${safeJsonScript({
    live: isLive,
    token: isLive ? runtime.token : "",
    rubricRules: RUBRIC_CLIENT_RULES,
    narratorScripts: NARRATOR_SCRIPTS,
    stepOrder: STEP_ORDER,
    stepLabels: STEP_LABELS,
  })}</script>

<script>
${narratorClientScript()}
(function () {
  function readJson(id) {
    var el = document.getElementById(id);
    if (!el) return {};
    try { return JSON.parse(el.textContent || "{}"); } catch (e) { return {}; }
  }

  var state = readJson("session-data");
  var cfg = readJson("runtime-config");
  var rules = cfg.rubricRules || {};
  var scripts = cfg.narratorScripts || {};
  var DRAFT_KEY = "onlyness_draft_" + (state.id || "default");
  var statusEl = document.getElementById("status");
  var dirtyFields = {};
  var spokenHints = {};

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function el(id) { return document.getElementById(id); }

  function val(id) {
    var node = el(id);
    return node ? (node.value || "") : "";
  }

  function setValSafe(id, nextVal) {
    var node = el(id);
    if (!node || dirtyFields[id] || document.activeElement === node) return;
    if (node.value !== nextVal) node.value = nextVal;
  }

  function saveDraftLocal() {
    try {
      var snap = {
        paradoxAck: !!(el("paradoxAck") && el("paradoxAck").checked),
        arenaIndustry: val("arena-industry"),
        arenaOffering: val("arena-offering"),
        arenaAudience: val("arena-audience"),
        standWho: val("stand-who"),
        standJob: val("stand-job"),
        standSolved: val("stand-solved"),
        axisLeft: val("axis-left-pole"),
        axisRight: val("axis-right-pole"),
        axisIfWin: val("axis-if-win"),
        offLabel: val("off-axis-label"),
        offTerritory: val("off-territory"),
        statement: val("statement"),
        tmItch: val("tm-itch"),
        tmSticky: val("tm-sticky"),
        tmJack: val("tm-jack"),
        axisSelfX: axisSelfX,
        offSelfX: offSelfX,
        offSelfY: offSelfY,
        rivals: rivals,
        cuts: cuts
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snap));
    } catch (e) {}
  }

  function loadDraftLocal() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // Mutable canvas state synced with session + localStorage
  var axisAns = (state.answers && state.answers.axis) || {};
  var offAns = (state.answers && state.answers.off_axis) || {};
  var axisSelfX = typeof axisAns.selfX === "number" ? axisAns.selfX : 68;
  var offSelfX = typeof offAns.selfX === "number" ? offAns.selfX : axisSelfX;
  var offSelfY = typeof offAns.selfY === "number" ? offAns.selfY : 20;
  var rivals = Array.isArray(axisAns.rivals) ? axisAns.rivals.slice() : [];
  var cuts = state.truthmode && Array.isArray(state.truthmode.cuts) ? state.truthmode.cuts.slice() : [];

  var savedDraft = loadDraftLocal();
  if (savedDraft) {
    if (typeof savedDraft.axisSelfX === "number" && typeof axisAns.selfX !== "number") axisSelfX = savedDraft.axisSelfX;
    if (typeof savedDraft.offSelfX === "number" && typeof offAns.selfX !== "number") offSelfX = savedDraft.offSelfX;
    if (typeof savedDraft.offSelfY === "number" && typeof offAns.selfY !== "number") offSelfY = savedDraft.offSelfY;
    if (Array.isArray(savedDraft.rivals) && !rivals.length) rivals = savedDraft.rivals;
    if (Array.isArray(savedDraft.cuts) && !cuts.length) cuts = savedDraft.cuts;
  }

  function clamp(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function speakCue(key) {
    if (window.OnlynessNarrator && scripts[key]) {
      window.OnlynessNarrator.say(scripts[key]);
    }
  }

  // API transport (authenticated when live, local-first when standalone)
  function apiPost(endpoint, payload) {
    if (!cfg.live || !cfg.token) {
      return Promise.resolve({ standalone: true, payload: payload });
    }
    return fetch("/api/" + encodeURIComponent(cfg.token) + "/" + endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {})
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || (endpoint + " failed (" + r.status + ")"));
        });
      }
      return r.json();
    });
  }

  function submitPayload(payload, stepKeysToClear, okMsg, rethrow) {
    saveDraftLocal();
    if (Array.isArray(stepKeysToClear)) {
      stepKeysToClear.forEach(function (k) { delete dirtyFields[k]; });
    }
    if (!cfg.live || !cfg.token) {
      var cmd = "onlyness-axi submit " + state.id + " --json '" + JSON.stringify(payload).replace(/'/g, "'\\\\''") + "'";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd).then(function () {
          setStatus("Saved in browser and copied CLI submit command for your coach.");
        }).catch(function () {
          setStatus("Saved in browser. Use 'Copy update for coach' to paste into chat.");
        });
      } else {
        setStatus("Saved in browser. Use 'Copy update for coach' to paste into chat.");
      }
      return Promise.resolve();
    }
    return apiPost("submit", payload)
      .then(function () {
        setStatus(okMsg || "Saved and synced with coach.");
      })
      .catch(function (e) {
        setStatus(String(e && e.message ? e.message : e));
        if (rethrow) throw e;
      });
  }

  function triggerRevise(target) {
    if (!cfg.live || !cfg.token) {
      var cmd = "onlyness-axi revise " + state.id + " " + target;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd).catch(function () {});
      }
      setStatus("Standalone mode: run '" + cmd + "' in coach chat to return to " + target + ".");
      return;
    }
    apiPost("revise", { step: target })
      .then(function () { setStatus("Returned to " + target + "."); })
      .catch(function (e) { setStatus(String(e && e.message ? e.message : e)); });
  }

  // Paradox interactive toggle
  function setParadoxPerspective(branded) {
    var b1 = el("paradox-bar1-fill");
    var b2 = el("paradox-bar2-fill");
    var l1 = el("paradox-bar1-label");
    var l2 = el("paradox-bar2-label");
    var p1 = el("paradox-bar1-pct");
    var p2 = el("paradox-bar2-pct");
    var cap = el("paradox-caption");
    var btnBlind = el("btn-paradox-blind");
    var btnBrand = el("btn-paradox-branded");
    if (btnBlind) btnBlind.setAttribute("aria-pressed", branded ? "false" : "true");
    if (btnBrand) btnBrand.setAttribute("aria-pressed", branded ? "true" : "false");
    if (branded) {
      if (l1) l1.textContent = "Coca-Cola (branded)";
      if (l2) l2.textContent = "Pepsi (branded)";
      if (p1) p1.textContent = "65%";
      if (p2) p2.textContent = "35%";
      if (b1) b1.style.transform = "scaleX(0.65)";
      if (b2) b2.style.transform = "scaleX(0.35)";
      if (cap) cap.textContent = "Branded choice: 65% pick Coca-Cola despite Pepsi winning the blind sip.";
      speakCue("paradox_branded");
    } else {
      if (l1) l1.textContent = "Pepsi (blind sip)";
      if (l2) l2.textContent = "Coca-Cola (blind sip)";
      if (p1) p1.textContent = "57%";
      if (p2) p2.textContent = "43%";
      if (b1) b1.style.transform = "scaleX(0.57)";
      if (b2) b2.style.transform = "scaleX(0.43)";
      if (cap) cap.textContent = "Blindfolded sip: 57% prefer the sweeter challenger.";
      speakCue("paradox_blind");
    }
  }

  var blindBtn = el("btn-paradox-blind");
  if (blindBtn) blindBtn.addEventListener("click", function () { setParadoxPerspective(false); });
  var brandBtn = el("btn-paradox-branded");
  if (brandBtn) brandBtn.addEventListener("click", function () { setParadoxPerspective(true); });

  // 1D & 2D SVG Spatial Map Engine
  function svgPt(svg, evt) {
    var rect = svg.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var scaleX = vb.width / (rect.width || 1);
    var scaleY = vb.height / (rect.height || 1);
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  }

  function renderAxis1D() {
    var svg = el("svg-axis-1d");
    if (!svg) return;
    var leftL = el("svg1-left-label");
    var rightL = el("svg1-right-label");
    if (leftL) leftL.textContent = val("axis-left-pole") || "Bad pole";
    if (rightL) rightL.textContent = val("axis-right-pole") || "Better pole";

    var padL = 48, spanW = 504, y = 92;
    var sx = Math.round(padL + (axisSelfX / 100) * spanW);
    var selfNode = el("svg1-self-node");
    if (selfNode) {
      selfNode.setAttribute("aria-valuenow", String(axisSelfX));
      var c = selfNode.querySelector("circle");
      var t = selfNode.querySelector("text");
      if (c) { c.setAttribute("cx", String(sx)); c.setAttribute("cy", String(y)); }
      if (t) { t.setAttribute("x", String(sx)); t.setAttribute("y", String(y + 4)); }
    }

    var layer = el("svg1-rivals-layer");
    var closest = null;
    if (layer) {
      layer.innerHTML = "";
      rivals.forEach(function (r, idx) {
        var rx = Math.round(padL + (clamp(r.x) / 100) * spanW);
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "drag-node");
        g.setAttribute("data-rival-idx", String(idx));
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(rx));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("r", "10");
        circle.setAttribute("fill", "var(--color-paper-3)");
        circle.setAttribute("stroke", "var(--color-muted)");
        circle.setAttribute("stroke-width", "1.5");
        var txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", String(rx));
        txt.setAttribute("y", String(idx % 2 === 0 ? y - 20 : y + 30));
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("class", "svg-label");
        txt.textContent = r.label;
        g.appendChild(circle);
        g.appendChild(txt);
        layer.appendChild(g);

        if (Math.abs(axisSelfX - r.x) <= 8) closest = r.label;
      });
    }

    var pillBox = el("rival-pill-list");
    if (pillBox) {
      pillBox.innerHTML = "";
      rivals.forEach(function (r, idx) {
        var span = document.createElement("span");
        span.className = "rival-pill";
        var lbl = document.createElement("span");
        lbl.textContent = r.label + " (" + clamp(r.x) + ")";
        var rm = document.createElement("button");
        rm.type = "button";
        rm.setAttribute("aria-label", "Remove rival " + r.label);
        rm.textContent = "x";
        rm.addEventListener("click", function () {
          rivals.splice(idx, 1);
          dirtyFields["axis-rivals"] = true;
          renderAxis1D();
          renderOffAxis2D();
          saveDraftLocal();
        });
        span.appendChild(lbl);
        span.appendChild(rm);
        pillBox.appendChild(span);
      });
    }

    var status = el("axis-crowd-status");
    if (status) {
      if (closest) {
        status.textContent = "Crowded near " + closest + " at " + axisSelfX + " of 100. Winning here looks like a Brad Pitt race.";
        if (!spokenHints.crowded) {
          spokenHints.crowded = true;
          speakCue("axis_crowded");
        }
      } else {
        status.textContent = "Drag You or use Left and Right arrow keys. Position: " + axisSelfX + " of 100.";
      }
    }
  }

  function renderOffAxis2D() {
    var svg = el("svg-off-axis-2d");
    if (!svg) return;
    var leftL = el("svg2-left-label");
    var rightL = el("svg2-right-label");
    var yL = el("svg2-y-label");
    if (leftL) leftL.textContent = val("axis-left-pole") || "Bad pole";
    if (rightL) rightL.textContent = val("axis-right-pole") || "Better pole";
    if (yL) yL.textContent = val("off-axis-label") || "Uncontested dimension";

    var padL = 56, spanW = 496, floorY = 262, topY = 36, spanH = floorY - topY;
    var toX = function (p) { return Math.round(padL + (clamp(p) / 100) * spanW); };
    var toY = function (p) { return Math.round(floorY - (clamp(p) / 100) * spanH); };

    var rivalLayer = el("svg2-rivals-layer");
    if (rivalLayer) {
      rivalLayer.innerHTML = "";
      rivals.forEach(function (r, idx) {
        var rx = toX(r.x);
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(rx));
        circle.setAttribute("cy", String(floorY));
        circle.setAttribute("r", "7");
        circle.setAttribute("fill", "var(--color-paper-3)");
        circle.setAttribute("stroke", "var(--color-muted)");
        circle.setAttribute("stroke-width", "1.5");
        var txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", String(rx));
        txt.setAttribute("y", String(idx % 2 === 0 ? floorY + 18 : floorY - 12));
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("class", "svg-label");
        txt.textContent = r.label;
        rivalLayer.appendChild(circle);
        rivalLayer.appendChild(txt);
      });
    }

    var fx = toX(axisSelfX);
    var px = toX(offSelfX);
    var py = toY(offSelfY);
    var ghost = el("svg2-floor-ghost");
    if (ghost) {
      ghost.setAttribute("cx", String(fx));
      ghost.setAttribute("cy", String(floorY));
    }
    var path = el("svg2-leap-path");
    if (path) {
      var cx = Math.round((fx + px) / 2);
      var cy = Math.round((floorY + py) / 2 - 22);
      path.setAttribute("d", "M " + fx + " " + floorY + " Q " + cx + " " + cy + " " + px + " " + py);
    }
    var selfNode = el("svg2-self-node");
    if (selfNode) {
      selfNode.setAttribute("aria-valuenow", String(offSelfY));
      var c = selfNode.querySelector("circle");
      var t = selfNode.querySelector("text");
      if (c) { c.setAttribute("cx", String(px)); c.setAttribute("cy", String(py)); }
      if (t) { t.setAttribute("x", String(px)); t.setAttribute("y", String(py + 4)); }
    }

    var alt = el("off-axis-altitude");
    if (alt) {
      alt.textContent = "Drag You anywhere on the 2D stage or use arrow keys. Vertical lift: " + offSelfY + "% off the axis.";
    }
  }

  // Pointer drag + keyboard for 1D SVG
  (function bind1DDrag() {
    var svg = el("svg-axis-1d");
    var selfNode = el("svg1-self-node");
    if (!svg || !selfNode) return;
    var dragTarget = null; // "self" or rival index

    svg.addEventListener("pointerdown", function (evt) {
      var rivalEl = evt.target.closest("[data-rival-idx]");
      if (rivalEl) {
        dragTarget = Number(rivalEl.getAttribute("data-rival-idx"));
        svg.setPointerCapture(evt.pointerId);
        return;
      }
      if (evt.target.closest("#svg1-self-node")) {
        dragTarget = "self";
        svg.setPointerCapture(evt.pointerId);
      }
    });

    svg.addEventListener("pointermove", function (evt) {
      if (dragTarget === null) return;
      var pt = svgPt(svg, evt);
      var pct = clamp(((pt.x - 48) / 504) * 100);
      if (dragTarget === "self") {
        axisSelfX = pct;
        dirtyFields["axis-selfX"] = true;
      } else if (typeof dragTarget === "number" && rivals[dragTarget]) {
        rivals[dragTarget].x = pct;
        dirtyFields["axis-rivals"] = true;
      }
      renderAxis1D();
      renderOffAxis2D();
    });

    function endDrag(evt) {
      if (dragTarget !== null) {
        dragTarget = null;
        try { svg.releasePointerCapture(evt.pointerId); } catch (e) {}
        saveDraftLocal();
      }
    }
    svg.addEventListener("pointerup", endDrag);
    svg.addEventListener("pointercancel", endDrag);

    selfNode.addEventListener("keydown", function (evt) {
      var delta = evt.shiftKey ? 10 : 3;
      if (evt.key === "ArrowLeft") {
        evt.preventDefault();
        axisSelfX = clamp(axisSelfX - delta);
        dirtyFields["axis-selfX"] = true;
        renderAxis1D();
        renderOffAxis2D();
        saveDraftLocal();
      } else if (evt.key === "ArrowRight") {
        evt.preventDefault();
        axisSelfX = clamp(axisSelfX + delta);
        dirtyFields["axis-selfX"] = true;
        renderAxis1D();
        renderOffAxis2D();
        saveDraftLocal();
      }
    });
  })();

  // Pointer drag + keyboard for 2D SVG
  (function bind2DDrag() {
    var svg = el("svg-off-axis-2d");
    var selfNode = el("svg2-self-node");
    if (!svg || !selfNode) return;
    var dragging = false;

    svg.addEventListener("pointerdown", function (evt) {
      if (evt.target.closest("#svg2-self-node") || evt.target === svg) {
        dragging = true;
        svg.setPointerCapture(evt.pointerId);
        var pt = svgPt(svg, evt);
        offSelfX = clamp(((pt.x - 56) / 496) * 100);
        offSelfY = clamp(((262 - pt.y) / 226) * 100);
        dirtyFields["off-coords"] = true;
        renderOffAxis2D();
      }
    });

    svg.addEventListener("pointermove", function (evt) {
      if (!dragging) return;
      var pt = svgPt(svg, evt);
      offSelfX = clamp(((pt.x - 56) / 496) * 100);
      offSelfY = clamp(((262 - pt.y) / 226) * 100);
      dirtyFields["off-coords"] = true;
      renderOffAxis2D();
    });

    function end2D(evt) {
      if (!dragging) return;
      dragging = false;
      try { svg.releasePointerCapture(evt.pointerId); } catch (e) {}
      saveDraftLocal();
      if (offSelfY >= 60 && !spokenHints.lifted) {
        spokenHints.lifted = true;
        speakCue("off_axis_lifted");
      } else if (offSelfY <= 20 && !spokenHints.low) {
        spokenHints.low = true;
        speakCue("off_axis_low");
      }
    }
    svg.addEventListener("pointerup", end2D);
    svg.addEventListener("pointercancel", end2D);

    selfNode.addEventListener("keydown", function (evt) {
      var delta = evt.shiftKey ? 10 : 4;
      if (evt.key === "ArrowUp") {
        evt.preventDefault();
        offSelfY = clamp(offSelfY + delta);
      } else if (evt.key === "ArrowDown") {
        evt.preventDefault();
        offSelfY = clamp(offSelfY - delta);
      } else if (evt.key === "ArrowLeft") {
        evt.preventDefault();
        offSelfX = clamp(offSelfX - delta);
      } else if (evt.key === "ArrowRight") {
        evt.preventDefault();
        offSelfX = clamp(offSelfX + delta);
      } else {
        return;
      }
      dirtyFields["off-coords"] = true;
      renderOffAxis2D();
      saveDraftLocal();
    });
  })();

  // Add competitor chip
  var addRivalBtn = el("btn-add-rival");
  if (addRivalBtn) {
    addRivalBtn.addEventListener("click", function () {
      var inp = el("rival-new-label");
      var label = inp ? inp.value.trim() : "";
      if (!label) return;
      var nextX = Math.max(15, Math.min(90, 28 + rivals.length * 22));
      rivals.push({ id: "rival-" + Date.now(), label: label, x: nextX });
      if (inp) inp.value = "";
      dirtyFields["axis-rivals"] = true;
      renderAxis1D();
      renderOffAxis2D();
      saveDraftLocal();
    });
  }

  // Onlyness structured sync + live lint + Brad Pitt swap
  var bradSwapped = false;
  function runClientLint(stmt) {
    var findings = [];
    var trimmed = (stmt || "").trim();
    if (!trimmed) {
      return [{ sev: "weak", text: "Draft a statement to run live rubric checks." }];
    }
    var geoRe = rules.geoSource ? new RegExp(rules.geoSource, "i") : null;
    var radRe = rules.radiusSource ? new RegExp(rules.radiusSource, "i") : null;
    var wholeRe = rules.thisWholeSource ? new RegExp(rules.thisWholeSource, "i") : null;
    if ((geoRe && geoRe.test(trimmed)) || (radRe && radRe.test(trimmed)) || (wholeRe && wholeRe.test(trimmed))) {
      findings.push({ sev: "fail", text: "Geographic or street-corner scarcity detected. Aim for a paradigm shift instead." });
    }
    if (rules.betterAxisSource) {
      var betterRe = new RegExp(rules.betterAxisSource, "gi");
      var negRe = rules.negationSource ? new RegExp(rules.negationSource, "i") : null;
      var m;
      while ((m = betterRe.exec(trimmed))) {
        var before = trimmed.slice(Math.max(0, m.index - 36), m.index).split(/[,.;:]/).pop() || "";
        if (!negRe || !negRe.test(before)) {
          findings.push({ sev: "fail", text: "Axis-of-better comparative ('" + m[0] + "') detected." });
          break;
        }
      }
    }
    var connRe = rules.connectorSource ? new RegExp(rules.connectorSource, "i") : /\\bthat\\b/i;
    var connMatch = trimmed.match(connRe);
    if (!connMatch) {
      findings.push({ sev: "weak", text: "Add a 'that' clause explaining what rivals cannot copy." });
    } else {
      var after = trimmed.slice((connMatch.index || 0) + connMatch[0].length).trim().split(/\\s+/).filter(Boolean);
      if (after.length < 3) {
        findings.push({ sev: "weak", text: "That-clause is short; anchor it in a concrete buyer itch." });
      }
    }
    if (findings.length === 0) {
      findings.push({ sev: "pass", text: "Pre-check clean: paradigm shape without axis cosplay or geo scarcity." });
    }
    return findings;
  }

  function updateOnlynessPreview() {
    var stmt = val("statement").trim();
    var preview = el("statement-live-preview");
    if (preview) preview.textContent = stmt || "I am the only ______ that ______";

    var lintBox = el("live-lint-list");
    if (lintBox) {
      var checks = runClientLint(stmt);
      lintBox.innerHTML = "";
      checks.forEach(function (c) {
        var li = document.createElement("li");
        li.className = "lint-item";
        li.setAttribute("data-severity", c.sev);
        li.textContent = (c.sev === "pass" ? "Pass: " : c.sev === "fail" ? "Fail: " : "Check: ") + c.text;
        lintBox.appendChild(li);
      });
    }

    var bradEl = el("brad-pitt-text");
    if (bradEl) {
      var prefixRe = rules.prefixSource ? new RegExp(rules.prefixSource, "i") : /^(?:i am|we are)\\s+the\\s+only\\b/i;
      var swapText = stmt
        ? (bradSwapped
            ? stmt.replace(prefixRe, "Generic Competitor Inc. is the only")
            : "Toggle 'Swap brand name' to hear your claim in a generic rival's mouth.")
        : "Draft your statement above to test the rival swap.";
      if (bradSwapped && stmt && swapText === stmt) {
        swapText = "Generic Competitor Inc.: " + stmt;
      }
      bradEl.textContent = swapText;
    }
  }

  function syncFieldsToStatement() {
    var prefix = val("stmt-prefix") || "I am the only";
    var cat = val("stmt-category").trim() || "______";
    var diff = val("stmt-diff").trim() || "that ______";
    if (!/^(that|who|where|which|with)\\b/i.test(diff) && diff !== "that ______") {
      diff = "that " + diff;
    }
    var combined = prefix + " " + cat + " " + diff;
    var stmtBox = el("statement");
    if (stmtBox) {
      stmtBox.value = combined;
      dirtyFields["statement"] = true;
    }
    updateOnlynessPreview();
    saveDraftLocal();
  }

  function syncStatementToFields(stmt) {
    if (!stmt || !stmt.trim()) return;
    var prefixRe = rules.prefixSource ? new RegExp(rules.prefixSource, "i") : null;
    var m = prefixRe ? stmt.trim().match(prefixRe) : null;
    if (m) {
      var rest = stmt.trim().slice(m[0].length).trim();
      var connMatch = rest.match(/\\b(that|who|where|which)\\b/i);
      if (connMatch && connMatch.index !== undefined) {
        setValSafe("stmt-category", rest.slice(0, connMatch.index).trim());
        setValSafe("stmt-diff", rest.slice(connMatch.index).trim());
      } else {
        setValSafe("stmt-category", rest);
      }
    }
  }

  ["stmt-prefix", "stmt-category", "stmt-diff"].forEach(function (id) {
    var node = el(id);
    if (node) node.addEventListener("input", syncFieldsToStatement);
  });

  var stmtNode = el("statement");
  if (stmtNode) {
    stmtNode.addEventListener("input", function () {
      dirtyFields["statement"] = true;
      updateOnlynessPreview();
      saveDraftLocal();
    });
  }

  var bradToggle = el("btn-brad-toggle");
  if (bradToggle) {
    bradToggle.addEventListener("click", function () {
      bradSwapped = !bradSwapped;
      bradToggle.setAttribute("aria-pressed", bradSwapped ? "true" : "false");
      updateOnlynessPreview();
    });
  }

  var bradSpeak = el("btn-brad-speak");
  if (bradSpeak) {
    bradSpeak.addEventListener("click", function () {
      bradSwapped = true;
      if (bradToggle) bradToggle.setAttribute("aria-pressed", "true");
      updateOnlynessPreview();
      var line = (el("brad-pitt-text") || {}).textContent || "";
      if (line && window.OnlynessNarrator) {
        try { localStorage.setItem("onlyness_narrator_audio", "1"); } catch (e) {}
        window.OnlynessNarrator.say(line + " " + (scripts.onlyness_brad_pitt || ""));
        window.OnlynessNarrator.replay();
      }
    });
  }

  // Cuts knife builder
  function renderCuts() {
    var box = el("cuts-chip-list");
    var hiddenArea = el("tm-cuts");
    if (hiddenArea) hiddenArea.value = cuts.join("\\n");
    if (!box) return;
    box.innerHTML = "";
    cuts.forEach(function (c, idx) {
      var span = document.createElement("span");
      span.className = "cut-chip";
      var txt = document.createElement("span");
      txt.textContent = c;
      var rm = document.createElement("button");
      rm.type = "button";
      rm.setAttribute("aria-label", "Remove cut " + c);
      rm.textContent = "x";
      rm.addEventListener("click", function () {
        cuts.splice(idx, 1);
        dirtyFields["tm-cuts"] = true;
        renderCuts();
        saveDraftLocal();
      });
      span.appendChild(txt);
      span.appendChild(rm);
      box.appendChild(span);
    });
  }

  var addCutBtn = el("btn-add-cut");
  if (addCutBtn) {
    addCutBtn.addEventListener("click", function () {
      var inp = el("cut-new-input");
      var text = inp ? inp.value.trim() : "";
      if (!text) return;
      cuts.push(text);
      if (inp) inp.value = "";
      dirtyFields["tm-cuts"] = true;
      renderCuts();
      saveDraftLocal();
    });
  }

  // Track dirty inputs
  [
    "arena-industry", "arena-offering", "arena-audience",
    "stand-who", "stand-job", "stand-solved",
    "axis-left-pole", "axis-right-pole", "axis-if-win",
    "off-axis-label", "off-territory",
    "tm-itch", "tm-sticky", "tm-jack"
  ].forEach(function (id) {
    var node = el(id);
    if (!node) return;
    node.addEventListener("input", function () {
      dirtyFields[id] = true;
      if (id === "axis-left-pole" || id === "axis-right-pole") renderAxis1D();
      if (id === "off-axis-label") renderOffAxis2D();
      saveDraftLocal();
    });
  });

  // Step submit & advance bindings
  function bindClick(id, fn) {
    var node = el(id);
    if (node) node.addEventListener("click", fn);
  }

  function stepSpec(stepId) {
    if (stepId === "paradox") {
      var ack = el("paradoxAck");
      return {
        payload: { paradoxAck: !!(ack && ack.checked), paradoxRevealed: true },
        clear: ["paradoxAck"],
        msg: "Paradox acknowledgment saved."
      };
    }
    if (stepId === "arena") {
      return {
        payload: {
          arena: {
            industry: val("arena-industry"),
            offering: val("arena-offering"),
            audience: val("arena-audience")
          }
        },
        clear: ["arena-industry", "arena-offering", "arena-audience"],
        msg: "Arena saved."
      };
    }
    if (stepId === "stand") {
      return {
        payload: {
          answers: {
            stand: {
              who: val("stand-who"),
              job: val("stand-job"),
              solved: val("stand-solved")
            }
          }
        },
        clear: ["stand-who", "stand-job", "stand-solved"],
        msg: "Stand saved."
      };
    }
    if (stepId === "axis") {
      var left = val("axis-left-pole").trim();
      var right = val("axis-right-pole").trim();
      return {
        payload: {
          answers: {
            axis: {
              leftPole: left,
              rightPole: right,
              scale: left && right ? left + " to " + right : (left || right),
              selfX: axisSelfX,
              place: "Position " + axisSelfX + "/100",
              rivals: rivals,
              ifWin: val("axis-if-win")
            }
          }
        },
        clear: ["axis-left-pole", "axis-right-pole", "axis-if-win", "axis-selfX", "axis-rivals"],
        msg: "Axis saved."
      };
    }
    if (stepId === "off_axis") {
      return {
        payload: {
          answers: {
            off_axis: {
              axisLabel: val("off-axis-label"),
              territory: val("off-territory"),
              selfX: offSelfX,
              selfY: offSelfY
            }
          }
        },
        clear: ["off-axis-label", "off-territory", "off-coords"],
        msg: "Off-axis leap saved."
      };
    }
    if (stepId === "onlyness") {
      return {
        payload: { statement: val("statement") },
        clear: ["statement"],
        msg: "Statement saved."
      };
    }
    if (stepId === "truthmode") {
      return {
        payload: {
          truthmode: {
            itch: val("tm-itch"),
            sticky: val("tm-sticky"),
            jackBlack: val("tm-jack"),
            cuts: cuts
          }
        },
        clear: ["tm-itch", "tm-sticky", "tm-jack", "tm-cuts"],
        msg: "Truthmode fields saved."
      };
    }
    return {
      payload: {
        satisfaction: {
          stand: !!(el("sat-stand") && el("sat-stand").checked),
          axis: !!(el("sat-axis") && el("sat-axis").checked),
          off_axis: !!(el("sat-off") && el("sat-off").checked),
          onlyness: !!(el("sat-only") && el("sat-only").checked),
          statement: !!(el("sat-stmt") && el("sat-stmt").checked)
        }
      },
      clear: [],
      msg: "Satisfaction saved."
    };
  }

  function advanceFromStep(stepId) {
    var spec = stepSpec(stepId);
    submitPayload(spec.payload, spec.clear, spec.msg, true)
      .then(function () {
        if (!cfg.live || !cfg.token) return;
        return apiPost("advance", {});
      })
      .then(function (res) {
        if (res && res.step) {
          setStatus("Moved to " + res.step + ".");
        }
      })
      .catch(function (e) {
        setStatus(String(e && e.message ? e.message : e));
      });
  }

  [
    ["btn-submit-paradox", "btn-next-paradox", "paradox"],
    ["btn-submit-arena", "btn-next-arena", "arena"],
    ["btn-submit-stand", "btn-next-stand", "stand"],
    ["btn-submit-axis", "btn-next-axis", "axis"],
    ["btn-submit-off", "btn-next-off-axis", "off_axis"],
    ["btn-submit-statement", "btn-next-onlyness", "onlyness"],
    ["btn-submit-truthmode", "btn-next-truthmode", "truthmode"],
    ["btn-submit-satisfaction", "btn-next-pitch", "pitch"]
  ].forEach(function (row) {
    bindClick(row[0], function () {
      var spec = stepSpec(row[2]);
      submitPayload(spec.payload, spec.clear, spec.msg);
    });
    bindClick(row[1], function () {
      advanceFromStep(row[2]);
    });
  });

  bindClick("btn-send-human-msg", function () {
    var msg = val("human-msg").trim();
    if (!msg) return;
    if (el("human-msg")) el("human-msg").value = "";
    submitPayload({ humanMessage: msg }, [], "Note sent to coach.");
  });

  bindClick("btn-revise-from-axis-to-stand", function () { triggerRevise("stand"); });
  bindClick("btn-revise-from-off-to-axis", function () { triggerRevise("axis"); });
  bindClick("btn-revise-from-only-to-off", function () { triggerRevise("off_axis"); });
  bindClick("btn-revise-off-axis", function () { triggerRevise("off_axis"); });
  bindClick("btn-revise-statement", function () { triggerRevise("onlyness"); });
  bindClick("btn-revise-from-pitch", function () { triggerRevise("onlyness"); });

  bindClick("btn-examples", function () {
    if (!cfg.live || !cfg.token) {
      setStatus("Ask your coach in chat for a fresh worked example tailored to your arena.");
      return;
    }
    apiPost("need-coach", { reason: "examples" })
      .then(function () { setStatus("Requested worked examples from coach."); })
      .catch(function (e) { setStatus(String(e && e.message ? e.message : e)); });
  });

  bindClick("btn-stuck", function () {
    if (!cfg.live || !cfg.token) {
      setStatus("Ask your coach in chat: tell them where you feel stuck.");
      return;
    }
    apiPost("need-coach", { reason: "stuck" })
      .then(function () { setStatus("Flagged stuck for coach."); })
      .catch(function (e) { setStatus(String(e && e.message ? e.message : e)); });
  });

  bindClick("btn-weak", function () {
    submitPayload({ weakAdvance: true }, [], "Weak advance flagged.");
  });

  bindClick("btn-accept-chill", function () {
    if (!cfg.live || !cfg.token) {
      setStatus("Run 'onlyness-axi chill " + state.id + "' in your chat to pause.");
      return;
    }
    apiPost("chill", { reason: "accepted coach chill offer" })
      .then(function () { window.location.reload(); })
      .catch(function (e) { setStatus(String(e && e.message ? e.message : e)); });
  });

  bindClick("btn-copy-submit", function () {
    var payload = {
      arena: {
        industry: val("arena-industry"),
        offering: val("arena-offering"),
        audience: val("arena-audience")
      },
      answers: {
        stand: { who: val("stand-who"), job: val("stand-job"), solved: val("stand-solved") },
        axis: {
          leftPole: val("axis-left-pole"),
          rightPole: val("axis-right-pole"),
          selfX: axisSelfX,
          rivals: rivals,
          ifWin: val("axis-if-win")
        },
        off_axis: {
          axisLabel: val("off-axis-label"),
          territory: val("off-territory"),
          selfX: offSelfX,
          selfY: offSelfY
        }
      },
      statement: val("statement"),
      truthmode: {
        itch: val("tm-itch"),
        sticky: val("tm-sticky"),
        jackBlack: val("tm-jack"),
        cuts: cuts
      }
    };
    var cmd = "onlyness-axi submit " + state.id + " --json '" + JSON.stringify(payload).replace(/'/g, "'\\\\''") + "'";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd)
        .then(function () { setStatus("Copied current canvas state for your coach chat."); })
        .catch(function () { setStatus("Copy blocked. Run onlyness-axi submit in chat."); });
    } else {
      setStatus("Copy unavailable. Run onlyness-axi submit in chat.");
    }
  });

  // Live DOM hydration from Session JSON (SSE)
  function syncFromSession(next) {
    if (!next || typeof next !== "object") return;
    var prevStep = state.step;
    state = next;

    if (next.status === "paused" && cfg.live && cfg.token) {
      window.location.reload();
      return;
    }

    var labels = cfg.stepLabels || {};
    var order = cfg.stepOrder || [];
    var activeIdx = order.indexOf(next.step);

    var headerStep = el("header-step-name");
    if (headerStep) headerStep.textContent = labels[next.step] || next.step;

    order.forEach(function (id, idx) {
      var chip = document.querySelector('[data-step-chip="' + id + '"]');
      if (chip) {
        if (id === next.step) chip.setAttribute("aria-current", "step");
        else chip.removeAttribute("aria-current");
        chip.setAttribute("data-state", idx < activeIdx ? "done" : id === next.step ? "active" : "todo");
      }
      var secId = id === "off_axis" ? "sec-off-axis" : "sec-" + id;
      var sec = el(secId);
      if (sec) {
        if (id === next.step) sec.classList.remove("hidden");
        else sec.classList.add("hidden");
      }
    });

    var compass = el("compass-strip");
    if (compass) {
      var showC = ["axis", "off_axis", "onlyness", "truthmode", "pitch"].indexOf(next.step) >= 0;
      compass.classList.toggle("hidden", !showC);
    }
    var st = (next.answers && next.answers.stand) || {};
    if (el("compass-who")) el("compass-who").textContent = st.who || "Not defined yet";
    if (el("compass-job")) el("compass-job").textContent = st.job || "Not defined yet";
    if (el("compass-solved")) el("compass-solved").textContent = st.solved || "Not defined yet";

    // Sync inputs if not dirty
    var ar = next.arena || {};
    setValSafe("arena-industry", ar.industry || "");
    setValSafe("arena-offering", ar.offering || "");
    setValSafe("arena-audience", ar.audience || "");
    setValSafe("stand-who", st.who || "");
    setValSafe("stand-job", st.job || "");
    setValSafe("stand-solved", st.solved || "");

    var ax = (next.answers && next.answers.axis) || {};
    setValSafe("axis-left-pole", ax.leftPole || "");
    setValSafe("axis-right-pole", ax.rightPole || "");
    setValSafe("axis-if-win", ax.ifWin || "");
    if (!dirtyFields["axis-selfX"] && typeof ax.selfX === "number") axisSelfX = ax.selfX;
    if (!dirtyFields["axis-rivals"] && Array.isArray(ax.rivals)) rivals = ax.rivals.slice();

    var oa = (next.answers && next.answers.off_axis) || {};
    setValSafe("off-axis-label", oa.axisLabel || "");
    setValSafe("off-territory", oa.territory || "");
    if (!dirtyFields["off-coords"]) {
      if (typeof oa.selfX === "number") offSelfX = oa.selfX;
      if (typeof oa.selfY === "number") offSelfY = oa.selfY;
    }

    setValSafe("statement", next.statement || "");
    syncStatementToFields(next.statement || "");

    var tm = next.truthmode || {};
    setValSafe("tm-itch", tm.itch || "");
    setValSafe("tm-sticky", tm.sticky || "");
    setValSafe("tm-jack", tm.jackBlack || "");
    if (!dirtyFields["tm-cuts"] && Array.isArray(tm.cuts)) cuts = tm.cuts.slice();

    if (el("tm-statement-display")) el("tm-statement-display").textContent = next.statement || "No statement yet.";
    if (el("tm-swap-display")) el("tm-swap-display").textContent = tm.swap || "Waiting for coach to run truthmode set-swap.";
    if (el("pitch-statement-display")) el("pitch-statement-display").textContent = next.statement || "No statement yet.";
    if (el("done-statement-display")) el("done-statement-display").textContent = next.statement || "No statement recorded.";

    var tmBox = el("truthmode-verdict-box");
    var doneBox = el("done-verdict-box");
    if (tmBox) {
      tmBox.innerHTML = "";
      var vBadge = document.createElement("div");
      vBadge.className = "lint-item";
      vBadge.setAttribute("data-severity", tm.verdict === "pass" ? "pass" : tm.verdict === "fail" ? "fail" : "weak");
      vBadge.textContent = tm.verdict
        ? "Rubric verdict: " + tm.verdict
        : "Run truthmode check via your coach to score the statement against the rubric.";
      tmBox.appendChild(vBadge);
      if (Array.isArray(tm.checks) && tm.checks.length) {
        var ul = document.createElement("ul");
        ul.className = "lint-list";
        tm.checks.forEach(function (c) {
          var li = document.createElement("li");
          li.className = "lint-item";
          li.setAttribute("data-severity", c.severity || "weak");
          li.textContent = (c.id || "check") + ": " + (c.detail || "");
          ul.appendChild(li);
        });
        tmBox.appendChild(ul);
      }
      if (doneBox) doneBox.innerHTML = tmBox.innerHTML;
    }

    // Coach log & budget
    var budget = next.coachBudget || { used: 0, max: 3, lastJob: null };
    if (el("coach-budget-header")) el("coach-budget-header").textContent = budget.used + "/" + budget.max;
    if (el("coach-budget-aside")) {
      el("coach-budget-aside").textContent = "Turn " + budget.used + " of " + budget.max + (budget.lastJob ? " (" + budget.lastJob + ")" : "");
    }

    var logBox = el("coach-log");
    if (logBox) {
      var entries = Array.isArray(next.coachLog) ? next.coachLog.slice(-14) : [];
      logBox.innerHTML = "";
      if (!entries.length) {
        var emptyP = document.createElement("p");
        emptyP.className = "field-hint";
        emptyP.textContent = "No coach notes yet. Submit a step or write a note below.";
        logBox.appendChild(emptyP);
      } else {
        entries.forEach(function (e) {
          var div = document.createElement("div");
          div.className = "coach-entry";
          div.setAttribute("data-role", e.role || "system");
          var meta = document.createElement("span");
          meta.className = "coach-meta";
          var rName = e.role === "coach" ? "Coach (" + (e.job || "note") + ")" : e.role === "human" ? "You" : "System";
          meta.textContent = rName + " | " + (labels[e.step] || e.step);
          var txt = document.createElement("p");
          txt.className = "coach-text";
          txt.textContent = e.text || "";
          div.appendChild(meta);
          div.appendChild(txt);
          logBox.appendChild(div);
        });
        logBox.scrollTop = logBox.scrollHeight;
      }
    }

    var chillEl = el("chill-offer");
    if (chillEl) chillEl.classList.toggle("hidden", !next.chillOfferedAt);

    var exitsEl = el("exhausted-exits");
    if (exitsEl) {
      var canExit = budget.used >= budget.max && ["stand", "axis", "off_axis", "onlyness", "truthmode"].indexOf(next.step) >= 0;
      exitsEl.classList.toggle("hidden", !canExit);
    }

    renderAxis1D();
    renderOffAxis2D();
    renderCuts();
    updateOnlynessPreview();

    if (prevStep !== next.step) {
      var cue = next.step === "off_axis" ? "off_axis_intro" : next.step === "done" ? "done" : (next.step + "_intro");
      speakCue(cue);
    }
  }

  // Initial render
  syncStatementToFields(state.statement || "");
  renderAxis1D();
  renderOffAxis2D();
  renderCuts();
  updateOnlynessPreview();

  // Live SSE stream when running via 'onlyness-axi view'
  if (cfg.live && cfg.token && typeof EventSource !== "undefined") {
    var es = new EventSource("/api/" + encodeURIComponent(cfg.token) + "/stream");
    es.addEventListener("session", function (evt) {
      try {
        var next = JSON.parse(evt.data);
        syncFromSession(next);
      } catch (e) {}
    });
    es.onerror = function () {
      var badge = el("sync-badge");
      if (badge) {
        badge.setAttribute("data-live", "false");
        badge.textContent = "Reconnecting";
      }
    };
    es.onopen = function () {
      var badge = el("sync-badge");
      if (badge) {
        badge.setAttribute("data-live", "true");
        badge.textContent = "Live SSE sync";
      }
    };
  }
})();
</script>
</body>
</html>
`;
}
