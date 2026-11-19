import { readFileSync } from "node:fs";
import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import {
  ensureViewServer,
  serverPitchUrl,
  serverUrl,
} from "../server/runtime.js";
import { createSession, saveSession, writeSeed } from "../session/store.js";
import type { EntryKind } from "../session/types.js";
import { openInBrowser, root, writeWorkshopFile } from "./session-io.js";

const ENTRIES: EntryKind[] = ["blank", "seed", "prune"];

export const startCommand: CommandModule = {
  spec: {
    name: "start",
    summary: "Create a workshop session and serve over local HTTP",
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
      {
        name: "no-open",
        type: "boolean",
        default: false,
        description: "do not open browser automatically",
      },
      {
        name: "no-server",
        type: "boolean",
        default: false,
        description: "skip launching local HTTP server (standalone workshop.html only)",
      },
      {
        name: "port",
        type: "string",
        description: "preferred loopback HTTP port",
      },
    ],
    examples: [
      "onlyness-axi start --entry blank",
      "onlyness-axi start --entry seed --seed ./notes.md",
      "onlyness-axi start --entry prune --seed-text 'cut enterprise features'",
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

    let port: number | undefined;
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
      port = parsedPort > 0 ? parsedPort : undefined;
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
    const workshopFile = writeWorkshopFile(session, rootDir);

    const noServer =
      Boolean(parsed.flags["no-server"]) ||
      process.env["ONLYNESS_NO_SERVER"] === "1";

    if (!noServer) {
      try {
        const info = await ensureViewServer(rootDir, session.id, { port });
        const url = serverUrl(info);
        const pitchUrl = serverPitchUrl(info);
        if (!parsed.flags["no-open"]) {
          openInBrowser(url);
        }

        print(
          emitKV([
            ["session", session.id],
            ["step", session.step],
            ["entry", session.entry],
            ["mode", "live-http"],
            ["port", info.port],
            ["url", url],
            ["pitchUrl", pitchUrl],
            ["workshopFile", workshopFile],
          ]),
        );
        print(
          emitBlock("next", [
            `1. Open ${url} in browser (or forward port ${info.port} if remote)`,
            `2. Gather mutual context; optional: onlyness-axi prefill ${session.id} --industry "…" --offering "…" --audience "…"`,
            `3. onlyness-axi playbook paradox`,
          ]),
        );
        return 0;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        if (!parsed.flags["no-open"]) {
          openInBrowser(workshopFile);
        }
        print(
          emitKV([
            ["session", session.id],
            ["step", session.step],
            ["entry", session.entry],
            ["mode", "standalone"],
            ["workshopFile", workshopFile],
            [
              "serverNote",
              `Local HTTP server could not start (${reason}); run 'onlyness-axi view ${session.id}' from a local terminal for HTTP + voice.`,
            ],
          ]),
        );
        print(
          emitBlock("next", [
            `1. For full macOS browser voice & live sync: onlyness-axi view ${session.id}`,
            `2. Gather mutual context; optional: onlyness-axi prefill ${session.id} --industry "…" --offering "…" --audience "…"`,
            `3. onlyness-axi playbook paradox`,
          ]),
        );
        return 0;
      }
    }

    if (!parsed.flags["no-open"]) {
      openInBrowser(workshopFile);
    }

    print(
      emitKV([
        ["session", session.id],
        ["step", session.step],
        ["entry", session.entry],
        ["mode", "standalone"],
        ["workshopFile", workshopFile],
      ]),
    );
    print(
      emitBlock("next", [
        `1. Gather mutual context; optional: onlyness-axi prefill ${session.id} --industry "…" --offering "…" --audience "…"`,
        `2. Start HTTP server anytime: onlyness-axi view ${session.id}`,
        `3. onlyness-axi playbook paradox`,
      ]),
    );
    return 0;
  },
};
