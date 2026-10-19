import type { CommandModule } from "../cli/router.js";
import { emitBlock, emitKV, print, toonValue } from "../output/toon.js";
import { waitForEvent } from "../server/events.js";
import { ensureServer } from "../server/handles.js";
import { loadSession, saveSession } from "../session/store.js";
import { requireSession, root } from "./session-io.js";

const POLL_MS = 60_000;

export const pollCommand: CommandModule = {
  spec: {
    name: "poll",
    summary: "Long-poll for human submit / need-coach / weak-advance",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi poll s-2026-…"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    const rootDir = root();

    const server = await ensureServer({
      rootDir,
      sessionId: session.id,
      port: session.port,
    });
    if (session.port !== server.port) {
      session = { ...session, port: server.port };
      saveSession(rootDir, session);
    }

    const event = await waitForEvent(session.id, POLL_MS);
    session = loadSession(rootDir, session.id);

    if (!event) {
      print(
        emitKV([
          ["event", "timeout"],
          ["session", session.id],
          ["step", session.step],
          ["coachBudgetUsed", session.coachBudget.used],
        ]),
      );
      print(
        emitBlock("next", [
          `1. onlyness-axi poll ${session.id}`,
          `2. onlyness-axi playbook ${session.step === "off_axis" ? "off-axis" : session.step}`,
        ]),
      );
      return 0;
    }

    const payloadStr = toonValue(JSON.stringify(event.payload));
    print(
      emitKV([
        ["event", event.type],
        ["session", session.id],
        ["step", session.step],
        ["coachBudgetUsed", session.coachBudget.used],
        ["payload", payloadStr],
      ]),
    );
    print(
      emitBlock("next", [
        "1. Coach within budget (playbook coach) then reply",
        `2. onlyness-axi advance ${session.id} when gate ready`,
      ]),
    );
    return 0;
  },
};
