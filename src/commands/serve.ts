import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { startServer } from "../server/http.js";
import { writeServerMeta } from "../server/meta.js";
import { loadSession, saveSession } from "../session/store.js";
import { requireSession, root } from "./session-io.js";

/** Never resolves — keeps the serve process alive until killed. */
function hangForever(): Promise<never> {
  return new Promise(() => {
    /* intentionally empty */
  });
}

export const serveCommand: CommandModule = {
  spec: {
    name: "serve",
    summary: "Run long-lived HTTP surface + event bus for a session",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi serve s-2026-…"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    if (session.status !== "active") {
      throw new AxiError(
        `session is not active: ${session.id}`,
        "start a new session with onlyness-axi start",
      );
    }

    const rootDir = root();
    const preferredPort = session.port;
    const server = await startServer({
      rootDir,
      sessionId: session.id,
      port: preferredPort,
    });

    writeServerMeta(rootDir, session.id, {
      pid: process.pid,
      port: server.port,
    });

    session = loadSession(rootDir, session.id);
    session = { ...session, port: server.port };
    saveSession(rootDir, session);

    await hangForever();
    return 0;
  },
};
