import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { canAdvance, satisfactionComplete } from "../session/steps.js";
import { saveSession, sessionDir } from "../session/store.js";
import { renderPitch } from "../surface/pitch.js";
import { requireSession, root } from "./session-io.js";

export function writePitchFile(sessionId: string, html: string): void {
  const dir = sessionDir(root(), sessionId);
  writeFileSync(join(dir, "pitch.html"), html);
}

export function pitchUrl(port: number | undefined): string {
  if (!port) return "";
  return `http://127.0.0.1:${port}/pitch`;
}

/** Generate pitch.html when satisfaction + statement + non-fail truthmode. */
export function generatePitch(sessionId: string) {
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
  if (t.verdict === "fail") {
    throw new AxiError(
      "truthmode failed",
      "revise the statement until truthmode is pass or weak",
    );
  }
  if (!satisfactionComplete(session.satisfaction)) {
    throw new AxiError(
      "not fully satisfied yet",
      "confirm stand, axis, off-axis, onlyness, and statement on the pitch step",
    );
  }
  const html = renderPitch(session);
  writePitchFile(session.id, html);
  return session;
}

export const pitchCommand: CommandModule = {
  spec: {
    name: "pitch",
    summary: "Generate reverse-walk pitch.html (philosophy deliverable)",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi pitch s-…"],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    const session = generatePitch(id);
    const url = pitchUrl(session.port);
    const path = join(sessionDir(root(), session.id), "pitch.html");

    print(
      emitKV([
        ["session", session.id],
        ["pitchFile", path],
        ["pitchUrl", url || "(serve running? open /pitch)"],
        ["gate", canAdvance({ ...session, step: "pitch" }).ok ? "ready" : "blocked"],
      ]),
    );
    print(
      emitBlock("next", [
        url ? `1. Open ${url}` : "1. onlyness-axi serve " + session.id,
        `2. onlyness-axi advance ${session.id} when satisfied (to done)`,
        `3. onlyness-axi result ${session.id}`,
      ]),
    );
    return 0;
  },
};

export function pitchFileExists(sessionId: string): boolean {
  return existsSync(join(sessionDir(root(), sessionId), "pitch.html"));
}
