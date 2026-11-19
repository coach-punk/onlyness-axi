import { readFileSync } from "node:fs";
import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print, toonValue } from "../output/toon.js";
import { coachJobGuidance, nextCoachJob } from "../session/coach.js";
import {
  applyHumanSubmit,
  canAdvance,
  type HumanSubmitPayload,
} from "../session/steps.js";
import { saveSession } from "../session/store.js";
import { requireSession, root, writeWorkshopFile } from "./session-io.js";

export const submitCommand: CommandModule = {
  spec: {
    name: "submit",
    summary: "Apply human submission or chat answer directly (headless / standalone sync)",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      { name: "json", type: "string", description: "JSON HumanSubmitPayload string" },
      { name: "file", type: "string", description: "path to JSON payload file" },
    ],
    examples: [
      'onlyness-axi submit s-… --json \'{"paradoxAck":true}\'',
      'onlyness-axi submit s-… --json \'{"answers":{"stand":{"who":"…","job":"…","solved":"…"}}}\'',
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    if (session.status === "paused") {
      throw new AxiError(
        "session is paused",
        `onlyness-axi resume ${id} before submitting`,
      );
    }
    if (session.status === "ended") {
      throw new AxiError(
        "session already ended",
        "start a new session with onlyness-axi start",
      );
    }

    const jsonFlag = parsed.flags["json"] as string | undefined;
    const fileFlag = parsed.flags["file"] as string | undefined;
    if (!jsonFlag && !fileFlag) {
      throw new UsageError(
        "pass --json <payload> or --file <path>",
        'usage: onlyness-axi submit <session> --json \'{"paradoxAck":true}\'',
      );
    }
    if (jsonFlag && fileFlag) {
      throw new UsageError(
        "pass only one of --json or --file",
        "usage: onlyness-axi submit <session> --json '{…}'",
      );
    }

    let raw = jsonFlag ?? "";
    if (fileFlag) {
      try {
        raw = readFileSync(fileFlag, "utf8");
      } catch {
        throw new UsageError(
          `cannot read payload file '${fileFlag}'`,
          "check the path and try again",
        );
      }
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(raw);
    } catch {
      throw new UsageError(
        "invalid JSON payload",
        "check JSON syntax and try again",
      );
    }
    if (
      parsedPayload === null ||
      typeof parsedPayload !== "object" ||
      Array.isArray(parsedPayload)
    ) {
      throw new UsageError(
        "payload must be a JSON object",
        'example: --json \'{"paradoxAck":true}\'',
      );
    }

    const payload = parsedPayload as HumanSubmitPayload;
    session = applyHumanSubmit(session, payload);
    const rootDir = root();
    saveSession(rootDir, session);
    const workshopFile = writeWorkshopFile(session, rootDir);

    const gate = canAdvance(session);
    const job = nextCoachJob(session.coachBudget.used);
    const guidance = coachJobGuidance(session.step, job);

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["gate", gate.ok ? "ready" : "blocked"],
        ["gateReason", gate.reason ?? ""],
        ["coachBudgetUsed", `${session.coachBudget.used}/${session.coachBudget.max}`],
        ["coachJob", job ?? "exhausted"],
        ["coachJobGuidance", guidance],
        ["workshopFile", workshopFile],
      ]),
    );
    print(
      emitBlock("payload", [
        "--- BEGIN HUMAN SUBMISSION ---",
        toonValue(JSON.stringify(payload)),
        "--- END HUMAN SUBMISSION ---",
      ]),
    );

    const nextLines: string[] = [];
    if (gate.ok) {
      nextLines.push(`1. onlyness-axi coach ${session.id} --text "…" (or advance immediately)`);
      nextLines.push(`2. onlyness-axi advance ${session.id}`);
    } else {
      nextLines.push(`1. onlyness-axi coach ${session.id} --text "…"`);
      nextLines.push(`2. onlyness-axi status ${session.id}`);
    }
    print(emitBlock("next", nextLines));
    return 0;
  },
};
