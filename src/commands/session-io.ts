import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AxiError } from "../output/errors.js";
import type { Session, TruthmodeState } from "../session/types.js";
import { loadSession, onlynessRoot, sessionDir } from "../session/store.js";
import { renderSurface } from "../surface/template.js";

export function root(): string {
  return onlynessRoot(process.cwd());
}

export function requireSession(id: string | undefined): Session {
  if (!id || !id.trim()) {
    throw new AxiError(
      "missing session id",
      "pass a session id, e.g. onlyness-axi poll s-…",
    );
  }
  try {
    return loadSession(root(), id);
  } catch {
    throw new AxiError(
      `session not found: ${id}`,
      "run onlyness-axi (no args) to list sessions, or start a new one",
    );
  }
}

export function writeSurfaceFile(session: Session): void {
  const dir = sessionDir(root(), session.id);
  writeFileSync(join(dir, "surface.html"), renderSurface(session));
}

export function emptyTruthmode(): TruthmodeState {
  return {
    verdict: null,
    checks: [],
    swap: "",
    itch: "",
    sticky: "",
    jackBlack: "",
    cuts: [],
  };
}
