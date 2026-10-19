import type { CoachEntry, Session, StepId, TruthmodeState } from "../session/types.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function show(step: StepId, ...ids: StepId[]): string {
  return ids.includes(step) ? "" : " hidden";
}

function answerStr(answers: Record<string, unknown>, key: string, field: string): string {
  const block = answers[key];
  if (!block || typeof block !== "object" || Array.isArray(block)) return "";
  const v = (block as Record<string, unknown>)[field];
  return typeof v === "string" ? v : "";
}

function coachEntriesHtml(log: CoachEntry[]): string {
  if (log.length === 0) {
    return `<p class="muted">No coach messages yet.</p>`;
  }
  const recent = log.slice(-12);
  return recent
    .map(
      (e) =>
        `<div class="coach-entry" data-role="${escapeHtml(e.role)}">
  <span class="coach-meta">${escapeHtml(e.role)}${e.job ? ` · ${escapeHtml(e.job)}` : ""} · ${escapeHtml(e.step)}</span>
  <p>${escapeHtml(e.text)}</p>
</div>`,
    )
    .join("\n");
}

function truthmodeVerdictHtml(t: TruthmodeState | null): string {
  if (!t || t.verdict == null) return "";
  const checks =
    t.checks.length === 0
      ? ""
      : `<ul class="checks">${t.checks
          .map(
            (c) =>
              `<li data-severity="${escapeHtml(c.severity)}"><strong>${escapeHtml(c.severity)}</strong> ${escapeHtml(c.id)}: ${escapeHtml(c.detail)}</li>`,
          )
          .join("")}</ul>`;
  return `<div class="verdict" data-verdict="${escapeHtml(t.verdict)}">
  <p>Rubric verdict: <strong>${escapeHtml(t.verdict)}</strong></p>
  ${checks}
  ${t.swap ? `<p class="swap"><span class="label">Adversarial swap</span> ${escapeHtml(t.swap)}</p>` : ""}
</div>`;
}

function exhausted(session: Session): boolean {
  return session.coachBudget.used >= session.coachBudget.max;
}

export function renderSurface(session: Session): string {
  const step = session.step;
  const t = session.truthmode;
  const cutsValue = t?.cuts?.length ? t.cuts.join("\n") : "";
  const budgetExhausted = exhausted(session);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Onlyness workshop · ${escapeHtml(session.id)}</title>
<style>
  :root {
    --bg: #e8eaee;
    --surface: #f4f5f7;
    --ink: #1a1d23;
    --muted: #5c6570;
    --line: #c5cad3;
    --accent: #0b3d91;
    --accent-soft: #d6e2f5;
    --danger: #8b1e2d;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    background: var(--bg);
    color: var(--ink);
    line-height: 1.5;
  }
  header {
    background: var(--ink);
    color: #f4f5f7;
    padding: 1rem 1.25rem;
    border-bottom: 3px solid var(--accent);
  }
  header h1 { margin: 0; font-size: 1.15rem; font-weight: 650; letter-spacing: 0.01em; }
  header .meta { margin: 0.25rem 0 0; font-size: 0.85rem; color: #aeb6c2; }
  main {
    display: grid;
    grid-template-columns: 1fr minmax(240px, 320px);
    gap: 1rem;
    max-width: 1100px;
    margin: 0 auto;
    padding: 1rem 1.25rem 2.5rem;
  }
  @media (max-width: 800px) {
    main { grid-template-columns: 1fr; }
  }
  section {
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 1rem 1.1rem 1.15rem;
    margin-bottom: 0.85rem;
  }
  section.hidden { display: none; }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  h3 { margin: 0.85rem 0 0.35rem; font-size: 0.95rem; }
  p { margin: 0.4rem 0; }
  .muted { color: var(--muted); font-size: 0.9rem; }
  .teaching {
    border-left: 3px solid var(--accent);
    padding: 0.5rem 0.75rem;
    background: var(--accent-soft);
    margin: 0.75rem 0;
    font-size: 0.92rem;
  }
  label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    margin: 0.65rem 0 0.25rem;
  }
  input[type="text"], textarea {
    width: 100%;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink);
    font: inherit;
  }
  textarea { min-height: 4.5rem; resize: vertical; }
  .row-check {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }
  .row-check input { margin-top: 0.25rem; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.9rem; }
  button {
    font: inherit;
    font-weight: 600;
    font-size: 0.9rem;
    padding: 0.45rem 0.85rem;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
  }
  button.secondary {
    background: transparent;
    color: var(--accent);
  }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
  #coach-panel { position: sticky; top: 0.75rem; align-self: start; }
  .coach-entry {
    border-top: 1px solid var(--line);
    padding: 0.5rem 0;
  }
  .coach-meta {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
  }
  .coach-entry[data-role="coach"] { border-left: 2px solid var(--accent); padding-left: 0.5rem; }
  .exits { margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed var(--line); }
  .verdict { margin: 0.75rem 0; padding: 0.6rem 0.75rem; background: var(--accent-soft); border: 1px solid var(--line); }
  .verdict[data-verdict="fail"] { border-color: var(--danger); }
  .checks { margin: 0.4rem 0 0; padding-left: 1.1rem; font-size: 0.9rem; }
  .label { font-weight: 650; color: var(--accent); }
  #status { font-size: 0.8rem; color: var(--muted); margin-top: 0.5rem; min-height: 1.2em; }
