import { dispatch, type Registry } from "./cli/router.js";
import { advanceCommand } from "./commands/advance.js";
import { chillCommand } from "./commands/chill.js";
import { endCommand } from "./commands/end.js";
import { homeCommand, listCommand, rootHelp } from "./commands/home.js";
import { pitchCommand } from "./commands/pitch.js";
import { playbookCommand } from "./commands/playbook.js";
import { pollCommand } from "./commands/poll.js";
import { replyCommand } from "./commands/reply.js";
import { resultCommand } from "./commands/result.js";
import { resumeCommand } from "./commands/resume.js";
import { serveCommand } from "./commands/serve.js";
import { startCommand } from "./commands/start.js";
import { truthmodeCommand } from "./commands/truthmode.js";

const registry: Registry = {
  tool: "onlyness-axi",
  root: homeCommand,
  rootHelp,
  commands: {
    list: listCommand,
    start: startCommand,
    serve: serveCommand,
    poll: pollCommand,
    reply: replyCommand,
    advance: advanceCommand,
    result: resultCommand,
    end: endCommand,
    playbook: playbookCommand,
    truthmode: truthmodeCommand,
    chill: chillCommand,
    resume: resumeCommand,
    pitch: pitchCommand,
  },
  aliases: {},
};

const code = await dispatch(registry, process.argv.slice(2));
process.exit(code);
