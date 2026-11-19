import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { REVISABLE_STEPS, reviseStep } from "../session/steps.js";
import { saveSession } from "../session/store.js";
import type { StepId } from "../session/types.js";
import {
  requireSession,
  root,
  workshopFilePath,
  writeWorkshopFile,
} from "./session-io.js";

export const reviseCommand: CommandModule = {
  spec: {
    name: "revise",
    summary: "Step back to an earlier step without losing work (unblocks truthmode fail)",
    args: [
      { name: "session", required: true, description: "session id" },
      {
        name: "step",
        required: true,
        description: `target step (${REVISABLE_STEPS.join("|")})`,
      },
    ],
    flags: [],
    examples: [
      "onlyness-axi revise s-… off_axis",
      "onlyness-axi revise s-… onlyness",
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    const rawTarget = parsed.positionals[1]!;
    const target = (rawTarget === "off-axis" ? "off_axis" : rawTarget) as StepId;

    if (!REVISABLE_STEPS.includes(target)) {
      throw new UsageError(
        `cannot revise to '${rawTarget}'`,
        `valid steps: ${REVISABLE_STEPS.join(", ")}`,
      );
    }

    let session = requireSession(id);
    if (session.status === "paused") {
      throw new AxiError(
        "session is paused",
        `onlyness-axi resume ${id} before revising`,
      );
    }
    if (session.status === "ended") {
      throw new AxiError(
        "session already ended",
        "start a new session with onlyness-axi start",
      );
    }

    session = reviseStep(session, target);
    const rootDir = root();
    saveSession(rootDir, session);
    writeWorkshopFile(session, rootDir);

    const playbookId = target === "off_axis" ? "off-axis" : target;

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["coachBudgetUsed", `${session.coachBudget.used}/${session.coachBudget.max}`],
        ["workshopFile", workshopFilePath(session.id)],
      ]),
    );
    print(
      emitBlock("next", [
        `1. onlyness-axi playbook ${playbookId}`,
        `2. onlyness-axi status ${session.id}`,
      ]),
    );
    return 0;
  },
};
