import { dispatch, type Registry } from "./cli/router.js";
import { advanceCommand } from "./commands/advance.js";
import { chillCommand } from "./commands/chill.js";
import { endCommand } from "./commands/end.js";
import { homeCommand, listCommand, rootHelp } from "./commands/home.js";
import { initCommand } from "./commands/init.js";
import { pitchCommand } from "./commands/pitch.js";
import { playbookCommand } from "./commands/playbook.js";
import { prefillCommand } from "./commands/prefill.js";
import { coachCommand } from "./commands/reply.js";
import { resultCommand } from "./commands/result.js";
import { resumeCommand } from "./commands/resume.js";
import { reviseCommand } from "./commands/revise.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { submitCommand } from "./commands/submit.js";
import { truthmodeCommand } from "./commands/truthmode.js";
import { viewCommand } from "./commands/view.js";

const registry: Registry = {
  tool: "onlyness-axi",
  root: homeCommand,
  rootHelp,
  commands: {
    list: listCommand,
    start: startCommand,
    status: statusCommand,
    prefill: prefillCommand,
    submit: submitCommand,
    coach: coachCommand,
    advance: advanceCommand,
    revise: reviseCommand,
    truthmode: truthmodeCommand,
    pitch: pitchCommand,
    chill: chillCommand,
    resume: resumeCommand,
    view: viewCommand,
    result: resultCommand,
    end: endCommand,
    playbook: playbookCommand,
    init: initCommand,
  },
  aliases: {
    reply: "coach",
  },
};

const code = await dispatch(registry, process.argv.slice(2));
process.exit(code);
