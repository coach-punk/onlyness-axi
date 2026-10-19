import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { print } from "../output/toon.js";
import {
  getPlaybook,
  PLAYBOOK_IDS,
  type PlaybookId,
} from "../playbooks/index.js";

export const playbookCommand: CommandModule = {
  spec: {
    name: "playbook",
    summary: "Print on-demand step / truthmode / prune / coach guidance",
    args: [
      {
        name: "id",
        required: true,
        description: `playbook id (${PLAYBOOK_IDS.join("|")})`,
      },
    ],
    flags: [],
    examples: [
      "onlyness-axi playbook paradox",
      "onlyness-axi playbook coach",
      "onlyness-axi playbook off-axis",
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0]!;
    const text = getPlaybook(id);
    if (text === null) {
      throw new UsageError(
        `unknown playbook '${id}'`,
        `valid: ${PLAYBOOK_IDS.join(", ")}`,
      );
    }

    // Exhaustive guard: every known id must resolve.
    const known = id as PlaybookId;
    switch (known) {
      case "paradox":
      case "arena":
      case "stand":
      case "axis":
      case "off-axis":
      case "onlyness":
      case "truthmode":
      case "prune":
      case "coach":
        break;
      default: {
        const _exhaustive: never = known;
        throw new UsageError(
          `unhandled playbook '${String(_exhaustive)}'`,
          `valid: ${PLAYBOOK_IDS.join(", ")}`,
        );
      }
    }

    print(text.trimEnd());
    return 0;
  },
};
