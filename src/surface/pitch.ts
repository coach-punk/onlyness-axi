import type { AxisAnswer, OffAxisAnswer, RivalMarker, Session, StandAnswer } from "../session/types.js";
import { narratorClientScript, NARRATOR_SCRIPTS } from "./narrator.js";
import { KILN_FAVICON_HTML, KILN_FONTS_HTML, pitchCss } from "./styles.js";

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

function clean(s: unknown, fallback = ""): string {
  return typeof s === "string" && s.trim() ? s.trim() : fallback;
}

function clamp(n: number, lo = 0, hi = 100): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(lo, Math.min(hi, n));
}

function renderPitchMapSvg(session: Session): string {
  const axis = (session.answers.axis ?? {}) as Partial<AxisAnswer>;
  const off = (session.answers.off_axis ?? {}) as Partial<OffAxisAnswer>;

  const leftPole = clean(axis.leftPole, "Conventional low");
  const rightPole = clean(axis.rightPole, "Axis-of-better high");
  const rivals: RivalMarker[] = Array.isArray(axis.rivals) ? axis.rivals : [];
  const floorX = typeof axis.selfX === "number" ? clamp(axis.selfX) : 65;
  const peakX = typeof off.selfX === "number" ? clamp(off.selfX) : floorX;
  const peakY = typeof off.selfY === "number" ? clamp(off.selfY) : 82;
  const offLabel = clean(off.axisLabel || off.territory, "Uncontested paradigm");

  const padL = 48;
  const padR = 48;
  const width = 540;
  const floorY = 278;
  const topY = 54;
  const spanW = width - padL - padR;
  const spanH = floorY - topY;

  const toX = (pct: number) => Math.round(padL + (clamp(pct) / 100) * spanW);
  const toY = (pct: number) => Math.round(floorY - (clamp(pct) / 100) * spanH);

  const fx = toX(floorX);
  const px = toX(peakX);
  const py = toY(peakY);
  const ctrlX = Math.round((fx + px) / 2);
  const ctrlY = Math.round((floorY + py) / 2 - 20);

  const rivalNodes = rivals
    .map((r, idx) => {
      const rx = toX(r.x);
      const labelY = idx % 2 === 0 ? floorY + 22 : floorY + 38;
      return `<g data-layer="rivals">
        <circle cx="${rx}" cy="${floorY}" r="7" fill="var(--color-paper-3)" stroke="var(--color-muted)" stroke-width="1.5" />
        <text x="${rx}" y="${labelY}" text-anchor="middle" class="svg-label">${escapeHtml(r.label)}</text>
      </g>`;
    })
    .join("\n");

  return `<svg class="spatial-svg" viewBox="0 0 540 345" role="img" aria-labelledby="pitch-map-title pitch-map-desc">
  <title id="pitch-map-title">Spatial positioning map from Axis of Better to Onlyness</title>
  <desc id="pitch-map-desc">Horizontal baseline shows ${escapeHtml(leftPole)} to ${escapeHtml(rightPole)} with ${rivals.length} competitors on the axis floor, and an upward trajectory to ${escapeHtml(offLabel)}.</desc>
  <line x1="${padL}" y1="${topY}" x2="${padL}" y2="${floorY}" stroke="var(--color-rule)" stroke-width="1" />
  <line x1="${padL}" y1="${Math.round((topY + floorY) / 2)}" x2="${width - padR}" y2="${Math.round((topY + floorY) / 2)}" stroke="var(--color-rule)" stroke-width="1" />
  <line x1="${padL}" y1="${floorY}" x2="${width - padR}" y2="${floorY}" stroke="var(--color-field-border)" stroke-width="2" />

  <text x="${padL}" y="32" class="svg-label--strong">Off-axis territory: ${escapeHtml(offLabel.slice(0, 44))}</text>
  <text x="${padL}" y="330" class="svg-label">${escapeHtml(leftPole)}</text>
  <text x="${width - padR}" y="330" text-anchor="end" class="svg-label">${escapeHtml(rightPole)}</text>

  ${rivalNodes}

  <circle cx="${fx}" cy="${floorY}" r="6" fill="var(--color-paper)" stroke="var(--color-muted)" stroke-width="2" stroke-dasharray="3 2" />
  <path d="M ${fx} ${floorY} Q ${ctrlX} ${ctrlY} ${px} ${py}" fill="none" stroke="var(--color-accent)" stroke-width="2.5" />

  <g id="pitch-peak-marker">
    <circle cx="${px}" cy="${py}" r="14" fill="var(--color-accent)" />
    <text x="${px}" y="${py + 4}" text-anchor="middle" class="svg-label--marker">You</text>
  </g>
</svg>`;
}

