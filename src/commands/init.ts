import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CommandModule } from "../cli/router.js";
import { emitBlock, emitKV, print } from "../output/toon.js";

const START_MARKER = "<!-- onlyness:start -->";
const END_MARKER = "<!-- onlyness:end -->";

const DISCOVERY_BLOCK = `${START_MARKER}
## onlyness-axi — Positioning & Onlyness Workshop

When working on product positioning, USP stuckness, Pepsi Paradox framing, or mid-lifecycle feature-creep pruning:

1. Start a session: \`npx -y onlyness-axi start --entry blank\` (or \`seed\` / \`prune\`).
2. Gather mutual context first and prefill arena via \`prefill <id>\`.
3. Fetch step rules on demand: \`npx -y onlyness-axi playbook <id>\` (\`paradox\`, \`arena\`, \`stand\`, \`axis\`, \`off-axis\`, \`onlyness\`, \`truthmode\`, \`pitch\`, \`prune\`, \`coach\`).
4. Coach via \`coach <id> --text "…"\` (<=3 turns/step: clarify -> ground -> mirror), inspect with \`status <id>\`, relay chat answers with \`submit <id> --json '…'\`, step back via \`revise <id> <step>\`, or launch live canvas sync with \`view <id>\`.
5. Never skip Act 0 or \`truthmode check\` / \`set-swap\`. Generate \`pitch.html\` after satisfaction.
${END_MARKER}`;

export function upsertAgentsBlock(existing: string): {
  next: string;
  action: "created" | "updated" | "appended";
} {
  if (!existing.trim()) {
    return { next: DISCOVERY_BLOCK + "\n", action: "created" };
  }

  const startIdx = existing.indexOf(START_MARKER);
  const endIdx = existing.indexOf(END_MARKER);
  if (startIdx >= 0 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + END_MARKER.length);
    return {
      next: `${before}${DISCOVERY_BLOCK}${after}`,
      action: "updated",
    };
  }

  const sep = existing.endsWith("\n") ? "\n" : "\n\n";
  return {
    next: `${existing}${sep}${DISCOVERY_BLOCK}\n`,
    action: "appended",
  };
}

export const initCommand: CommandModule = {
  spec: {
    name: "init",
    summary: "Write or update onlyness-axi discovery instructions in AGENTS.md",
    flags: [
      {
        name: "dir",
        type: "string",
        description: "target directory containing AGENTS.md (default: cwd)",
      },
    ],
    examples: [
      "onlyness-axi init",
      "onlyness-axi init --dir /path/to/repo",
    ],
  },
  run(parsed) {
    const dirFlag = parsed.flags["dir"];
    const targetDir =
      typeof dirFlag === "string" && dirFlag.trim()
        ? resolve(dirFlag)
        : process.cwd();
    mkdirSync(targetDir, { recursive: true });
    const agentsPath = join(targetDir, "AGENTS.md");
    const existing = existsSync(agentsPath)
      ? readFileSync(agentsPath, "utf8")
      : "";
    const { next, action } = upsertAgentsBlock(existing);
    writeFileSync(agentsPath, next, "utf8");

    print(
      emitKV([
        ["file", agentsPath],
        ["action", action],
      ]),
    );
    print(
      emitBlock("next", [
        "1. onlyness-axi start --entry blank",
        "2. onlyness-axi --help",
      ]),
    );
    return 0;
  },
};
