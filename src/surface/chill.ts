import type { Session } from "../session/types.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Calm pause page — permission to stop, no shame, come back later. */
export function renderChill(session: Session, reason?: string): string {
  const why =
    reason && reason.trim()
      ? `<p class="reason">${escapeHtml(reason.trim())}</p>`
      : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Take a break · onlyness</title>
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
    min-height: 100vh;
    font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    background: var(--bg);
    color: var(--ink);
    display: grid;
    place-items: center;
    padding: 2rem 1.25rem;
  }
  main {
    max-width: 32rem;
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 2rem 1.75rem;
  }
  h1 {
    font-size: 1.65rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin: 0 0 0.75rem;
    color: var(--accent);
  }
  p { line-height: 1.55; margin: 0 0 1rem; color: var(--muted); }
  p.lead { color: var(--ink); font-size: 1.05rem; }
  .reason {
    border-left: 3px solid var(--accent);
    padding-left: 0.75rem;
    font-style: italic;
  }
  ul { margin: 0 0 1.25rem; padding-left: 1.2rem; color: var(--muted); }
  li { margin-bottom: 0.35rem; }
  button {
    background: var(--accent);
    color: #fff;
    border: none;
    padding: 0.65rem 1.1rem;
    font: inherit;
    cursor: pointer;
  }
  button:hover { filter: brightness(1.08); }
  #status { margin-top: 0.75rem; font-size: 0.9rem; color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>You’re allowed to stop.</h1>
  <p class="lead">This isn’t a failure. Sometimes the brain just isn’t in the room for onlyness yet — and forcing it makes everything worse.</p>
  ${why}
  <p>Chill. Drink a beer. Take a smoke. Walk around the block. Stare at a wall. Come back when your attitude is better — not when you feel guilty.</p>
  <ul>
    <li>No quiz. No timer. No “one more try.”</li>
    <li>Your worksheet is saved under this session.</li>
    <li>When you’re ready, resume — same place you left.</li>
  </ul>
  <button type="button" id="btn-resume">I’m ready — resume workshop</button>
  <p id="status"></p>
</main>
<script>
(function () {
  var status = document.getElementById("status");
  document.getElementById("btn-resume").addEventListener("click", function () {
    fetch("/api/resume", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      .then(function (r) {
        if (!r.ok) throw new Error("resume failed: " + r.status);
        status.textContent = "Resuming…";
        window.location.href = "/";
      })
      .catch(function (e) { status.textContent = String(e.message || e); });
  });
})();
</script>
</body>
</html>
`;
}
