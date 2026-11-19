import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { consumeCoachTurn } from "../session/coach.js";
import { saveSession } from "../session/store.js";
import type { Session } from "../session/types.js";
import {
  requireSession,
  root,
  workshopFilePath,
  writeWorkshopFile,
} from "./session-io.js";

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

export const coachCommand: CommandModule = {
  spec: {
    name: "coach",
    summary: "Post a coach or system message onto the workshop surface (alias: reply)",
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
      {
        name: "offer-chill",
        type: "boolean",
        default: false,
        description:
          "offer a one-shot Accept break control (does not pause until accepted)",
      },
    ],
    examples: [
      'onlyness-axi coach s-… --text "Who specifically hurts?"',
      'onlyness-axi coach s-… --system --text "Arena draft from mutual context"',
      'onlyness-axi coach s-… --system --offer-chill --text "Take a break — come back when your head is clearer."',
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    const text = parsed.flags["text"];
    if (typeof text !== "string" || !text.trim()) {
      throw new UsageError(
        "flag --text is required",
        'usage: onlyness-axi coach <session> --text "…"',
      );
    }
    const asSystem = Boolean(parsed.flags["system"]);
    const offerChill = Boolean(parsed.flags["offer-chill"]);
    let session = requireSession(id);
    const rootDir = root();

    if (session.status === "paused") {
      throw new AxiError(
        "session is paused",
        `onlyness-axi resume ${id} before coaching`,
      );
    }
    if (session.status === "ended") {
      throw new AxiError(
        "session already ended",
        "start a new session with onlyness-axi start",
      );
    }

    // Chill offers never burn clarify/ground/mirror budget.
    if (asSystem || offerChill) {
      session = appendSystem(session, text);
    } else {
      const result = consumeCoachTurn(session, text);
      if (result.exhausted) {
        throw new AxiError(
          "coach budget exhausted for this step",
          "offer exits (examples / stuck / weak advance), chill, revise, or advance when gate ready",
        );
      }
      session = result.session;
    }

    if (offerChill) {
      session = {
        ...session,
        chillOfferedAt: new Date().toISOString(),
      };
    }

    saveSession(rootDir, session);
    writeWorkshopFile(session, rootDir);

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["role", asSystem || offerChill ? "system" : "coach"],
        ["coachBudgetUsed", `${session.coachBudget.used}/${session.coachBudget.max}`],
        ["lastJob", session.coachBudget.lastJob ?? ""],
        ["chillOffered", offerChill ? "true" : "false"],
        ["workshopFile", workshopFilePath(session.id)],
      ]),
    );
    print(
      emitBlock("next", [
        offerChill
          ? `1. Wait for Accept break (or onlyness-axi chill ${id})`
          : `1. onlyness-axi status ${session.id}`,
        `2. onlyness-axi advance ${session.id} when gate ready`,
      ]),
    );
    return 0;
  },
};

export const replyCommand = coachCommand;
