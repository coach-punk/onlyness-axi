import type { Session, StepId } from "./types.js";

export const STEP_ORDER: StepId[] = [
  "paradox",
  "arena",
  "stand",
  "axis",
  "off_axis",
  "onlyness",
  "truthmode",
  "done",
];

export function nextStep(step: StepId): StepId {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)]!;
}

function nonEmpty(...vals: string[]): boolean {
  return vals.every((v) => v.trim().length > 0);
}

export function canAdvance(session: Session): { ok: boolean; reason?: string } {
  switch (session.step) {
    case "paradox":
      return session.paradoxAck
        ? { ok: true }
        : { ok: false, reason: "acknowledge Pepsi Paradox first" };
    case "arena":
      return nonEmpty(
        session.arena.industry,
        session.arena.offering,
        session.arena.audience,
      )
        ? { ok: true }
        : { ok: false, reason: "fill industry, offering, and audience" };
    case "stand": {
      const a = session.answers.stand as { who?: string; job?: string; solved?: string } | undefined;
      return a && nonEmpty(a.who ?? "", a.job ?? "", a.solved ?? "")
        ? { ok: true }
        : { ok: false, reason: "stand needs who, job, and solved" };
    }
    case "axis": {
      const a = session.answers.axis as { scale?: string; place?: string; ifWin?: string } | undefined;
      return a && nonEmpty(a.scale ?? "", a.place ?? "", a.ifWin ?? "")
        ? { ok: true }
        : { ok: false, reason: "axis needs scale, place, and ifWin" };
    }
    case "off_axis": {
      const a = session.answers.off_axis as { territory?: string } | undefined;
      return a && nonEmpty(a.territory ?? "")
        ? { ok: true }
        : { ok: false, reason: "off_axis needs territory" };
    }
    case "onlyness":
      return nonEmpty(session.statement)
        ? { ok: true }
        : { ok: false, reason: "draft an onlyness statement" };
    case "truthmode": {
      const t = session.truthmode;
      if (!t) return { ok: false, reason: "run truthmode first" };
      if (!nonEmpty(t.itch, t.sticky, t.jackBlack)) {
        return { ok: false, reason: "fill itch, sticky, and jackBlack" };
      }
      if (t.verdict === "fail" && !session.weakAdvance) {
        return { ok: false, reason: "truthmode failed — revise or set weak advance" };
      }
      return { ok: true };
    }
    case "done":
      return { ok: false, reason: "session already done" };
    default: {
      const _exhaustive: never = session.step;
      return { ok: false, reason: String(_exhaustive) };
    }
  }
}

export function advanceSession(session: Session): Session {
  const gate = canAdvance(session);
  if (!gate.ok) throw new Error(gate.reason ?? "cannot advance");
  const next = nextStep(session.step);
  return {
    ...session,
    step: next,
    coachBudget: { used: 0, max: 3, lastJob: null },
    weakAdvance: false,
  };
}
