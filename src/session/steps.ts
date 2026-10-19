import { resetBudgetIfAnswerChanged } from "./coach.js";
import type { Arena, Session, StepId, TruthmodeState } from "./types.js";

export type HumanSubmitPayload = {
  paradoxAck?: boolean;
  arena?: Partial<Arena>;
  answers?: Record<string, unknown>;
  statement?: string;
  truthmode?: Partial<TruthmodeState>;
  weakAdvance?: boolean;
};

function emptyTruthmode(): TruthmodeState {
  return {
    verdict: null,
    checks: [],
    swap: "",
    itch: "",
    sticky: "",
    jackBlack: "",
    cuts: [],
  };
}

function humanSubmitSummary(payload: HumanSubmitPayload): string {
  const keys = Object.keys(payload);
  return keys.length > 0 ? `submit: ${keys.join(", ")}` : "submit: (empty)";
}

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

function answerField(
  answers: Record<string, unknown>,
  key: string,
  field: string,
): string {
  const block = answers[key];
  if (!block || typeof block !== "object" || Array.isArray(block)) return "";
  const v = (block as Record<string, unknown>)[field];
  return typeof v === "string" ? v : "";
}

/** Serializable blob of the current step's substantive answer content. */
export function stepAnswerBlob(session: Session): string {
  switch (session.step) {
    case "paradox":
      return "";
    case "arena":
      return [
        session.arena.industry,
        session.arena.offering,
        session.arena.audience,
      ].join("\n");
    case "stand":
      return [
        answerField(session.answers, "stand", "who"),
        answerField(session.answers, "stand", "job"),
        answerField(session.answers, "stand", "solved"),
      ].join("\n");
    case "axis":
      return [
        answerField(session.answers, "axis", "scale"),
        answerField(session.answers, "axis", "place"),
        answerField(session.answers, "axis", "ifWin"),
      ].join("\n");
    case "off_axis":
      return answerField(session.answers, "off_axis", "territory");
    case "onlyness":
      return session.statement;
    case "truthmode": {
      const t = session.truthmode;
      if (!t) return "";
      return [t.itch, t.sticky, t.jackBlack, t.cuts.join("\n")].join("\n");
    }
    case "done":
      return "";
    default: {
      const _exhaustive: never = session.step;
      return String(_exhaustive);
    }
  }
}

export function canAdvance(session: Session): { ok: boolean; reason?: string } {
  // Calm exit after coach budget exhaust: weakAdvance unlocks incomplete steps.
  if (session.weakAdvance && session.step !== "done") {
    return { ok: true };
  }
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

export function applyHumanSubmit(
  session: Session,
  payload: HumanSubmitPayload,
): Session {
  const beforeBlob = stepAnswerBlob(session);

  const truthmode =
    payload.truthmode !== undefined
      ? {
          ...(session.truthmode ?? emptyTruthmode()),
          ...payload.truthmode,
        }
      : session.truthmode;

  let next: Session = {
    ...session,
    ...(payload.paradoxAck === true ? { paradoxAck: true } : {}),
    ...(payload.arena
      ? { arena: { ...session.arena, ...payload.arena } }
      : {}),
    ...(payload.answers
      ? { answers: { ...session.answers, ...payload.answers } }
      : {}),
    ...(typeof payload.statement === "string"
      ? { statement: payload.statement }
      : {}),
    ...(payload.truthmode !== undefined ? { truthmode } : {}),
    ...(payload.weakAdvance === true ? { weakAdvance: true } : {}),
    coachLog: [
      ...session.coachLog,
      {
        at: new Date().toISOString(),
        step: session.step,
        role: "human",
        text: humanSubmitSummary(payload),
      },
    ],
  };

  const afterBlob = stepAnswerBlob(next);
  next = resetBudgetIfAnswerChanged(next, beforeBlob, afterBlob);
  return next;
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
