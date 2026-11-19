import type { CommandModule } from "../cli/router.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { saveSession } from "../session/store.js";
import { requireSession, root, writeWorkshopFile } from "./session-io.js";

export const endCommand: CommandModule = {
  spec: {
    name: "end",
    summary: "Mark session ended cleanly",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi end s-2026-…"],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    const rootDir = root();

    session = { ...session, status: "ended" };
    saveSession(rootDir, session);
    writeWorkshopFile(session, rootDir);

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["step", session.step],
      ]),
    );
    print(
      emitBlock("next", [
        `1. onlyness-axi result ${session.id}`,
        "2. onlyness-axi start --entry blank",
      ]),
    );
    return 0;
  },
};
