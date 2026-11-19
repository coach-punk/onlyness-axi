// src/session/coach.ts
import type { CoachJob, Session, StepId } from "./types.js";

const JOBS: CoachJob[] = ["clarify", "ground", "mirror"];

export function nextCoachJob(used: number): CoachJob | null {
  return JOBS[used] ?? null;
}

export function coachJobGuidance(step: StepId, job: CoachJob | null): string {
  if (!job) {
    return "Budget exhausted. Offer calm exits (examples, stuck, weak advance) or revise.";
  }

  switch (step) {
    case "paradox":
      return "Keep framing short: connect the Pepsi blind-taste paradox to their own arena and wait for acknowledgment.";
    case "arena":
      return "Pin down a concrete industry, one-line offering, and specific buyer before moving to Step 1.";
    case "stand":
      if (job === "clarify") {
        return "Ask 1 concrete question pinning down who hurts, what job they hire for, and what solved looks like.";
      }
      if (job === "ground") {
        return "Reframe their stand using their arena nouns and mutual context instead of category wishes.";
      }
      return "Mirror back: could every rival in their arena claim this exact buyer pain?";
    case "axis":
      if (job === "clarify") {
        return "Name one clear bad-to-good industry axis and verify where their rivals sit along it.";
      }
      if (job === "ground") {
        return "Connect the axis scale directly to the customer job from Stand and test what winning that race yields.";
      }
      return "Mirror back: if winning this axis still leaves them looking like a polite Brad Pitt rival, call it out.";
    case "off_axis":
      if (job === "clarify") {
        return "Pin down an orthogonal territory (ritual, feeling, or model) rather than a synonym of Step 2.";
      }
      if (job === "ground") {
        return "Anchor the off-axis leap in their arena: what would they have to cut to make this territory real?";
      }
      return "Mirror back: block any faster/cheaper/AI-powered synonym a rival could copy tomorrow.";
    case "onlyness":
      if (job === "clarify") {
        return "Sharpen the category slot and the that-clause so the paradigm shift is unmistakable.";
      }
      if (job === "ground") {
        return "Offer 2-3 grounded candidate statements shaped around their off-axis leap while keeping human ownership.";
      }
      return "Mirror back with find-replace: swap in a generic rival name and test whether it sounds ridiculous.";
    case "truthmode":
      if (job === "clarify") {
        return "Run truthmode check and ask 1 question targeting the sharpest rubric or itch/sticky gap.";
      }
      if (job === "ground") {
        return "Ground the adversarial swap and Jack Black test in concrete rival claims from their arena.";
      }
      return "Mirror honestly: if it fails or stays weak, suggest revising off_axis or statement instead of giving a pep talk.";
    case "pitch":
      return "Verify genuine satisfaction across steps 1-4 and statement, or revise any weak beat before generating pitch.";
    case "done":
      return "Session complete; emit result or inspect pitch.html.";
    default: {
      const _exhaustive: never = step;
      return String(_exhaustive);
    }
  }
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
