import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { advanceSession } from "../session/steps.js";
import { saveSession } from "../session/store.js";
import { requireSession, root, writeSurfaceFile } from "./session-io.js";

export const advanceCommand: CommandModule = {
  spec: {
    name: "advance",
    summary: "Advance to the next step when the gate is satisfied",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi advance s-2026-…"],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    const rootDir = root();

    try {
      session = advanceSession(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AxiError(
        message,
        `fill the current step, then retry: onlyness-axi advance ${id}`,
      );
    }

    saveSession(rootDir, session);
    writeSurfaceFile(session);

    const playbookId =
      session.step === "off_axis"
        ? "off-axis"
        : session.step === "done"
          ? "truthmode"
          : session.step;

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["coachBudgetUsed", session.coachBudget.used],
      ]),
    );
    print(
      emitBlock("next", [
        `1. onlyness-axi playbook ${playbookId}`,
        `2. onlyness-axi poll ${session.id}`,
      ]),
    );
    return 0;
  },
};
