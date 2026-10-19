import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, emitKV, print, toonValue } from "../output/toon.js";
import type { HumanEvent } from "../server/events.js";
import { readServerMeta } from "../server/meta.js";
import { loadSession } from "../session/store.js";
import { requireSession, root } from "./session-io.js";

const POLL_MS = 60_000;

function resolvePort(
  sessionPort: number | undefined,
  rootDir: string,
  sessionId: string,
): number {
  if (typeof sessionPort === "number" && sessionPort > 0) return sessionPort;
  const meta = readServerMeta(rootDir, sessionId);
  if (meta) return meta.port;
  throw new AxiError(
    `no server for session ${sessionId}`,
    `run onlyness-axi serve ${sessionId} (or start a new session)`,
  );
}

function parseEventsBody(raw: unknown): HumanEvent | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AxiError(
      "invalid /api/events response",
      "check that serve is running for this session",
    );
  }
  const event = (raw as { event?: unknown }).event;
  if (event === null || event === undefined) return null;
  if (typeof event !== "object" || Array.isArray(event)) {
    throw new AxiError(
      "invalid event payload from /api/events",
      "check that serve is running for this session",
    );
  }
  return event as HumanEvent;
}

export const pollCommand: CommandModule = {
  spec: {
    name: "poll",
    summary: "Long-poll for human submit / need-coach / weak-advance",
    args: [
      { name: "session", required: true, description: "session id" },
    ],
    flags: [],
    examples: ["onlyness-axi poll s-2026-…"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    let session = requireSession(id);
    const rootDir = root();
    const port = resolvePort(session.port, rootDir, session.id);

    let body: unknown;
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/api/events?timeoutMs=${POLL_MS}`,
      );
      if (!res.ok) {
        throw new AxiError(
          `events request failed (${res.status})`,
          `run onlyness-axi serve ${session.id}`,
        );
      }
      body = await res.json();
    } catch (err) {
      if (err instanceof AxiError) throw err;
      throw new AxiError(
        `server unreachable on port ${port}`,
        `run onlyness-axi serve ${session.id}`,
      );
    }

    const event = parseEventsBody(body);
    session = loadSession(rootDir, session.id);

    if (!event) {
      print(
        emitKV([
          ["event", "timeout"],
          ["session", session.id],
          ["step", session.step],
          ["coachBudgetUsed", session.coachBudget.used],
        ]),
      );
      print(
        emitBlock("next", [
          `1. onlyness-axi poll ${session.id}`,
          `2. onlyness-axi playbook ${session.step === "off_axis" ? "off-axis" : session.step}`,
        ]),
      );
      return 0;
    }

    const payloadStr = toonValue(JSON.stringify(event.payload));
    print(
      emitKV([
        ["event", event.type],
        ["session", session.id],
        ["step", session.step],
        ["coachBudgetUsed", session.coachBudget.used],
        ["payload", payloadStr],
      ]),
    );
    print(
      emitBlock("next", [
        "1. Coach within budget (playbook coach) then reply",
        `2. onlyness-axi advance ${session.id} when gate ready`,
      ]),
    );
    return 0;
  },
};