</style>
</head>
<body>
<header>
  <h1>Onlyness workshop</h1>
  <p class="meta">Session ${escapeHtml(session.id)} · step <strong id="step-label">${escapeHtml(step)}</strong>
    · coach <span id="coach-budget-header">${session.coachBudget.used}/${session.coachBudget.max}</span></p>
</header>
<main>
<div id="workshop">

<section id="sec-paradox" class="${show(step, "paradox")}">
  <h2>Act 0 · Pepsi Paradox</h2>
  <p>Blind taste tests often crown Pepsi. Branded choice still crowns Coke. Winning the axis of “better” (sweeter, faster, cheaper, prettier) can still lose the real game: people pick the sticky identity, not the scoreboard.</p>
  <p class="muted">Mid-lifecycle pruning works the same way — sharpen focus by cutting what only exists to win a dead race.</p>
  <div class="row-check">
    <input type="checkbox" id="paradoxAck" ${session.paradoxAck ? "checked" : ""} />
    <label for="paradoxAck" style="margin:0">I acknowledge the Pepsi Paradox: better on the axis is not the same as onlyness.</label>
  </div>
  <div class="actions">
    <button type="button" id="btn-submit-paradox">Save acknowledgment</button>
  </div>
</section>

<section id="sec-arena" class="${show(step, "arena")}">
  <h2>Arena</h2>
  <p class="muted">Ground the assignment so coaching isn’t generic.</p>
  <label for="arena-industry">Industry / category</label>
  <input type="text" id="arena-industry" value="${escapeHtml(session.arena.industry)}" />
  <label for="arena-offering">Product or service (one line)</label>
  <input type="text" id="arena-offering" value="${escapeHtml(session.arena.offering)}" />
  <label for="arena-audience">Who you sell to (one line)</label>
  <input type="text" id="arena-audience" value="${escapeHtml(session.arena.audience)}" />

  <h3>Worked example · Carvana</h3>
  <div class="teaching">
    <p><strong>Stand:</strong> Buyers hiring for a used car without the lot-lot ritual — distrust, time sink, opaque pricing.</p>
    <p><strong>Axis of better:</strong> Cheaper inventory, nicer lots, friendlier salespeople. Win that race → still a dealership with better paint.</p>
    <p><strong>Off-axis:</strong> Leave “better dealership.” Own the vending-machine / delivery paradigm — pick online, car drops from a tower.</p>
    <p><strong>Onlyness sketch:</strong> <em>I am the only</em> used-car buyer path that feels like a vending machine, not a lot.</p>
  </div>
  <div class="actions">
    <button type="button" id="btn-submit-arena">Save arena</button>
  </div>
</section>

<section id="sec-stand" class="${show(step, "stand")}">
  <h2>Step 1 · Where do you stand</h2>
  <label for="stand-who">Who hurts</label>
  <input type="text" id="stand-who" value="${escapeHtml(answerStr(session.answers, "stand", "who"))}" />
  <label for="stand-job">Job they’re hiring for</label>
  <input type="text" id="stand-job" value="${escapeHtml(answerStr(session.answers, "stand", "job"))}" />
  <label for="stand-solved">What “solved” looks like</label>
  <textarea id="stand-solved">${escapeHtml(answerStr(session.answers, "stand", "solved"))}</textarea>
  <div class="actions">
    <button type="button" id="btn-submit-stand">Submit stand</button>
  </div>
</section>

<section id="sec-axis" class="${show(step, "axis")}">
  <h2>Step 2 · Axis of better</h2>
  <label for="axis-scale">Industry bad → good scale</label>
  <input type="text" id="axis-scale" value="${escapeHtml(answerStr(session.answers, "axis", "scale"))}" />
  <label for="axis-place">Where your idea sits on it</label>
  <input type="text" id="axis-place" value="${escapeHtml(answerStr(session.answers, "axis", "place"))}" />
  <label for="axis-ifWin">If we win this axis, customers get ___</label>
  <textarea id="axis-ifWin">${escapeHtml(answerStr(session.answers, "axis", "ifWin"))}</textarea>
  <div class="actions">
    <button type="button" id="btn-submit-axis">Submit axis</button>
  </div>
