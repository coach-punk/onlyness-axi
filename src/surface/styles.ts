// src/surface/styles.ts
// Kiln (ember) stylesheets for workshop.html, pitch.html, and chill.html.

export const KILN_FONTS_HTML = `<link rel="preconnect" href="https://api.fontshare.com" crossorigin />
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
<link href="https://api.fontshare.com/v2/css?f[]=boska@500&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400&display=swap" rel="stylesheet" />`;

const KILN_ROOT_TOKENS = `:root {
  color-scheme: dark;
  --color-paper: oklch(13% 0.012 40);
  --color-paper-2: oklch(17.5% 0.016 40);
  --color-paper-3: oklch(22% 0.018 40);
  --color-ink: oklch(94% 0.02 80);
  --color-ink-2: oklch(84% 0.025 70);
  --color-muted: oklch(72% 0.03 60);
  --color-rule: oklch(96% 0.01 80 / 0.14);
  --color-field-border: oklch(72% 0.03 60);
  --color-accent: oklch(70% 0.2 45);
  --color-accent-ink: oklch(14% 0.02 40);
  --color-focus: oklch(76% 0.19 56);
  --color-error: oklch(68% 0.19 25);
  --color-error-surface: oklch(24% 0.06 25);
  --color-pass: oklch(75% 0.14 148);
  --color-pass-surface: oklch(23% 0.05 148);
  --color-warn: oklch(82% 0.14 78);
  --color-warn-surface: oklch(24% 0.05 78);
  --heat-0: oklch(12% 0.012 40);
  --heat-1: oklch(22% 0.07 22);
  --heat-2: oklch(40% 0.16 27);
  --heat-3: oklch(60% 0.21 36);
  --heat-4: oklch(76% 0.19 56);
  --heat-5: oklch(89% 0.14 78);
  --heat-6: oklch(98% 0.04 95);

  --font-display: "Boska", "Iowan Old Style", Georgia, serif;
  --font-body: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "Geist Mono", ui-monospace, monospace;

  --text-xs: 0.8125rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.1875rem;
  --text-title: clamp(1.25rem, 1.8vw, 1.5rem);
  --text-section: clamp(1.65rem, 2.8vw, 2.35rem);
  --text-display-s: clamp(2rem, 3.6vw, 3rem);
  --text-display: clamp(2.4rem, 4.8vw, 4.1rem);

  --space-3xs: 0.125rem;
  --space-2xs: 0.25rem;
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2.5rem;
  --space-2xl: 4rem;

  --radius-card: 1.25rem;
  --radius-well: 1rem;
  --radius-sm: 0.5rem;
  --radius-pill: 999px;
  --rule-hair: 1px;
  --shadow-card: 0 28px 60px -28px oklch(8% 0.01 40 / 0.55);

  --tracking-display: -0.02em;
  --display-weight: 500;

  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 420ms;
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);

  --z-base: 1;
  --z-raised: 10;
  --z-sticky: 200;
  --z-sticky-nav: 300;
}`;

