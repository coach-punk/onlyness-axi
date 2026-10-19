import type { CommandModule } from "../cli/router.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { closeAllServers, closeServer } from "../server/handles.js";
import { deleteServerMeta, readServerMeta } from "../server/meta.js";
import { listSessions, saveSession } from "../session/store.js";
import { requireSession, root } from "./session-io.js";

function tryKillPid(pid: number): void {
  try {
    process.kill(pid);
  } catch {
    // Process may already be gone.
  }
}

export const endCommand: CommandModule = {
  spec: {
    name: "end",
    summary: "Mark session ended; stop serve daemon",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi end s-2026-…"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    const rootDir = root();

    const meta = readServerMeta(rootDir, session.id);
    if (meta) {
      tryKillPid(meta.pid);
      deleteServerMeta(rootDir, session.id);
    }

    await closeServer(session.id);

    session = { ...session, status: "ended" };
    saveSession(rootDir, session);

    const stillActive = listSessions(rootDir).some(
      (s) => s.status === "active" && s.id !== session.id,
    );
    if (!stillActive) {
      await closeAllServers();
    }

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["step", session.step],
      ]),
    );
    print(
      emitBlock("next", [
        "1. onlyness-axi result " + session.id,
        "2. onlyness-axi start --entry blank",
      ]),
    );
    return 0;
  },
};
