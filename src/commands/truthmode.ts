import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, emitList, print } from "../output/toon.js";
import { saveSession } from "../session/store.js";
import { runRubric } from "../truthmode/rubric.js";
import {
  emptyTruthmode,
  requireSession,
  root,
  workshopFilePath,
  writeWorkshopFile,
} from "./session-io.js";

type Subcommand = "check" | "set-swap";

function parseSub(raw: string | undefined): Subcommand {
  if (raw === "check" || raw === "set-swap") return raw;
  throw new UsageError(
    raw
      ? `unknown truthmode subcommand '${raw}'`
      : "truthmode requires a subcommand",
    "valid: onlyness-axi truthmode check <session>, onlyness-axi truthmode set-swap <session> --text …",
  );
}

export const truthmodeCommand: CommandModule = {
  spec: {
    name: "truthmode",
    summary: "Run rubric check or store Pass 2 adversarial swap",
    args: [
      {
        name: "subcommand",
        required: true,
        description: "check | set-swap",
      },
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      {
        name: "text",
        type: "string",
        description: "swap text for set-swap",
      },
    ],
    examples: [
      "onlyness-axi truthmode check s-…",
      'onlyness-axi truthmode set-swap s-… --text "A generic rival could claim…"',
    ],
  },
  run(parsed) {
    const sub = parseSub(parsed.positionals[0]);
    const sessionId = parsed.positionals[1];
    if (!sessionId) {
      throw new UsageError(
        "missing required argument <session>",
        "onlyness-axi truthmode check <session>",
      );
    }

    switch (sub) {
      case "check":
        return runCheck(sessionId);
      case "set-swap":
        return runSetSwap(sessionId, parsed.flags["text"]);
      default: {
        const _exhaustive: never = sub;
        throw new UsageError(
          `unhandled truthmode subcommand '${String(_exhaustive)}'`,
          "valid: check, set-swap",
        );
      }
    }
  },
};

function runCheck(sessionId: string): number {
  let session = requireSession(sessionId);
  if (session.status === "paused") {
    throw new AxiError(
      "session is paused",
      `onlyness-axi resume ${sessionId} before running truthmode`,
    );
  }
  const rootDir = root();
  const { verdict, checks } = runRubric(session.statement, session.arena);
  session = {
    ...session,
    truthmode: {
      ...(session.truthmode ?? emptyTruthmode()),
      verdict,
      checks,
    },
  };
  saveSession(rootDir, session);
  const workshopFile = writeWorkshopFile(session, rootDir);

  print(
    emitKV([
      ["session", session.id],
      ["verdict", verdict],
      ["statement", session.statement],
      ["workshopFile", workshopFile],
    ]),
  );
  if (checks.length > 0) {
    print(
      emitList(
        "checks",
        checks.map((c) => ({
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

  const nextLines =
    verdict === "fail"
      ? [
          `1. onlyness-axi revise ${session.id} onlyness (or off_axis)`,
          `2. onlyness-axi truthmode set-swap ${session.id} --text "…"`,
        ]
      : [
          `1. onlyness-axi truthmode set-swap ${session.id} --text "…"`,
          `2. Fill itch/sticky/jackBlack via submit or canvas, then advance`,
        ];
  print(emitBlock("next", nextLines));
  return 0;
}

function runSetSwap(sessionId: string, textFlag: string | boolean | undefined): number {
  if (typeof textFlag !== "string" || !textFlag.trim()) {
    throw new UsageError(
      "flag --text is required for set-swap",
      'usage: onlyness-axi truthmode set-swap <session> --text "…"',
    );
  }
  let session = requireSession(sessionId);
  if (session.status === "paused") {
    throw new AxiError(
      "session is paused",
      `onlyness-axi resume ${sessionId} before set-swap`,
    );
  }
  const rootDir = root();
  session = {
    ...session,
    truthmode: {
      ...(session.truthmode ?? emptyTruthmode()),
      swap: textFlag.trim(),
    },
  };
  saveSession(rootDir, session);
  writeWorkshopFile(session, rootDir);

  print(
    emitKV([
      ["session", session.id],
      ["swap", textFlag.trim()],
      ["verdict", session.truthmode?.verdict ?? ""],
      ["workshopFile", workshopFilePath(session.id)],
    ]),
  );
  print(
    emitBlock("next", [
      `1. Complete itch / sticky / jackBlack via submit or canvas`,
      `2. onlyness-axi advance ${session.id} when gate ready`,
    ]),
  );
  return 0;
}