</section>

<section id="sec-off-axis" class="${show(step, "off_axis")}">
  <h2>Step 3 · Step off the axis</h2>
  <p class="muted">Leave fizzy-water. Own the summer-day job — feeling, ritual, identity — even if a rival “tastes better.”</p>
  <label for="off-territory">Territory (not a synonym of the axis)</label>
  <textarea id="off-territory">${escapeHtml(answerStr(session.answers, "off_axis", "territory"))}</textarea>
  <div class="actions">
    <button type="button" id="btn-submit-off">Submit off-axis</button>
  </div>
</section>

<section id="sec-onlyness" class="${show(step, "onlyness")}">
  <h2>Step 4 · Draft onlyness</h2>
  <p>Fill the scaffold. Unique as a <strong>paradigm</strong>, not geographic or category scarcity.</p>
  <label for="statement">I am the only ______ that ______</label>
  <textarea id="statement" placeholder="I am the only ______ that ______">${escapeHtml(session.statement)}</textarea>
  <div class="actions">
    <button type="button" id="btn-submit-statement">Submit statement</button>
  </div>
</section>

<section id="sec-truthmode" class="${show(step, "truthmode")}">
  <h2>Truthmode</h2>
  ${truthmodeVerdictHtml(t)}
  <label for="tm-itch">Itch — what scratch did the category ignore?</label>
  <textarea id="tm-itch">${escapeHtml(t?.itch ?? "")}</textarea>
  <label for="tm-sticky">Sticky — what’s the “vending machine” (memorable mental cache)?</label>
  <textarea id="tm-sticky">${escapeHtml(t?.sticky ?? "")}</textarea>
  <label for="tm-jack">Jack Black — would Brad Pitts sound ridiculous saying this?</label>
  <textarea id="tm-jack">${escapeHtml(t?.jackBlack ?? "")}</textarea>
  <label for="tm-cuts">Cuts (optional, one per line) — if this onlyness were true, what would you cut?</label>
  <textarea id="tm-cuts">${escapeHtml(cutsValue)}</textarea>
  <div class="actions">
    <button type="button" id="btn-submit-truthmode">Submit truthmode fields</button>
  </div>
</section>

<section id="sec-done" class="${show(step, "done")}">
  <h2>Done</h2>
  <p>Workshop complete. Pull <code>result</code> from the CLI for the worksheet handoff.</p>
  ${session.statement ? `<p><span class="label">Statement</span> ${escapeHtml(session.statement)}</p>` : ""}
  ${truthmodeVerdictHtml(t)}
</section>

</div>

<aside id="coach-panel">
  <section>
    <h2>Coach</h2>
    <p class="muted" id="coach-budget-aside">Budget ${session.coachBudget.used}/${session.coachBudget.max}${session.coachBudget.lastJob ? ` · last: ${escapeHtml(session.coachBudget.lastJob)}` : ""}</p>
    <div id="coach-log">
${coachEntriesHtml(session.coachLog)}
    </div>
    <div class="exits${budgetExhausted ? "" : " hidden"}" id="exhausted-exits">
      <p class="muted">Coach budget exhausted. Calm exits:</p>
      <div class="actions">
        <button type="button" class="secondary" id="btn-examples">Examples</button>
        <button type="button" class="secondary" id="btn-stuck">Stuck / need coach</button>
        <button type="button" id="btn-weak">Advance weak</button>
      </div>
    </div>
    <p id="status"></p>
  </section>
