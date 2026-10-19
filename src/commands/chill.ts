import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { loadSession, saveSession, sessionDir } from "../session/store.js";
import type { Session } from "../session/types.js";
import { renderChill } from "../surface/chill.js";
import { requireSession, root } from "./session-io.js";

export function writeChillFile(
  rootDir: string,
  sessionId: string,
  html: string,
): void {
  writeFileSync(join(sessionDir(rootDir, sessionId), "chill.html"), html);
}

export function pauseSession(
  rootDir: string,
  sessionId: string,
  reason?: string,
): Session {
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
    status: "paused",
    chillOfferedAt: null,
    coachLog: [
      ...session.coachLog,
      {
        at: new Date().toISOString(),
        step: session.step,
        role: "system",
        text: reason?.trim()
          ? `chill: paused — ${reason.trim()}`
          : "chill: paused — take a break and come back later",
      },
    ],
  };
  saveSession(rootDir, session);
  writeChillFile(rootDir, session.id, renderChill(session, reason));
  return session;
}

export const chillCommand: CommandModule = {
  spec: {
    name: "chill",
    summary: "Pause the workshop — human takes a break (coach-offered)",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      {
        name: "reason",
        type: "string",
        description: "optional note shown on the chill page",
      },
    ],
    examples: [
      "onlyness-axi chill s-…",
      'onlyness-axi chill s-… --reason "attitude first, onlyness second"',
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    requireSession(id);
    const reason =
      typeof parsed.flags["reason"] === "string"
        ? parsed.flags["reason"]
        : undefined;
    const session = pauseSession(root(), id, reason);
    const url = session.port
      ? `http://127.0.0.1:${session.port}/`
      : "(start serve to open chill page)";

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["step", session.step],
        ["url", url],
      ]),
    );
    print(
      emitBlock("next", [
        "1. Human chills — do not poll-nag",
        `2. onlyness-axi resume ${session.id} when they are ready`,
      ]),
    );
    return 0;
  },
};