/** Shareable reverse-walk philosophy deliverable: statement -> 4 -> 3 -> 2 -> 1 -> statement. */
export function renderPitch(session: Session): string {
  const stand = (session.answers.stand ?? {}) as Partial<StandAnswer>;
  const axis = (session.answers.axis ?? {}) as Partial<AxisAnswer>;
  const off = (session.answers.off_axis ?? {}) as Partial<OffAxisAnswer>;
  const tm = session.truthmode;

  const statement = clean(session.statement, "I am the only ______ that ______");
  const industry = clean(session.arena.industry, "your category");
  const audience = clean(session.arena.audience, "buyers");
  const offering = clean(session.arena.offering, "this offering");

  const leftPole = clean(axis.leftPole, "the conventional low end");
  const rightPole = clean(axis.rightPole, "the conventional high end");
  const axisScale = clean(axis.scale, `${leftPole} to ${rightPole}`);
  const axisPlace = clean(axis.place, typeof axis.selfX === "number" ? `${axis.selfX} on 100` : "along the crowded scale");
  const axisIfWin = clean(axis.ifWin, "only marginal advantage on the same ladder");

  const rivals = Array.isArray(axis.rivals) ? axis.rivals : [];
  const rivalNames = rivals.length > 0
    ? rivals.map((r) => r.label).join(", ")
    : `conventional rivals in ${industry}`;

  const offTerritory = clean(off.territory, "Uncontested off-axis territory");
  const offAxisLabel = clean(off.axisLabel, "Orthogonal dimension");

  const standWho = clean(stand.who, audience);
  const standJob = clean(stand.job, "the job buyers actually hire for");
  const standSolved = clean(stand.solved, "the solved outcome in their world");

  const swapText = clean(
    tm?.swap,
    `No adversarial swap recorded yet; test whether ${rivalNames} could repeat "${statement}" with a straight face.`,
  );
  const itchText = clean(tm?.itch, standJob);
  const stickyText = clean(tm?.sticky, offTerritory);
  const jackBlackText = clean(tm?.jackBlack, swapText);
  const cuts = tm?.cuts?.filter((c) => c.trim().length > 0) ?? [];

  const narrationBeats = [
    NARRATOR_SCRIPTS.pitch_open,
    statement,
    `Step four, onlyness. ${statement}. Compare that with the generic rival test: ${swapText}`,
    `Step three, stepping off the axis. Territory claimed: ${offTerritory}. While rivals stay stuck debating ${axisScale}.`,
    `Step two, the axis of better we refused to win. Scale: ${axisScale}. If we had won that race, customers only get ${axisIfWin}.`,
    `Step one, where we stand. Who hurts: ${standWho}. Job hired for: ${standJob}. Solved looks like: ${standSolved}.`,
    cuts.length > 0 ? `To protect this position, we cut: ${cuts.join(", ")}.` : "",
    `In closing: ${statement}.`,
  ].filter(Boolean);

  const cutsHtml = cuts.length > 0
    ? `<section class="cuts-band" id="cuts" aria-labelledby="cuts-title">
        <h2 id="cuts-title">What we cut to keep this true</h2>
        <p class="pitch-hero__lead">Every positioning claim earns its teeth by what it refuses to build.</p>
        <ul>
          ${cuts.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n")}
        </ul>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Reverse-walk onlyness positioning deliverable for ${escapeHtml(offering)}." />
<title>Onlyness pitch | ${escapeHtml(offering)}</title>
${KILN_FAVICON_HTML}
${KILN_FONTS_HTML}
<style>
${pitchCss()}
</style>
</head>
<body>
<a href="#pitch-main" class="skip-link visually-hidden">Skip to content</a>

<header class="pitch-nav">
  <div class="pitch-nav__inner">
    <span class="figure">${escapeHtml(offering)}</span>
    <nav aria-label="Pitch sections">
      <ul class="pitch-nav__links">
        <li><a href="#open">Statement</a></li>
        <li><a href="#step-4">Step 4</a></li>
        <li><a href="#step-3">Step 3</a></li>
        <li><a href="#step-2">Step 2</a></li>
        <li><a href="#step-1">Step 1</a></li>
        ${cuts.length > 0 ? '<li><a href="#cuts">Cuts</a></li>' : ""}
      </ul>
    </nav>
  </div>
</header>

<main id="pitch-main" class="pitch-container" tabindex="-1">
  <section class="pitch-hero" id="open" data-role="statement-open" aria-labelledby="pitch-h1">
    <div>
      <h1 id="pitch-h1">${escapeHtml(statement)}</h1>
      <p class="pitch-hero__lead">Positioned for ${escapeHtml(audience)} in ${escapeHtml(industry)}.</p>
      <div class="pitch-actions">
        <button type="button" class="btn--primary" id="btn-narrate-pitch">
          <svg class="icon" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M3 5.5v5h2.8L9.5 13V3L5.8 5.5H3zm8.2.3a.75.75 0 0 1 1.06.04 4 4 0 0 1 0 4.32.75.75 0 1 1-1.1-1.02 2.5 2.5 0 0 0 0-2.28.75.75 0 0 1 .04-1.06z"/></svg>
          <span>Narrate pitch</span>
        </button>
        <a href="#step-4" class="btn btn--secondary">Read reverse walk</a>
      </div>
      <div class="pitch-voice-wrap">
        <label for="narrator-voice-select">British narrator voice</label>
        <select id="narrator-voice-select" class="narrator-select"></select>
      </div>
      <p id="narrator-line" class="narrator-caption-banner" aria-live="polite">${escapeHtml(NARRATOR_SCRIPTS.pitch_open)}</p>
    </div>

    <figure class="map-panel">
      ${renderPitchMapSvg(session)}
      <figcaption class="field-hint">Spatial leap from the crowded ${escapeHtml(axisScale)} baseline into ${escapeHtml(offAxisLabel)}.</figcaption>
    </figure>
  </section>

  <div class="beats">
    <section class="beat" data-step="4" id="step-4" aria-labelledby="beat-4-head">
      <div>
        <div class="beat-num figure">04</div>
        <p class="beat-label">Onlyness</p>
      </div>
      <div class="beat-body">
        <h2 id="beat-4-head">Paradigm claim tested against rival swaps</h2>
        <div class="contrast-grid">
          <div class="contrast-col">
            <p class="contrast-heading">Your position</p>
            <p>${escapeHtml(statement)}</p>
          </div>
          <div class="contrast-col">
            <p class="contrast-heading">Brad Pitt swap test</p>
            <p>${escapeHtml(swapText)}</p>
          </div>
        </div>
        <div class="proof-row">
          <div class="proof-cell">
            <p class="contrast-heading">Ignored itch</p>
            <p>${escapeHtml(itchText)}</p>
          </div>
          <div class="proof-cell">
            <p class="contrast-heading">Sticky handle</p>
            <p>${escapeHtml(stickyText)}</p>
          </div>
          <div class="proof-cell">
            <p class="contrast-heading">Jack Black bar</p>
            <p>${escapeHtml(jackBlackText)}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="beat" data-step="3" id="step-3" aria-labelledby="beat-3-head">
      <div>
        <div class="beat-num figure">03</div>
        <p class="beat-label">Off-axis</p>
      </div>
      <div class="beat-body">
        <h2 id="beat-3-head">Stepping perpendicular to the race</h2>
        <div class="contrast-grid">
          <div class="contrast-col">
            <p class="contrast-heading">Territory (${escapeHtml(offAxisLabel)})</p>
            <p>${escapeHtml(offTerritory)}</p>
          </div>
          <div class="contrast-col">
            <p class="contrast-heading">Where rivals remain stuck</p>
            <p>${escapeHtml(rivalNames)} keep trading punches between “${escapeHtml(leftPole)}” and “${escapeHtml(rightPole)}”.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="beat" data-step="2" id="step-2" aria-labelledby="beat-2-head">
      <div>
        <div class="beat-num figure">02</div>
        <p class="beat-label">Axis of better</p>
      </div>
      <div class="beat-body">
        <h2 id="beat-2-head">The race you refuse to win</h2>
        <div class="contrast-grid">
          <div class="contrast-col">
            <p class="contrast-heading">Established scale (${escapeHtml(axisScale)})</p>
            <p>Starting point: ${escapeHtml(axisPlace)}. Plotted rivals: ${escapeHtml(rivalNames)}.</p>
          </div>
          <div class="contrast-col">
            <p class="contrast-heading">If you won that axis</p>
            <p>${escapeHtml(axisIfWin)}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="beat" data-step="1" id="step-1" aria-labelledby="beat-1-head">
      <div>
        <div class="beat-num figure">01</div>
        <p class="beat-label">Where you stand</p>
      </div>
      <div class="beat-body">
        <h2 id="beat-1-head">The problem parameters</h2>
        <div class="contrast-grid">
          <div class="contrast-col">
            <p class="contrast-heading">Who hurts and what job they hire</p>
            <p>${escapeHtml(standWho)}: ${escapeHtml(standJob)}</p>
          </div>
          <div class="contrast-col">
            <p class="contrast-heading">What solved looks like</p>
            <p>${escapeHtml(standSolved)}</p>
          </div>
        </div>
      </div>
    </section>
  </div>

  ${cutsHtml}

  <section class="landing-band" id="close" data-role="statement-close" aria-labelledby="pitch-close-head">
    <h2 id="pitch-close-head">${escapeHtml(statement)}</h2>
    <p class="pitch-hero__lead">Truthmode verdict: ${escapeHtml(tm?.verdict ?? "pending")}. Return to this sentence whenever a new feature asks to join the roadmap.</p>
  </section>
</main>

<footer class="pitch-footer">
  <span>Session ${escapeHtml(session.id)}</span>
  <span>${escapeHtml(industry)} | ${escapeHtml(offering)}</span>
</footer>

<script id="pitch-narration" type="application/json">${safeJsonScript({ lines: narrationBeats })}</script>
<script>
${narratorClientScript()}
(function () {
  var dataEl = document.getElementById("pitch-narration");
  var data = dataEl ? JSON.parse(dataEl.textContent || "{}") : { lines: [] };
  var btn = document.getElementById("btn-narrate-pitch");
  if (btn && Array.isArray(data.lines)) {
    btn.addEventListener("click", function () {
      var fullText = data.lines.join(" ");
      try { localStorage.setItem("onlyness_narrator_audio", "1"); } catch (e) {}
      if (window.OnlynessNarrator) {
        window.OnlynessNarrator.say(fullText);
        window.OnlynessNarrator.replay();
      }
    });
  }
})();
</script>
</body>
</html>
`;
}