const SHARED_BASE_CSS = `
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  overflow-x: clip;
  margin: 0;
  padding: 0;
}

body {
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.58;
  font-synthesis: none;
  accent-color: var(--color-accent);
  caret-color: var(--color-focus);
  scrollbar-color: var(--color-muted) var(--color-paper);
}

::selection {
  background: color-mix(in oklab, var(--color-accent) 35%, transparent);
  color: var(--color-ink);
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  letter-spacing: var(--tracking-display);
  line-height: 1.06;
  color: var(--color-ink);
  text-wrap: balance;
  overflow-wrap: break-word;
  min-width: 0;
  margin: 0;
}

p {
  margin: 0;
  text-wrap: pretty;
  max-width: 65ch;
}

a {
  color: var(--color-ink);
  text-decoration: underline;
  text-decoration-color: var(--color-muted);
  text-underline-offset: 0.2em;
  transition: color var(--dur-short) var(--ease-out), text-decoration-color var(--dur-short) var(--ease-out);
}

a:hover {
  text-decoration-color: var(--color-accent);
}

:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.visually-hidden:where(:not(:focus-within, :active)) {
  position: absolute !important;
  clip-path: inset(50%) !important;
  overflow: hidden !important;
  width: 1px !important;
  height: 1px !important;
  margin: -1px !important;
  padding: 0 !important;
  border: 0 !important;
  white-space: nowrap !important;
}

.skip-link {
  position: fixed;
  top: var(--space-sm);
  left: var(--space-sm);
  z-index: var(--z-sticky-nav);
  background: var(--color-accent);
  color: var(--color-accent-ink);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-pill);
  font-weight: 500;
  text-decoration: none;
}

.figure {
  font-family: var(--font-display);
  font-weight: var(--display-weight);
  letter-spacing: -0.03em;
  font-variant-numeric: lining-nums tabular-nums;
}

.tabular {
  font-variant-numeric: lining-nums tabular-nums;
}

.mono {
  font-family: var(--font-outlier);
  font-size: var(--text-sm);
}

button, .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  min-height: 44px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-pill);
  border: var(--rule-hair) solid var(--color-field-border);
  background: transparent;
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  text-decoration: none;
  transition: background-color var(--dur-short) var(--ease-out), border-color var(--dur-short) var(--ease-out), transform var(--dur-micro) var(--ease-out);
}

button:hover:not(:disabled), .btn:hover {
  background: var(--color-paper-3);
  border-color: var(--color-ink-2);
}

button:active:not(:disabled), .btn:active {
  transform: translateY(1px);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.btn--primary:hover:not(:disabled) {
  background: color-mix(in oklab, var(--color-accent) 88%, var(--color-ink));
  border-color: color-mix(in oklab, var(--color-accent) 88%, var(--color-ink));
}

.btn--secondary {
  background: var(--color-paper-2);
  border-color: var(--color-field-border);
  color: var(--color-ink);
}

.btn--ghost {
  background: transparent;
  border-color: var(--color-rule);
  color: var(--color-ink-2);
}

.btn--compact {
  min-height: 36px;
  padding: 0 var(--space-md);
  position: relative;
}

.btn--compact::before {
  content: "";
  position: absolute;
  inset: -4px 0;
}

label, .field-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-ink-2);
  margin-bottom: var(--space-2xs);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-muted);
  min-height: 1lh;
  margin-top: var(--space-2xs);
}

input[type="text"],
input[type="search"],
textarea,
select {
  width: 100%;
  min-height: 44px;
  padding: var(--space-xs) var(--space-sm);
  border: var(--rule-hair) solid var(--color-field-border);
  border-radius: var(--radius-sm);
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: 1.45;
  outline: 2px solid transparent;
  outline-offset: -3px;
  transition: background-color var(--dur-short) var(--ease-out), border-color var(--dur-short) var(--ease-out);
}

input[type="text"]:hover,
textarea:hover,
select:hover {
  background: var(--color-paper-3);
}

input[type="text"]:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: -3px;
  border-color: var(--color-ink-2);
}

textarea {
  min-height: 5.5rem;
  resize: vertical;
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  border: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper);
  cursor: pointer;
}

.check-row input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
  margin-top: var(--space-3xs);
  cursor: pointer;
}

@supports not (accent-color: auto) {
  .check-row input[type="checkbox"] {
    outline: 1px solid var(--color-field-border);
  }
}

.well {
  background: var(--color-paper-2);
  color: var(--color-ink);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-well);
  padding: var(--space-lg);
}

.hidden {
  display: none !important;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

@media (forced-colors: active) {
  .well, .stage-header, .narrator-bar, button, .btn, input, textarea, select {
    border: 1px solid CanvasText;
  }
  .btn--primary {
    background: Highlight;
    color: HighlightText;
    border-color: Highlight;
  }
  :focus-visible {
    outline: 2px solid Highlight;
  }
}
`;

