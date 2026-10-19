import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { consumeCoachTurn } from "../session/coach.js";
import { saveSession } from "../session/store.js";
import type { Session } from "../session/types.js";
import { requireSession, root, writeSurfaceFile } from "./session-io.js";

function appendSystem(session: Session, text: string): Session {
  return {
    ...session,
    coachLog: [
      ...session.coachLog,
      {
        at: new Date().toISOString(),
        step: session.step,
        role: "system",
        text,
      },
    ],
  };
}

export const replyCommand: CommandModule = {
  spec: {
    name: "reply",
    summary: "Post a coach or system message onto the session surface",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      {
        name: "text",
        type: "string",
        description: "message text (required)",
      },
      {
        name: "system",
        type: "boolean",
        default: false,
        description: "system message; does not burn coach budget",
      },
    ],
    examples: [
      'onlyness-axi reply s-… --text "Who specifically hurts?"',
      'onlyness-axi reply s-… --system --text "Arena draft from mutual context"',
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    const text = parsed.flags["text"];
    if (typeof text !== "string" || !text.trim()) {
      throw new UsageError(
        "flag --text is required",
        'usage: onlyness-axi reply <session> --text "…"',
      );
    }
    const asSystem = Boolean(parsed.flags["system"]);
    let session = requireSession(id);
    const rootDir = root();

    if (asSystem) {
      session = appendSystem(session, text);
    } else {
      const result = consumeCoachTurn(session, text);
      if (result.exhausted) {
        throw new AxiError(
          "coach budget exhausted for this step",
          "offer exits (examples / stuck / weak advance) or advance when gate ready",
        );
      }
      session = result.session;
    }

    saveSession(rootDir, session);
    writeSurfaceFile(session);

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["role", asSystem ? "system" : "coach"],
        ["coachBudgetUsed", session.coachBudget.used],
        ["lastJob", session.coachBudget.lastJob ?? ""],
      ]),
    );
    print(
      emitBlock("next", [
        `1. onlyness-axi poll ${session.id}`,
        `2. onlyness-axi advance ${session.id} when gate ready`,
      ]),
    );
    return 0;
  },
};
