import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { serverPitchUrl, serverUrl } from "../server/runtime.js";
import { advanceSession } from "../session/steps.js";
import { saveSession } from "../session/store.js";
import { generatePitch, pitchFileExists } from "./pitch.js";
import {
  liveServerInfo,
  pitchFilePath,
  requireSession,
  root,
  writeWorkshopFile,
} from "./session-io.js";

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

    if (session.status === "paused") {
      throw new AxiError(
        "session is paused",
        `onlyness-axi resume ${id} before advancing`,
      );
    }
    if (session.status === "ended") {
      throw new AxiError(
        "session already ended",
        "start a new session with onlyness-axi start",
      );
    }

    const fromStep = session.step;

    try {
      session = advanceSession(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AxiError(
        message,
        `fill the current step (or revise earlier steps), then retry: onlyness-axi advance ${id}`,
      );
    }

    saveSession(rootDir, session);
    const workshopFile = writeWorkshopFile(session, rootDir);

    let pitchFile = pitchFileExists(id) ? pitchFilePath(id) : "";
    if (fromStep === "pitch" && session.step === "done") {
      try {
        const res = generatePitch(id);
        pitchFile = res.path;
      } catch {
        // Gate already passed; regenerate best-effort for deliverable.
      }
    }

    const playbookId =
      session.step === "off_axis"
        ? "off-axis"
        : session.step === "done"
          ? "pitch"
          : session.step;

    const info = liveServerInfo(session.id, rootDir);
    const url = info ? serverUrl(info) : "";
    const pitchUrl = info && pitchFile ? serverPitchUrl(info) : "";

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["coachBudgetUsed", `${session.coachBudget.used}/${session.coachBudget.max}`],
        ...(url ? ([["url", url]] as Array<[string, string]>) : []),
        ...(pitchUrl ? ([["pitchUrl", pitchUrl]] as Array<[string, string]>) : []),
        ["workshopFile", workshopFile],
        ["pitchFile", pitchFile],
      ]),
    );
    print(
      emitBlock("next", [
        session.step === "pitch"
          ? `1. Confirm satisfaction, then run: onlyness-axi pitch ${id}`
          : `1. onlyness-axi playbook ${playbookId}`,
        pitchUrl || pitchFile
          ? `2. Open ${pitchUrl || pitchFile}`
          : `2. onlyness-axi status ${session.id}`,
      ]),
    );
    return 0;
  },
};
