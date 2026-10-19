import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { loadSession, saveSession, sessionDir } from "../session/store.js";
import type { Session } from "../session/types.js";
import { renderSurface } from "../surface/template.js";
import { requireSession, root } from "./session-io.js";

export function resumeSession(rootDir: string, sessionId: string): Session {
  let session: Session;
  try {
    session = loadSession(rootDir, sessionId);
  } catch {
    throw new AxiError(
      `session not found: ${sessionId}`,
      "run onlyness-axi list or start a new session",
    );
  }
  if (session.status === "ended") {
    throw new AxiError(
      "session already ended",
      "start a new session with onlyness-axi start",
    );
  }
  session = {
    ...session,
    status: "active",
    chillOfferedAt: null,
    coachLog: [
      ...session.coachLog,
      {
        at: new Date().toISOString(),
        step: session.step,
        role: "system",
        text: "resume: back to the workshop",
      },
    ],
  };
  saveSession(rootDir, session);
  writeFileSync(
    join(sessionDir(rootDir, session.id), "surface.html"),
    renderSurface(session),
  );
  return session;
}

export const resumeCommand: CommandModule = {
  spec: {
    name: "resume",
    summary: "Unpause a chilled session and restore the workshop surface",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi resume s-…"],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    requireSession(id);
    const session = resumeSession(root(), id);
    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["step", session.step],
      ]),
    );
    print(
      emitBlock("next", [
        `1. onlyness-axi poll ${session.id}`,
        `2. onlyness-axi playbook ${session.step === "off_axis" ? "off-axis" : session.step}`,
      ]),
    );
    return 0;
  },
};
