import type { CommandModule } from "../cli/router.js";
import { emitBlock, emitKV, emitList, print } from "../output/toon.js";
import { requireSession } from "./session-io.js";

export const resultCommand: CommandModule = {
  spec: {
    name: "result",
    summary: "Emit worksheet KV for answers, statement, and truthmode",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi result s-2026-…"],
  },
  run(parsed) {
    const session = requireSession(parsed.positionals[0]);
    const t = session.truthmode;

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["entry", session.entry],
        ["step", session.step],
        ["industry", session.arena.industry],
        ["offering", session.arena.offering],
        ["audience", session.arena.audience],
        ["statement", session.statement],
        ["verdict", t?.verdict ?? ""],
        ["swap", t?.swap ?? ""],
        ["itch", t?.itch ?? ""],
        ["sticky", t?.sticky ?? ""],
        ["jackBlack", t?.jackBlack ?? ""],
      ]),
    );

    print(
      emitBlock("answers", [
        JSON.stringify(session.answers),
      ]),
    );

    if (t && t.checks.length > 0) {
      print(
        emitList(
          "checks",
          t.checks.map((c) => ({
            id: c.id,
            severity: c.severity,
            detail: c.detail,
          })),
          ["id", "severity", "detail"],
        ),
      );
    } else {
      print("checks[0]:");
    }

    const cuts = t?.cuts ?? [];
    print(emitBlock("cuts", cuts.length > 0 ? cuts : ["(none)"]));

    print(
      emitBlock("next", [
        session.status === "ended"
          ? "1. Session ended"
          : `1. onlyness-axi end ${session.id}`,
      ]),
    );
    return 0;
  },
};
