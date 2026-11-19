import type { CommandModule } from "../cli/router.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { truncate, truncationNote } from "../output/truncate.js";
import { serverUrl } from "../server/runtime.js";
import { coachJobGuidance, nextCoachJob } from "../session/coach.js";
import { canAdvance } from "../session/steps.js";
import { liveServerInfo, requireSession, workshopFilePath } from "./session-io.js";

export const statusCommand: CommandModule = {
  spec: {
    name: "status",
    summary: "Inspect current step, gate, coach job guidance, and answers",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      {
        name: "full",
        type: "boolean",
        default: false,
        description: "disable truncation on answers and human notes",
      },
    ],
    examples: [
      "onlyness-axi status s-2026-…",
      "onlyness-axi status s-2026-… --full",
    ],
  },
  run(parsed) {
    const session = requireSession(parsed.positionals[0]);
    const full = Boolean(parsed.flags["full"]);
    const gate = canAdvance(session);
    const job = nextCoachJob(session.coachBudget.used);
    const guidance = coachJobGuidance(session.step, job);
    const playbookId =
      session.step === "off_axis"
        ? "off-axis"
        : session.step === "done"
          ? "pitch"
          : session.step;

    const info = liveServerInfo(session.id);

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["entry", session.entry],
        ["step", session.step],
        ["gate", gate.ok ? "ready" : "blocked"],
        ["gateReason", gate.reason ?? ""],
        ["coachBudgetUsed", `${session.coachBudget.used}/${session.coachBudget.max}`],
        ["coachJob", job ?? "exhausted"],
        ["coachJobGuidance", guidance],
        ["statement", session.statement],
        ["verdict", session.truthmode?.verdict ?? ""],
        ...(info ? ([["url", serverUrl(info)]] as Array<[string, string]>) : []),
        ["workshopFile", workshopFilePath(session.id)],
      ]),
    );

    const payloadJson = JSON.stringify({
      paradoxAck: session.paradoxAck,
      arena: session.arena,
      answers: session.answers,
      statement: session.statement,
      truthmode: session.truthmode,
      satisfaction: session.satisfaction,
    });

    const trunc = full
      ? { text: payloadJson, truncated: false, totalChars: payloadJson.length }
      : truncate(payloadJson, 800);

    const payloadLines = [
      "--- BEGIN HUMAN SUBMISSION ---",
      trunc.text,
      ...(trunc.truncated ? [truncationNote(trunc)] : []),
      "--- END HUMAN SUBMISSION ---",
    ];
    print(emitBlock("payload", payloadLines));

    const recentNotes = session.coachLog
      .filter((e) => e.role === "human" && !e.text.startsWith("submit: "))
      .slice(-3)
      .map((e) => {
        const line = `[${e.step}] ${e.text}`;
        return full ? line : truncate(line, 240).text;
      });
    print(
      emitBlock(
        "humanNotes",
        recentNotes.length > 0 ? recentNotes : ["(none)"],
      ),
    );

    const nextLines: string[] = [];
    if (session.status === "paused") {
      nextLines.push(`1. onlyness-axi resume ${session.id} when human is ready`);
    } else if (gate.ok) {
      nextLines.push(`1. onlyness-axi advance ${session.id}`);
      nextLines.push(`2. onlyness-axi coach ${session.id} --text "…"`);
    } else {
      nextLines.push(`1. onlyness-axi coach ${session.id} --text "…"`);
      nextLines.push(`2. onlyness-axi submit ${session.id} --json '{…}'`);
    }
    nextLines.push(`${nextLines.length + 1}. onlyness-axi playbook ${playbookId}`);
    print(emitBlock("next", nextLines));
    return 0;
  },
};
