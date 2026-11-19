import type { CommandModule } from "../cli/router.js";
import { emitBlock, emitKV, emitList, print } from "../output/toon.js";
import { truncate, truncationNote } from "../output/truncate.js";
import { serverPitchUrl, serverUrl } from "../server/runtime.js";
import type { AxisAnswer, OffAxisAnswer } from "../session/types.js";
import { pitchFileExists } from "./pitch.js";
import {
  liveServerInfo,
  pitchFilePath,
  requireSession,
  workshopFilePath,
} from "./session-io.js";

export const resultCommand: CommandModule = {
  spec: {
    name: "result",
    summary: "Emit worksheet KV for answers, spatial map, statement, and truthmode",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      {
        name: "full",
        type: "boolean",
        default: false,
        description: "disable truncation on long fields",
      },
    ],
    examples: [
      "onlyness-axi result s-2026-…",
      "onlyness-axi result s-2026-… --full",
    ],
  },
  run(parsed) {
    const session = requireSession(parsed.positionals[0]);
    const full = Boolean(parsed.flags["full"]);
    const t = session.truthmode;
    const hasPitch = pitchFileExists(session.id);
    const axis = (session.answers.axis ?? {}) as Partial<AxisAnswer>;
    const offAxis = (session.answers.off_axis ?? {}) as Partial<OffAxisAnswer>;

    const maybeTrunc = (val: string, limit = 240): string => {
      if (full || val.length <= limit) return val;
      const res = truncate(val, limit);
      return `${res.text}... (${res.totalChars} chars)`;
    };

    const rivalsSummary = Array.isArray(axis.rivals)
      ? axis.rivals.map((r) => `${r.label}@${r.x}`).join("; ")
      : "";
    const offSummary = offAxis.territory
      ? `${offAxis.axisLabel ? `${offAxis.axisLabel}: ` : ""}${offAxis.territory} (${offAxis.selfX ?? 50},${offAxis.selfY ?? 50})`
      : "";
    const answersJson = JSON.stringify(session.answers);
    const answersOut = full
      ? { text: answersJson, truncated: false, totalChars: answersJson.length }
      : truncate(answersJson, 800);
    const info = liveServerInfo(session.id);
    const liveUrl = info ? serverUrl(info) : "";
    const pitchUrl = info && hasPitch ? serverPitchUrl(info) : "";

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["entry", session.entry],
        ["step", session.step],
        ["contextSources", session.contextSources.join(",")],
        ["industry", session.arena.industry],
        ["offering", session.arena.offering],
        ["audience", session.arena.audience],
        ["rivals", rivalsSummary],
        ["offAxis", maybeTrunc(offSummary)],
        ["statement", maybeTrunc(session.statement, 400)],
        ["verdict", t?.verdict ?? ""],
        ["swap", maybeTrunc(t?.swap ?? "")],
        ["itch", maybeTrunc(t?.itch ?? "")],
        ["sticky", maybeTrunc(t?.sticky ?? "")],
        ["jackBlack", maybeTrunc(t?.jackBlack ?? "")],
        ...(liveUrl ? ([["url", liveUrl]] as Array<[string, string]>) : []),
        ...(pitchUrl ? ([["pitchUrl", pitchUrl]] as Array<[string, string]>) : []),
        ["workshopFile", workshopFilePath(session.id)],
        ["pitchFile", hasPitch ? pitchFilePath(session.id) : ""],
      ]),
    );

    const answerLines = [answersOut.text];
    if (answersOut.truncated) {
      answerLines.push(`${truncationNote(answersOut).trim()} (pass --full)`);
    }
    print(emitBlock("answers", answerLines));

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