export function workshopCss(): string {
  return `/* Hallmark · shape: app screen · genre: atmospheric · theme: kiln (1/3, ember) · posture: full-palette · signature: 1D-to-2D spatial axis-to-off-axis positioning canvas with British narrator · v2.0.0 */
/* Hallmark · pre-emit critique: P5 H4 E5 S5 R4 V5 · weakest: R, kept one smoked well layer and hairline dividers on dark ground */
${KILN_ROOT_TOKENS}
${SHARED_BASE_CSS}

.stage-shell {
  min-height: 100dvh;
  padding-bottom: 5.5rem;
}

.stage-header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky-nav);
  background: color-mix(in oklab, var(--color-paper) 92%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.stage-header__inner {
  max-width: 1360px;
  margin: 0 auto;
  padding: var(--space-sm) var(--space-lg);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.brand-lockup {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  min-width: 0;
}

.brand-lockup h1 {
  font-size: var(--text-title);
}

.session-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
  color: var(--color-muted);
  font-size: var(--text-xs);
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-3xs) var(--space-xs);
  border-radius: var(--radius-pill);
  border: var(--rule-hair) solid var(--color-rule);
  color: var(--color-ink-2);
  font-size: var(--text-xs);
}

.mode-badge[data-live="true"] {
  border-color: var(--color-pass);
  background: var(--color-pass-surface);
}

.step-rail {
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 var(--space-lg) var(--space-sm);
}

.step-rail ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: var(--space-xs);
  overflow-x: auto;
}

.step-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  min-height: 36px;
  padding: 0 var(--space-sm);
  border-radius: var(--radius-pill);
  border: var(--rule-hair) solid var(--color-rule);
  background: transparent;
  color: var(--color-muted);
  font-size: var(--text-xs);
  white-space: nowrap;
}

.step-chip[aria-current="step"] {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-ink);
  font-weight: 500;
}

.step-chip[data-state="done"] {
  color: var(--color-ink);
  border-color: var(--color-field-border);
}

.stage-layout {
  max-width: 1360px;
  margin: 0 auto;
  padding: var(--space-lg);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(290px, 360px);
  gap: var(--space-lg);
  align-items: start;
}

@media (max-width: 960px) {
  .stage-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

.stage-main {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.stage-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  padding-bottom: var(--space-md);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  margin-bottom: var(--space-lg);
}

.stage-head h2 {
  font-size: var(--text-section);
}

.stage-lead {
  color: var(--color-ink-2);
  margin-bottom: var(--space-md);
}

.field-grid {
  display: grid;
  gap: var(--space-md);
}

.field-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 680px) {
  .field-grid--two {
    grid-template-columns: minmax(0, 1fr);
  }
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.compass-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-paper-2);
  color: var(--color-ink);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-well);
}

@media (max-width: 720px) {
  .compass-strip {
    grid-template-columns: minmax(0, 1fr);
  }
}

.compass-item {
  border-left: var(--rule-hair) solid var(--color-rule);
  padding-left: var(--space-md);
  min-width: 0;
}

.compass-item:first-child {
  border-left: 0;
  padding-left: 0;
}

.compass-key {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.compass-val {
  font-size: var(--text-sm);
  color: var(--color-ink);
  margin-top: var(--space-3xs);
  overflow-wrap: break-word;
}

/* Interactive Paradox Experiment */
.paradox-lab {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: var(--space-lg);
  align-items: center;
  padding: var(--space-lg) 0;
  border-top: var(--rule-hair) solid var(--color-rule);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  margin: var(--space-md) 0 var(--space-lg);
}

@media (max-width: 720px) {
  .paradox-lab {
    grid-template-columns: minmax(0, 1fr);
  }
}

.paradox-cups {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

/* Spatial SVG Canvas */
.spatial-frame {
  background: var(--color-paper);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  margin: var(--space-md) 0;
}

.spatial-svg {
  width: 100%;
  height: auto;
  display: block;
  user-select: none;
  touch-action: none;
}

.svg-label {
  font-family: var(--font-body);
  font-size: 12px;
  fill: var(--color-muted);
}

.svg-label--strong {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  fill: var(--color-ink);
}

.svg-label--marker {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  fill: var(--color-accent-ink);
}

.drag-node {
  cursor: grab;
}

.drag-node:active {
  cursor: grabbing;
}

.drag-node:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 4px;
}

.drag-node:focus-visible circle {
  stroke: var(--color-focus);
  stroke-width: 3px;
}

.rival-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  align-items: center;
  margin-top: var(--space-sm);
}

.rival-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-2xs) var(--space-sm);
  border-radius: var(--radius-pill);
  border: var(--rule-hair) solid var(--color-rule);
  background: var(--color-paper);
  font-size: var(--text-xs);
  color: var(--color-ink-2);
}

.rival-pill button {
  min-height: 24px;
  padding: 0 var(--space-2xs);
  border: 0;
  color: var(--color-muted);
}

.rival-add {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.rival-add input {
  max-width: 18rem;
}

/* Onlyness Formula & Live Lint */
.formula-preview {
  font-family: var(--font-display);
  font-size: var(--text-section);
  line-height: 1.15;
  padding: var(--space-lg) 0;
  border-top: var(--rule-hair) solid var(--color-rule);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  margin: var(--space-md) 0;
  color: var(--color-ink);
}

.lint-list {
  list-style: none;
  margin: var(--space-md) 0 0;
  padding: 0;
  display: grid;
  gap: var(--space-xs);
}

.lint-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  border: var(--rule-hair) solid var(--color-rule);
}

.lint-item[data-severity="fail"] {
  background: var(--color-error-surface);
  border-color: var(--color-error);
}

.lint-item[data-severity="weak"] {
  background: var(--color-warn-surface);
  border-color: var(--color-warn);
}

.lint-item[data-severity="pass"] {
  background: var(--color-pass-surface);
  border-color: var(--color-pass);
}

.brad-pitt-box {
  padding: var(--space-md);
  border-left: 2px solid var(--color-accent);
  background: var(--color-paper);
  margin-top: var(--space-md);
}

/* Truthmode & Cuts */
.split-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
  padding: var(--space-md) 0;
  border-top: var(--rule-hair) solid var(--color-rule);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  margin: var(--space-md) 0;
}

@media (max-width: 720px) {
  .split-compare {
    grid-template-columns: minmax(0, 1fr);
  }
}

.cuts-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
}

.cut-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-2xs) var(--space-sm);
  border-radius: var(--radius-pill);
  border: var(--rule-hair) solid var(--color-error);
  background: var(--color-error-surface);
  font-size: var(--text-xs);
  color: var(--color-ink);
}

.cut-chip button {
  min-height: 22px;
  padding: 0 var(--space-2xs);
  border: 0;
}

/* Coach Rail */
.coach-rail {
  position: sticky;
  top: 7.5rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

@media (max-width: 960px) {
  .coach-rail {
    position: static;
  }
}

.coach-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.coach-head h2 {
  font-size: var(--text-title);
}

.coach-budget {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.coach-log {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  max-height: 19rem;
  overflow-y: auto;
  padding: var(--space-sm) 0;
  border-top: var(--rule-hair) solid var(--color-rule);
  border-bottom: var(--rule-hair) solid var(--color-rule);
  margin: var(--space-sm) 0;
}

.coach-entry {
  padding-left: var(--space-sm);
  border-left: 2px solid var(--color-rule);
}

.coach-entry[data-role="coach"] {
  border-left-color: var(--color-accent);
}

.coach-entry[data-role="human"] {
  border-left-color: var(--color-ink-2);
}

.coach-meta {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.coach-text {
  font-size: var(--text-sm);
  color: var(--color-ink);
  margin-top: var(--space-3xs);
}

.exits-box {
  padding-top: var(--space-sm);
  border-top: var(--rule-hair) dashed var(--color-rule);
  margin-top: var(--space-sm);
  display: grid;
  gap: var(--space-xs);
}

.sync-footer {
  padding-top: var(--space-sm);
  border-top: var(--rule-hair) solid var(--color-rule);
  margin-top: var(--space-sm);
  display: grid;
  gap: var(--space-xs);
}

.status-line {
  font-size: var(--text-xs);
  color: var(--color-ink-2);
  min-height: 1.25em;
}

/* Bottom British Narrator Caption Ribbon */
.narrator-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-sticky);
  background: color-mix(in oklab, var(--color-paper-2) 96%, transparent);
  color: var(--color-ink);
  backdrop-filter: blur(10px);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.narrator-bar__inner {
  max-width: 1360px;
  margin: 0 auto;
  padding: var(--space-xs) var(--space-lg);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-md);
  align-items: center;
}

@media (max-width: 780px) {
  .narrator-bar__inner {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-xs);
  }
}

.narrator-caption {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
}

.narrator-tag {
  font-size: var(--text-xs);
  color: var(--color-muted);
  white-space: nowrap;
}

.narrator-line {
  font-size: var(--text-sm);
  color: var(--color-ink);
  line-height: 1.45;
  max-width: 70ch;
}

.narrator-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs);
}

.narrator-select {
  width: auto;
  min-width: 10rem;
  max-width: 14rem;
  min-height: 36px;
  font-size: var(--text-xs);
  padding: var(--space-2xs) var(--space-xs);
}

.narrator-bar [aria-pressed="true"] {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-ink);
}
`;
}

