import type { CommandModule } from "../cli/router.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { startServer } from "../server/http.js";
import {
  clearServerInfo,
  ensureViewServer,
  serverPitchUrl,
  serverUrl,
  writeServerInfo,
} from "../server/runtime.js";
import { openInBrowser, requireSession, root } from "./session-io.js";

const DEFAULT_IDLE_MS = 2 * 60 * 60 * 1000;

export const viewCommand: CommandModule = {
  spec: {
    name: "view",
    summary: "Open local HTTP SSE workshop server (live Sync + Secure Context)",
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
      {
        name: "bg",
        type: "boolean",
        default: false,
        description: "ensure background HTTP server is running and exit",
      },
      {
        name: "daemon",
        type: "boolean",
        default: false,
        description: "internal: run detached idle-timeout HTTP daemon",
      },
    ],
    examples: [
      "onlyness-axi view s-2026-…",
      "onlyness-axi view s-2026-… --bg",
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

    const isBg = Boolean(parsed.flags["bg"]);
    const isDaemon = Boolean(parsed.flags["daemon"]);
    if (isBg && isDaemon) {
      throw new UsageError(
        "pass only one of --bg or --daemon",
        `onlyness-axi view ${session.id} --bg`,
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

    const rootDir = root();

    if (isBg) {
      const info = await ensureViewServer(rootDir, session.id, {
        port: port > 0 ? port : undefined,
      });
      const url = serverUrl(info);
      const pitchUrl = serverPitchUrl(info);
      if (!parsed.flags["no-open"]) {
        openInBrowser(url);
      }
      print(
        emitKV([
          ["session", session.id],
          ["status", session.status],
          ["step", session.step],
          ["mode", "live-http"],
          ["port", info.port],
          ["url", url],
          ["pitchUrl", pitchUrl],
        ]),
      );
      print(
        emitBlock("next", [
          `1. Open ${url} in your browser`,
          `2. onlyness-axi status ${session.id}`,
        ]),
      );
      return 0;
    }

    const envIdle = Number(process.env["ONLYNESS_IDLE_MS"]);
    const idleTimeoutMs = isDaemon
      ? Number.isFinite(envIdle) && envIdle > 0
        ? envIdle
        : DEFAULT_IDLE_MS
      : undefined;

    let resolveStop: (() => void) | null = null;
    const donePromise = new Promise<void>((resolve) => {
      resolveStop = resolve;
    });

    const started = await startServer({
      rootDir,
      sessionId: session.id,
      port,
      token: session.authToken,
      idleTimeoutMs,
      onIdleClose: () => {
        clearServerInfo(rootDir, session.id);
        resolveStop?.();
      },
    });

    const info = {
      pid: process.pid,
      port: started.port,
      token: started.token,
      startedAt: new Date().toISOString(),
    };
    writeServerInfo(rootDir, session.id, info);

    const url = serverUrl(info);
    const pitchUrl = serverPitchUrl(info);

    if (!isDaemon) {
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
          "2. Press Ctrl+C to stop live server",
        ]),
      );
    }

    const onSignal = () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
      clearServerInfo(rootDir, session.id);
      started.close().then(
        () => resolveStop?.(),
        () => resolveStop?.(),
      );
    };
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);

    await donePromise;
    return 0;
  },
};
