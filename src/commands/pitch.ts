import { existsSync, writeFileSync } from "node:fs";
import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { canAdvance, satisfactionComplete } from "../session/steps.js";
import type { Session } from "../session/types.js";
import { renderPitch } from "../surface/pitch.js";
import {
  openInBrowser,
  pitchFilePath,
  requireSession,
} from "./session-io.js";

export function writePitchFile(sessionId: string, html: string): string {
  const path = pitchFilePath(sessionId);
  writeFileSync(path, html, "utf8");
  return path;
}

/** Generate pitch.html when satisfaction + statement + swap + non-fail truthmode. */
export function generatePitch(sessionId: string): { session: Session; path: string } {
  const session = requireSession(sessionId);
  if (!session.statement.trim()) {
    throw new AxiError(
      "missing onlyness statement",
      "finish Step 4 before generating the pitch",
    );
  }
  const t = session.truthmode;
  if (!t || t.verdict === null) {
    throw new AxiError(
      "truthmode not run",
      `onlyness-axi truthmode check ${sessionId}`,
    );
  }
  if (!t.swap.trim()) {
    throw new AxiError(
      "adversarial swap not recorded",
      `onlyness-axi truthmode set-swap ${sessionId} --text "…"`,
    );
  }
  if (t.verdict === "fail") {
    throw new AxiError(
      "truthmode failed",
      `revise off_axis or onlyness before pitch: onlyness-axi revise ${sessionId} onlyness`,
    );
  }
  if (!satisfactionComplete(session.satisfaction)) {
    throw new AxiError(
      "not fully satisfied yet",
      "confirm stand, axis, off-axis, onlyness, and statement on the pitch step",
    );
  }
  const html = renderPitch(session);
  const path = writePitchFile(session.id, html);
  return { session, path };
}

export const pitchCommand: CommandModule = {
  spec: {
    name: "pitch",
    summary: "Generate reverse-walk pitch.html (philosophy deliverable)",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      {
        name: "open",
        type: "boolean",
        default: false,
        description: "open generated pitch.html in default browser",
      },
    ],
    examples: [
      "onlyness-axi pitch s-…",
      "onlyness-axi pitch s-… --open",
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    const { session, path } = generatePitch(id);
    if (parsed.flags["open"]) {
      openInBrowser(path);
    }

    print(
      emitKV([
        ["session", session.id],
        ["pitchFile", path],
        ["gate", canAdvance({ ...session, step: "pitch" }).ok ? "ready" : "blocked"],
      ]),
    );
    print(
      emitBlock("next", [
        `1. Open ${path}`,
        `2. onlyness-axi advance ${session.id} when satisfied (to done)`,
        `3. onlyness-axi result ${session.id}`,
      ]),
    );
    return 0;
  },
};

export function pitchFileExists(sessionId: string): boolean {
  return existsSync(pitchFilePath(sessionId));
}
