import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { saveSession } from "../session/store.js";
import type { WorkedExample } from "../session/types.js";
import { requireSession, root, writeWorkshopFile } from "./session-io.js";

function parseWorkedExample(rawJson: string): WorkedExample {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new UsageError(
      "invalid JSON for --example-json",
      "pass valid JSON matching WorkedExample fields",
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new UsageError(
      "--example-json must be a JSON object",
      'example: --example-json \'{"name":"Carvana","stand":"…","axisLeft":"…","axisRight":"…","rivals":[],"axisPointX":80,"offAxisLabel":"…","offAxisX":60,"offAxisY":85,"statement":"…"}\'',
    );
  }
  const o = parsed as Record<string, unknown>;
  const str = (k: string, fb = ""): string =>
    typeof o[k] === "string" ? (o[k] as string).trim() : fb;
  const num = (k: string, fb: number): number =>
    typeof o[k] === "number" && Number.isFinite(o[k])
      ? Math.max(0, Math.min(100, Math.round(o[k] as number)))
      : fb;

  const name = str("name");
  const statement = str("statement");
  if (!name || !statement) {
    throw new UsageError(
      "--example-json requires non-empty 'name' and 'statement'",
      "provide at least name and statement",
    );
  }

  const rivalsRaw = Array.isArray(o["rivals"]) ? o["rivals"] : [];
  const rivals = rivalsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const label = typeof r["label"] === "string" ? r["label"].trim() : "";
      if (!label) return null;
      const x =
        typeof r["x"] === "number" && Number.isFinite(r["x"])
          ? Math.max(0, Math.min(100, Math.round(r["x"])))
          : 50;
      return { label, x };
    })
    .filter((r): r is { label: string; x: number } => r !== null);

  return {
    name,
    stand: str("stand", "Specific buyer pain in this arena"),
    axisLeft: str("axisLeft", "Low end"),
    axisRight: str("axisRight", "Axis-of-better high"),
    rivals,
    axisPointX: num("axisPointX", 78),
    offAxisLabel: str("offAxisLabel", "Uncontested territory"),
    offAxisX: num("offAxisX", 65),
    offAxisY: num("offAxisY", 85),
    statement,
  };
}

export const prefillCommand: CommandModule = {
  spec: {
    name: "prefill",
    summary: "Prefill arena, contextSources, or tailored worked specimen",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      { name: "industry", type: "string", description: "arena industry/category" },
      { name: "offering", type: "string", description: "one-line product or service" },
      { name: "audience", type: "string", description: "who you sell to" },
      { name: "source", type: "string", description: "contextSource label (e.g. chat, memory, priorSession)" },
      { name: "example-json", type: "string", description: "JSON WorkedExample tailored to arena" },
    ],
    examples: [
      'onlyness-axi prefill s-… --industry "local bakeries" --offering "midnight sourdough" --audience "shift workers" --source chat',
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    if (session.status === "ended") {
      throw new AxiError(
        "session already ended",
        "start a new session with onlyness-axi start",
      );
    }

    const industry = parsed.flags["industry"] as string | undefined;
    const offering = parsed.flags["offering"] as string | undefined;
    const audience = parsed.flags["audience"] as string | undefined;
    const source = parsed.flags["source"] as string | undefined;
    const exampleJson = parsed.flags["example-json"] as string | undefined;

    if (
      industry === undefined &&
      offering === undefined &&
      audience === undefined &&
      source === undefined &&
      exampleJson === undefined
    ) {
      throw new UsageError(
        "pass at least one prefill flag",
        "onlyness-axi prefill <session> --industry \"…\" --offering \"…\" --audience \"…\"",
      );
    }

    const nextSources = [...session.contextSources];
    if (source && source.trim() && !nextSources.includes(source.trim())) {
      nextSources.push(source.trim());
    }

    const nextExample =
      exampleJson !== undefined
        ? parseWorkedExample(exampleJson)
        : session.workedExample;

    session = {
      ...session,
      arena: {
        industry: industry !== undefined ? industry : session.arena.industry,
        offering: offering !== undefined ? offering : session.arena.offering,
        audience: audience !== undefined ? audience : session.arena.audience,
      },
      workedExample: nextExample,
      contextSources: nextSources,
    };

    const rootDir = root();
    saveSession(rootDir, session);
    const workshopFile = writeWorkshopFile(session, rootDir);

    print(
      emitKV([
        ["session", session.id],
        ["industry", session.arena.industry],
        ["offering", session.arena.offering],
        ["audience", session.arena.audience],
        ["example", session.workedExample.name],
        ["contextSources", session.contextSources.join(",")],
        ["workshopFile", workshopFile],
      ]),
    );
    print(
      emitBlock("next", [
        `1. onlyness-axi status ${session.id}`,
        `2. onlyness-axi coach ${session.id} --system --text "Prefilled arena from context — fight with or edit it on the stage."`,
      ]),
    );
    return 0;
  },
};