</aside>
</main>
<script>
(function () {
  var statusEl = document.getElementById("status");
  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }
  function post(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      if (!r.ok) throw new Error(path + " failed: " + r.status);
      return r.json();
    });
  }
  function bind(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", fn);
  }

  bind("btn-submit-paradox", function () {
    var ack = document.getElementById("paradoxAck");
    post("/api/submit", { paradoxAck: !!(ack && ack.checked) })
      .then(function () { setStatus("Saved acknowledgment."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-submit-arena", function () {
    post("/api/submit", {
      arena: {
        industry: (document.getElementById("arena-industry") || {}).value || "",
        offering: (document.getElementById("arena-offering") || {}).value || "",
        audience: (document.getElementById("arena-audience") || {}).value || "",
      },
    }).then(function () { setStatus("Arena saved."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-submit-stand", function () {
    post("/api/submit", {
      answers: {
        stand: {
          who: (document.getElementById("stand-who") || {}).value || "",
          job: (document.getElementById("stand-job") || {}).value || "",
          solved: (document.getElementById("stand-solved") || {}).value || "",
        },
      },
    }).then(function () { setStatus("Stand submitted."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-submit-axis", function () {
    post("/api/submit", {
      answers: {
        axis: {
          scale: (document.getElementById("axis-scale") || {}).value || "",
          place: (document.getElementById("axis-place") || {}).value || "",
          ifWin: (document.getElementById("axis-ifWin") || {}).value || "",
        },
      },
    }).then(function () { setStatus("Axis submitted."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-submit-off", function () {
    post("/api/submit", {
      answers: {
        off_axis: {
          territory: (document.getElementById("off-territory") || {}).value || "",
        },
      },
    }).then(function () { setStatus("Off-axis submitted."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-submit-statement", function () {
    post("/api/submit", {
      statement: (document.getElementById("statement") || {}).value || "",
    }).then(function () { setStatus("Statement submitted."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-submit-truthmode", function () {
    var cutsRaw = (document.getElementById("tm-cuts") || {}).value || "";
    var cuts = cutsRaw.split(/\\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    post("/api/submit", {
      truthmode: {
        itch: (document.getElementById("tm-itch") || {}).value || "",
        sticky: (document.getElementById("tm-sticky") || {}).value || "",
        jackBlack: (document.getElementById("tm-jack") || {}).value || "",
        cuts: cuts,
      },
    }).then(function () { setStatus("Truthmode fields saved."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-examples", function () {
    post("/api/need-coach", { reason: "examples" })
      .then(function () { setStatus("Asked for examples."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-stuck", function () {
    post("/api/need-coach", { reason: "stuck" })
      .then(function () { setStatus("Flagged stuck / need coach."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });
  bind("btn-weak", function () {
    post("/api/weak-advance", {})
      .then(function () { setStatus("Weak advance flagged."); })
      .catch(function (e) { setStatus(String(e.message || e)); });
  });

  function escapeText(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function renderCoachLog(log) {
    var box = document.getElementById("coach-log");
    if (!box) return;
    if (!log || !log.length) {
      box.innerHTML = '<p class="muted">No coach messages yet.</p>';
      return;
    }
    var recent = log.slice(-12);
    box.innerHTML = recent.map(function (e) {
      return '<div class="coach-entry" data-role="' + escapeText(e.role) + '">' +
        '<span class="coach-meta">' + escapeText(e.role) +
        (e.job ? " · " + escapeText(e.job) : "") +
        " · " + escapeText(e.step) + "</span>" +
        "<p>" + escapeText(e.text) + "</p></div>";
    }).join("");
  }
  var STEP_SECS = {
    paradox: "sec-paradox",
    arena: "sec-arena",
    stand: "sec-stand",
    axis: "sec-axis",
    off_axis: "sec-off-axis",
    onlyness: "sec-onlyness",
    truthmode: "sec-truthmode",
    done: "sec-done"
  };
  function syncStepSections(step) {
    if (!step) return;
    Object.keys(STEP_SECS).forEach(function (id) {
      var el = document.getElementById(STEP_SECS[id]);
      if (!el) return;
      if (id === step) el.classList.remove("hidden");
      else el.classList.add("hidden");
    });
  }
  function refreshCoachBudget(budget) {
    if (!budget) return;
    var label = budget.used + "/" + budget.max;
    var header = document.getElementById("coach-budget-header");
    if (header) header.textContent = label;
    var aside = document.getElementById("coach-budget-aside");
    if (aside) {
      aside.textContent = "Budget " + label +
        (budget.lastJob ? " · last: " + budget.lastJob : "");
    }
  }
  function refreshSession() {
    fetch("/api/session")
      .then(function (r) { return r.json(); })
      .then(function (s) {
        renderCoachLog(s.coachLog || []);
        var exits = document.getElementById("exhausted-exits");
        if (exits && s.coachBudget) {
          if (s.coachBudget.used >= s.coachBudget.max) exits.classList.remove("hidden");
          else exits.classList.add("hidden");
        }
        var stepLabel = document.getElementById("step-label");
        if (stepLabel && s.step) stepLabel.textContent = s.step;
        syncStepSections(s.step);
        refreshCoachBudget(s.coachBudget);
      })
      .catch(function () { /* ignore transient poll errors */ });
  }
  setInterval(refreshSession, 2000);
})();
</script>
</body>
</html>`;
}
