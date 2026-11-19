import type { Session } from "../session/types.js";
import { narratorClientScript, NARRATOR_SCRIPTS } from "./narrator.js";
import { chillCss, KILN_FONTS_HTML } from "./styles.js";

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

/** Calm pause room: permission to stop, zero pressure, British narrator. */
export function renderChill(
  session: Session,
  reason?: string,
  runtime: { live: boolean; token: string } = { live: false, token: "" },
): string {
  const effectiveReason = reason ?? session.chillReason ?? "";
  const why = effectiveReason.trim()
    ? `<p class="chill-reason">${escapeHtml(effectiveReason.trim())}</p>`
    : "";
  const resumeCmd = `onlyness-axi resume ${session.id}`;
  const isLive = Boolean(runtime.live && runtime.token);

  const actionHtml = isLive
    ? `<button type="button" class="btn--primary" id="btn-resume-live">Resume workshop</button>`
    : `<button type="button" class="btn--primary" id="btn-copy-resume">Copy resume command</button>`;

  const standaloneNote = isLive
    ? ""
    : `<p class="chill-copy">Run <code class="mono">${escapeHtml(resumeCmd)}</code> in your agent chat whenever you are ready to return.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Pause room for the Onlyness workshop session." />
<title>Take a break | Onlyness workshop</title>
${KILN_FONTS_HTML}
<style>
${chillCss()}
</style>
</head>
<body>
<a href="#chill-main" class="skip-link visually-hidden">Skip to content</a>
<main id="chill-main" class="chill-stage" tabindex="-1">
  <section class="chill-room" aria-labelledby="chill-title">
    <h1 id="chill-title">You are permitted to stop.</h1>
    <p class="chill-lead">Step back before forcing another turn cements the wrong compromise.</p>
    ${why}
    <p class="chill-copy">Step away from the screen. Put the kettle on, take a walk around the block, and come back when the itch feels clear again.</p>
    <ul class="chill-list">
      <li>No countdown timer and no quiz waiting for you</li>
      <li>Every answer and coordinate stays saved in session ${escapeHtml(session.id)}</li>
      <li>Return to the exact step where you paused</li>
    </ul>
    ${standaloneNote}
    <div class="chill-actions">
      ${actionHtml}
      <button type="button" class="btn--secondary" id="narrator-replay">
        <svg class="icon" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path d="M3 5.5v5h2.8L9.5 13V3L5.8 5.5H3zm8.2.3a.75.75 0 0 1 1.06.04 4 4 0 0 1 0 4.32.75.75 0 1 1-1.1-1.02 2.5 2.5 0 0 0 0-2.28.75.75 0 0 1 .04-1.06z"/></svg>
        <span>Listen to narrator</span>
      </button>
    </div>
    <p id="narrator-line" class="chill-caption" aria-live="polite">${escapeHtml(NARRATOR_SCRIPTS.chill)}</p>
    <p id="chill-status" class="chill-caption" role="status" aria-live="polite"></p>
  </section>
</main>
<script id="chill-config" type="application/json">${safeJsonScript({
    live: isLive,
    token: isLive ? runtime.token : "",
    resumeCmd,
    sessionId: session.id,
  })}</script>
<script>
${narratorClientScript()}
(function () {
  var cfgEl = document.getElementById("chill-config");
  var cfg = cfgEl ? JSON.parse(cfgEl.textContent || "{}") : {};
  var statusEl = document.getElementById("chill-status");
  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  var liveBtn = document.getElementById("btn-resume-live");
  if (liveBtn && cfg.live && cfg.token) {
    liveBtn.addEventListener("click", function () {
      liveBtn.disabled = true;
      fetch("/api/" + encodeURIComponent(cfg.token) + "/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Resume failed (" + r.status + ")");
          window.location.href = "/s/" + encodeURIComponent(cfg.token) + "/";
        })
        .catch(function (e) {
          liveBtn.disabled = false;
          setStatus(String(e && e.message ? e.message : e));
        });
    });
  }

  var copyBtn = document.getElementById("btn-copy-resume");
  if (copyBtn && cfg.resumeCmd) {
    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cfg.resumeCmd)
          .then(function () {
            setStatus("Copied '" + cfg.resumeCmd + "' to clipboard. Paste it into your chat when ready.");
          })
          .catch(function () {
            setStatus("Copy unavailable. Run: " + cfg.resumeCmd);
          });
      } else {
        setStatus("Run: " + cfg.resumeCmd);
      }
    });
  }
})();
</script>
</body>
</html>
`;
}
