import type { CommandModule } from "../cli/router.js";
import { print } from "../output/toon.js";
import { renderHome, rootHelpText } from "../skill/content.js";

export const homeCommand: CommandModule = {
  spec: {
    name: "",
    summary: "Home view: live content first (AXI principle 8)",
    flags: [
      { name: "version", type: "boolean", description: "print the tool version" },
    ],
    examples: ["onlyness-axi", "onlyness-axi --version"],
  },
  run(parsed) {
    if (parsed.flags["version"]) {
      print("onlyness-axi: 0.1.0");
      return 0;
    }
    print(renderHome(process.argv[1] ?? "onlyness-axi"));
    return 0;
  },
};

export function rootHelp(): string {
  return rootHelpText();
}
