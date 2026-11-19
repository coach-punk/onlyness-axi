import type { CommandModule } from "../cli/router.js";
import { helpBlock } from "../output/suggest.js";
import { emitList, print } from "../output/toon.js";
import { truncate } from "../output/truncate.js";
import {
  listSessions,
  onlynessRoot,
  readPackageVersion,
} from "../session/store.js";
import { collapseHome, DESCRIPTION, rootHelpText } from "../skill/content.js";

function renderSessionsHome(binPath: string, includeEnded: boolean): string {
  const header = `onlyness-axi: ${collapseHome(binPath)} — ${DESCRIPTION}`;
  const allSessions = listSessions(onlynessRoot(process.cwd()));
  const sessions = includeEnded
    ? allSessions
    : allSessions.filter((s) => s.status === "active" || s.status === "paused");

  if (sessions.length === 0) {
    return [
      header,
      "sessions: 0 active or paused sessions found",
      helpBlock([
        "onlyness-axi start --entry blank",
        "onlyness-axi playbook paradox",
        "onlyness-axi --help",
      ]),
    ].join("\n");
  }

  const table = emitList(
    "sessions",
    sessions.map((s) => ({
      id: s.id,
      step: s.step,
      status: s.status,
      entry: s.entry,
      statement: truncate(s.statement, 64).text,
    })),
    ["id", "step", "status", "entry", "statement"],
  );
  const first = sessions[0]!;
  const help = helpBlock([
    first.status === "paused"
      ? `onlyness-axi resume ${first.id}`
      : `onlyness-axi status ${first.id}`,
    `onlyness-axi view ${first.id}`,
    "onlyness-axi start --entry blank",
  ]);
  return [header, table, help].join("\n");
}

export const homeCommand: CommandModule = {
  spec: {
    name: "",
    summary: "Home view: active and paused sessions first (AXI principle 8)",
    flags: [
      { name: "version", type: "boolean", description: "print the tool version" },
      { name: "all", type: "boolean", description: "include ended sessions" },
    ],
    examples: [
      "onlyness-axi",
      "onlyness-axi --version",
      "onlyness-axi list --all",
    ],
  },
  run(parsed) {
    if (parsed.flags["version"]) {
      print(`onlyness-axi: ${readPackageVersion()}`);
      return 0;
    }
    print(
      renderSessionsHome(
        process.argv[1] ?? "onlyness-axi",
        Boolean(parsed.flags["all"]),
      ),
    );
    return 0;
  },
};

/** Same content-first sessions view as bare invoke. */
export const listCommand: CommandModule = {
  spec: {
    name: "list",
    summary: "List active and paused workshop sessions",
    flags: [
      { name: "all", type: "boolean", description: "include ended sessions" },
    ],
    examples: ["onlyness-axi list", "onlyness-axi list --all"],
  },
  run(parsed) {
    print(
      renderSessionsHome(
        process.argv[1] ?? "onlyness-axi",
        Boolean(parsed.flags["all"]),
      ),
    );
    return 0;
  },
};

export function rootHelp(): string {
  return rootHelpText();
}