export function pitchCss(): string {
  return `/* Hallmark · shape: Manifesto · genre: atmospheric · theme: kiln (1/3, ember) · posture: full-palette · hero: Stage · nav: inline-anchors · footer: colophon · signature: reverse-walk 2D off-axis map and British narrator pitch · v2.0.0 */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R4 V5 · weakest: R, balanced map stage against concise four-beat narrative */
/* Hallmark · dismissed 58 · the pitch hero headline renders the user's verbatim onlyness statement which can exceed seven words */
${KILN_ROOT_TOKENS}
${SHARED_BASE_CSS}

.pitch-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky-nav);
  background: color-mix(in oklab, var(--color-paper) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

.pitch-nav__inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--space-sm) var(--space-lg);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.pitch-nav__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: var(--text-sm);
}

.pitch-container {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 var(--space-lg) var(--space-2xl);
}

.pitch-hero {
  min-height: 68dvh;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: var(--space-xl);
  align-items: center;
  padding: var(--space-xl) 0;
  border-bottom: var(--rule-hair) solid var(--color-rule);
}

@media (max-width: 860px) {
  .pitch-hero {
    grid-template-columns: minmax(0, 1fr);
    min-height: auto;
  }
}

.pitch-hero h1 {
  font-size: var(--text-display);
  max-width: 18ch;
}

.pitch-hero__lead {
  color: var(--color-ink-2);
  margin-top: var(--space-md);
}

.pitch-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.map-panel {
  background: var(--color-paper-2);
  color: var(--color-ink);
  border-radius: var(--radius-card);
  padding: var(--space-md);
  box-shadow: var(--shadow-card);
}

.pitch-voice-wrap {
  margin-top: var(--space-md);
  max-width: 18rem;
}

.map-panel svg {
  width: 100%;
  height: auto;
  display: block;
}

.svg-label {
  font-family: var(--font-body);
  font-size: 12px;
  fill: var(--color-muted);
}

.svg-label--strong {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  fill: var(--color-ink);
}

.svg-label--marker {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  fill: var(--color-accent-ink);
}

.beats {
  margin-top: var(--space-xl);
}

.beat {
  padding: var(--space-xl) 0;
  border-bottom: var(--rule-hair) solid var(--color-rule);
  display: grid;
  grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
  gap: var(--space-lg);
  align-items: start;
}

@media (max-width: 760px) {
  .beat {
    grid-template-columns: minmax(0, 1fr);
  }
}

.beat-num {
  font-size: var(--text-display-s);
  font-variant-numeric: lining-nums tabular-nums;
  color: var(--color-ink-2);
}

.beat-label {
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin-top: var(--space-2xs);
}

.beat-body h2 {
  font-size: var(--text-section);
  margin-bottom: var(--space-md);
}

.contrast-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-lg);
}

@media (max-width: 680px) {
  .contrast-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.contrast-col {
  padding-top: var(--space-sm);
  border-top: var(--rule-hair) solid var(--color-rule);
}

.contrast-heading {
  font-size: var(--text-sm);
  color: var(--color-muted);
  margin-bottom: var(--space-xs);
}

.proof-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

@media (max-width: 720px) {
  .proof-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

.proof-cell {
  background: var(--color-paper-2);
  color: var(--color-ink);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-well);
  padding: var(--space-md);
}

.cuts-band {
  margin-top: var(--space-xl);
  background: var(--color-paper-2);
  color: var(--color-ink);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-well);
  padding: var(--space-lg);
}

.cuts-band ul {
  margin: var(--space-md) 0 0;
  padding-left: var(--space-lg);
  display: grid;
  gap: var(--space-xs);
}

.landing-band {
  margin-top: var(--space-xl);
  padding: var(--space-xl) 0;
}

.landing-band h2 {
  font-size: var(--text-display-s);
  max-width: 24ch;
}

.pitch-footer {
  max-width: 1120px;
  margin: 0 auto;
  padding: var(--space-lg);
  border-top: var(--rule-hair) solid var(--color-rule);
  color: var(--color-muted);
  font-size: var(--text-sm);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-md);
}

.narrator-caption-banner {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-paper-2);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--color-ink-2);
}
`;
}

