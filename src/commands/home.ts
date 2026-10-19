import type { CommandModule } from "../cli/router.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { listSessions, onlynessRoot } from "../session/store.js";
import { collapseHome, DESCRIPTION, rootHelpText } from "../skill/content.js";

function renderSessionsHome(binPath: string): string {
  const header = `onlyness-axi: ${collapseHome(binPath)} — ${DESCRIPTION}`;
  const sessions = listSessions(onlynessRoot(process.cwd())).filter(
    (s) => s.status === "active",
  );

  if (sessions.length === 0) {
    return [
      header,
      "sessions: 0 active sessions found",
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
    })),
    ["id", "step", "status", "entry"],
  );
  const help = helpBlock([
    `onlyness-axi poll ${sessions[0]!.id}`,
    "onlyness-axi start --entry blank",
    "onlyness-axi --help",
  ]);
  return [header, table, help].join("\n");
}

export const homeCommand: CommandModule = {
  spec: {
    name: "",
    summary: "Home view: active sessions first (AXI principle 8)",
    flags: [
      { name: "version", type: "boolean", description: "print the tool version" },
    ],
    examples: ["onlyness-axi", "onlyness-axi --version", "onlyness-axi list"],
  },
  run(parsed) {
    if (parsed.flags["version"]) {
      print("onlyness-axi: 0.1.0");
      return 0;
    }
    print(renderSessionsHome(process.argv[1] ?? "onlyness-axi"));
    return 0;
  },
};

/** Same content-first sessions view as bare invoke. */
export const listCommand: CommandModule = {
  spec: {
    name: "list",
    summary: "List active workshop sessions",
    flags: [],
    examples: ["onlyness-axi list"],
  },
  run() {
    print(renderSessionsHome(process.argv[1] ?? "onlyness-axi"));
    return 0;
  },
};

export function rootHelp(): string {
  return rootHelpText();
}
