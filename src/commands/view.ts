import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { startServer } from "../server/http.js";
import { openInBrowser, requireSession, root } from "./session-io.js";

export const viewCommand: CommandModule = {
  spec: {
    name: "view",
    summary: "Open optional live SSE workshop server for real-time sync",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [
      {
        name: "port",
        type: "string",
        description: "loopback port (default: random free port)",
      },
      {
        name: "no-open",
        type: "boolean",
        default: false,
        description: "print URL without launching browser",
      },
    ],
    examples: [
      "onlyness-axi view s-2026-…",
      "onlyness-axi view s-2026-… --port 7843 --no-open",
    ],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const session = requireSession(id);
    if (session.status === "ended") {
      throw new AxiError(
        `session already ended: ${session.id}`,
        "start a new session with onlyness-axi start",
      );
    }

    let port = 0;
    const portFlag = parsed.flags["port"];
    if (typeof portFlag === "string") {
      const parsedPort = Number(portFlag);
      if (
        !Number.isInteger(parsedPort) ||
        parsedPort < 0 ||
        parsedPort > 65535
      ) {
        throw new UsageError(
          `invalid port '${portFlag}'`,
          "pass an integer port 0..65535",
        );
      }
      port = parsedPort;
    }

    const started = await startServer({
      rootDir: root(),
      sessionId: session.id,
      port,
      token: session.authToken,
    });

    const url = `http://127.0.0.1:${started.port}/s/${started.token}/`;
    const pitchUrl = `http://127.0.0.1:${started.port}/s/${started.token}/pitch`;

    if (!parsed.flags["no-open"]) {
      openInBrowser(url);
    }

    print(
      emitKV([
        ["session", session.id],
        ["status", session.status],
        ["step", session.step],
        ["mode", "live-sse"],
        ["url", url],
        ["pitchUrl", pitchUrl],
      ]),
    );
    print(
      emitBlock("next", [
        `1. Open ${url} (forward port ${started.port} if remote)`,
        `2. Press Ctrl+C to stop live server (workshop.html works standalone anytime)`,
      ]),
    );

    await new Promise<void>((resolve) => {
      const onSignal = () => {
        process.off("SIGINT", onSignal);
        process.off("SIGTERM", onSignal);
        started.close().then(resolve, resolve);
      };
      process.on("SIGINT", onSignal);
      process.on("SIGTERM", onSignal);
    });

    return 0;
  },
};
