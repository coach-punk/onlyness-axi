import { dispatch, type Registry } from "./cli/router.js";
import { advanceCommand } from "./commands/advance.js";
import { endCommand } from "./commands/end.js";
import { homeCommand, listCommand, rootHelp } from "./commands/home.js";
import { playbookCommand } from "./commands/playbook.js";
import { pollCommand } from "./commands/poll.js";
import { replyCommand } from "./commands/reply.js";
import { resultCommand } from "./commands/result.js";
import { startCommand } from "./commands/start.js";
import { truthmodeCommand } from "./commands/truthmode.js";

const registry: Registry = {
  tool: "onlyness-axi",
  root: homeCommand,
  rootHelp,
  commands: {
    list: listCommand,
    start: startCommand,
    poll: pollCommand,
    reply: replyCommand,
    advance: advanceCommand,
    result: resultCommand,
    end: endCommand,
    playbook: playbookCommand,
    truthmode: truthmodeCommand,
  },
  aliases: {},
};

const code = await dispatch(registry, process.argv.slice(2));
process.exit(code);