export function chillCss(): string {
  return `/* Hallmark · shape: Letter · genre: atmospheric · theme: kiln (1/3, ember) · posture: full-palette · hero: Settled · nav: none · footer: none · signature: calm pause room with British narrator invitation to stop · v2.0.0 */
/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · cut: removed progress bars, timers, and extra links so the room gives unambiguous permission to stop */
${KILN_ROOT_TOKENS}
${SHARED_BASE_CSS}

.chill-stage {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--space-xl) var(--space-lg);
}

.chill-room {
  width: 100%;
  max-width: 40rem;
  background: var(--color-paper-2);
  color: var(--color-ink);
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: var(--radius-card);
  padding: var(--space-xl);
}

.chill-room h1 {
  font-size: var(--text-display-s);
  margin-bottom: var(--space-md);
}

.chill-lead {
  font-size: var(--text-lg);
  color: var(--color-ink);
  margin-bottom: var(--space-md);
}

.chill-copy {
  color: var(--color-ink-2);
  margin-bottom: var(--space-md);
}

.chill-reason {
  border-left: 2px solid var(--color-accent);
  padding-left: var(--space-md);
  margin: var(--space-md) 0;
  color: var(--color-ink-2);
}

.chill-list {
  margin: var(--space-md) 0 var(--space-lg);
  padding-left: var(--space-lg);
  color: var(--color-muted);
  display: grid;
  gap: var(--space-xs);
}

.chill-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  align-items: center;
}

.chill-caption {
  margin-top: var(--space-md);
  font-size: var(--text-sm);
  color: var(--color-muted);
  min-height: 1.5em;
}
`;
}
