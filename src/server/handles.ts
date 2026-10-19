import type { StartedServer } from "./http.js";
import { startServer } from "./http.js";

const handles = new Map<string, StartedServer>();

export function getServer(sessionId: string): StartedServer | undefined {
  return handles.get(sessionId);
}

export async function ensureServer(opts: {
  rootDir: string;
  sessionId: string;
  port?: number;
}): Promise<StartedServer> {
  const existing = handles.get(opts.sessionId);
  if (existing) return existing;
  const started = await startServer({
    rootDir: opts.rootDir,
    sessionId: opts.sessionId,
    port: opts.port,
  });
  handles.set(opts.sessionId, started);
  return started;
}

export async function closeServer(sessionId: string): Promise<void> {
  const h = handles.get(sessionId);
  if (!h) return;
  handles.delete(sessionId);
  await h.close();
}

export async function closeAllServers(): Promise<void> {
  const ids = [...handles.keys()];
  await Promise.all(ids.map((id) => closeServer(id)));
}

export function activeServerIds(): string[] {
  return [...handles.keys()];
}
