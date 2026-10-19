import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import type { EntryKind } from "../session/types.js";
import {
  createSession,
  saveSession,
  writeSeed,
} from "../session/store.js";
import { ensureServer } from "../server/handles.js";
import { root, writeSurfaceFile } from "./session-io.js";

const ENTRIES: EntryKind[] = ["blank", "seed", "prune"];

function openBrowser(url: string): void {
  if (process.env["ONLYNESS_NO_BROWSER"] === "1") return;
  const platform = process.platform;
  let cmd: string;
  let args: string[];
  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Browser open is best-effort.
  }
}

export const startCommand: CommandModule = {
  spec: {
    name: "start",
    summary: "Create a workshop session, write surface, open browser",
    flags: [
      {
        name: "entry",
        type: "string",
        default: "blank",
        values: ENTRIES,
        description: "session entry path",
      },
      {
        name: "seed",
        type: "string",
        description: "path to seed markdown file",
      },
      {
        name: "seed-text",
        type: "string",
        description: "inline seed text (alternative to --seed)",
      },
    ],
    examples: [
      "onlyness-axi start --entry blank",
      "onlyness-axi start --entry seed --seed ./notes.md",
      "onlyness-axi start --entry prune --seed-text 'cut features'",
    ],
  },
  async run(parsed) {
    const entry = String(parsed.flags["entry"] ?? "blank") as EntryKind;
    if (!ENTRIES.includes(entry)) {
      throw new UsageError(
        `invalid entry '${entry}'`,
        `valid values: ${ENTRIES.join(", ")}`,
      );
    }

    const seedPath = parsed.flags["seed"] as string | undefined;
    const seedTextFlag = parsed.flags["seed-text"] as string | undefined;
    let seedText: string | undefined;
    if (seedPath && seedTextFlag) {
      throw new UsageError(
        "pass only one of --seed or --seed-text",
        "onlyness-axi start --seed ./notes.md",
      );
    }
    if (seedPath) {
      try {
        seedText = readFileSync(seedPath, "utf8");
      } catch {
        throw new UsageError(
          `cannot read seed file '${seedPath}'`,
          "check the path and try again",
        );
      }
    } else if (seedTextFlag !== undefined) {
      seedText = seedTextFlag;
    }

    const contextSources: string[] = [];
    if (seedText !== undefined) contextSources.push("seed");

    const session = createSession({
      entry,
      contextSources,
      seedText,
    });
    const rootDir = root();
    saveSession(rootDir, session);
    if (seedText !== undefined) {
      writeSeed(rootDir, session.id, seedText);
    }
    writeSurfaceFile(session);

    const server = await ensureServer({
      rootDir,
      sessionId: session.id,
    });
    session.port = server.port;
    saveSession(rootDir, session);

    const url = `http://127.0.0.1:${server.port}/`;
    openBrowser(url);

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["port", server.port],
        ["url", url],
        ["entry", session.entry],
      ]),
    );
    print(
      emitBlock("next", [
        "1. Gather mutual context; optional reply with arena draft",
        `2. onlyness-axi poll ${session.id}`,
        "3. onlyness-axi playbook paradox",
      ]),
    );
    return 0;
  },
};
