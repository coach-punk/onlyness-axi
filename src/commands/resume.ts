import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { loadSession, saveSession } from "../session/store.js";
import type { Session } from "../session/types.js";
import {
  requireSession,
  root,
  workshopFilePath,
  writeWorkshopFile,
} from "./session-io.js";

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
  const { chillReason: _dropped, ...rest } = session;
  session = {
    ...rest,
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
  writeWorkshopFile(session, rootDir);
  return session;
}

export const resumeCommand: CommandModule = {
  spec: {
    name: "resume",
    summary: "Unpause a chilled session and restore the workshop canvas",
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
    const playbookId =
      session.step === "off_axis" ? "off-axis" : session.step;

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["step", session.step],
        ["workshopFile", workshopFilePath(session.id)],
      ]),
    );
    print(
      emitBlock("next", [
        `1. onlyness-axi status ${session.id}`,
        `2. onlyness-axi playbook ${playbookId}`,
      ]),
    );
    return 0;
  },
};
