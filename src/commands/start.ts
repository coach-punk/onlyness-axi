import { readFileSync } from "node:fs";
import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { createSession, saveSession, writeSeed } from "../session/store.js";
import type { EntryKind } from "../session/types.js";
import { openInBrowser, root, writeWorkshopFile } from "./session-io.js";

const ENTRIES: EntryKind[] = ["blank", "seed", "prune"];

export const startCommand: CommandModule = {
  spec: {
    name: "start",
    summary: "Create a workshop session and generate standalone workshop.html",
    flags: [
      {
        name: "entry",
        type: "string",
        default: "blank",
        values: ENTRIES,
        description: "session entry path",
      },
      {
        name: "seed",
        type: "string",
        description: "path to seed markdown file",
      },
      {
        name: "seed-text",
        type: "string",
        description: "inline seed text (alternative to --seed)",
      },
      {
        name: "no-open",
        type: "boolean",
        default: false,
        description: "do not open workshop.html in the browser",
      },
    ],
    examples: [
      "onlyness-axi start --entry blank",
      "onlyness-axi start --entry seed --seed ./notes.md",
      "onlyness-axi start --entry prune --seed-text 'cut enterprise features'",
    ],
  },
  run(parsed) {
    const entry = String(parsed.flags["entry"] ?? "blank") as EntryKind;
    if (!ENTRIES.includes(entry)) {
      throw new UsageError(
        `invalid entry '${entry}'`,
        `valid values: ${ENTRIES.join(", ")}`,
      );
    }

    const seedPath = parsed.flags["seed"] as string | undefined;
    const seedTextFlag = parsed.flags["seed-text"] as string | undefined;
    let seedText: string | undefined;
    if (seedPath && seedTextFlag) {
      throw new UsageError(
        "pass only one of --seed or --seed-text",
        "onlyness-axi start --seed ./notes.md",
      );
    }
    if (seedPath) {
      try {
        seedText = readFileSync(seedPath, "utf8");
      } catch {
        throw new UsageError(
          `cannot read seed file '${seedPath}'`,
          "check the path and try again",
        );
      }
    } else if (seedTextFlag !== undefined) {
      seedText = seedTextFlag;
    }

    const contextSources: string[] = [];
    if (seedText !== undefined) contextSources.push("seed");

    const session = createSession({
      entry,
      contextSources,
      seedText,
    });
    const rootDir = root();
    saveSession(rootDir, session);
    if (seedText !== undefined) {
      writeSeed(rootDir, session.id, seedText);
    }
    const workshopFile = writeWorkshopFile(session, rootDir);

    if (!parsed.flags["no-open"]) {
      openInBrowser(workshopFile);
    }

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["entry", session.entry],
        ["workshopFile", workshopFile],
      ]),
    );
    print(
      emitBlock("next", [
        `1. Gather mutual context; optional: onlyness-axi prefill ${session.id} --industry "…" --offering "…" --audience "…"`,
        `2. Optional live sync: onlyness-axi view ${session.id}`,
        `3. onlyness-axi playbook paradox`,
      ]),
    );
    return 0;
  },
};
