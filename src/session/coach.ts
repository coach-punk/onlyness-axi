// src/session/coach.ts
import type { CoachJob, Session } from "./types.js";

const JOBS: CoachJob[] = ["clarify", "ground", "mirror"];

export function nextCoachJob(used: number): CoachJob | null {
  return JOBS[used] ?? null;
}

export function consumeCoachTurn(
  session: Session,
  text: string,
):
  | { session: Session; job: CoachJob; exhausted?: undefined }
  | { session: Session; exhausted: true; job?: undefined } {
  const job = nextCoachJob(session.coachBudget.used);
  if (!job) {
    return { exhausted: true, session };
  }
  const next: Session = {
    ...session,
    coachBudget: {
      used: session.coachBudget.used + 1,
      max: 3,
      lastJob: job,
    },
    coachLog: [
      ...session.coachLog,
      {
        at: new Date().toISOString(),
        step: session.step,
        role: "coach",
        job,
        text,
      },
    ],
  };
  return { session: next, job };
}

export function substantiveChanged(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(a) !== norm(b);
}

export function resetBudget(session: Session): Session {
  return { ...session, coachBudget: { used: 0, max: 3, lastJob: null } };
}

/** Reset coach budget when step answer text changed in a substantive way. */
export function resetBudgetIfAnswerChanged(
  session: Session,
  before: string,
  after: string,
): Session {
  return substantiveChanged(before, after) ? resetBudget(session) : session;
}
