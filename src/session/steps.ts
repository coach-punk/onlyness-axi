import { resetBudgetIfAnswerChanged, substantiveChanged } from "./coach.js";
import { runRubric } from "../truthmode/rubric.js";
import type {
  Arena,
  AxisAnswer,
  OffAxisAnswer,
  PitchSatisfaction,
  RivalMarker,
  Session,
  SessionAnswers,
  StandAnswer,
  StepId,
  TruthmodeState,
} from "./types.js";

export type HumanSubmitPayload = {
  paradoxAck?: boolean;
  paradoxRevealed?: boolean;
  arena?: Partial<Arena>;
  answers?: {
    stand?: Partial<StandAnswer>;
    axis?: Partial<AxisAnswer>;
    off_axis?: Partial<OffAxisAnswer>;
    [key: string]: unknown;
  };
  statement?: string;
  truthmode?: Partial<TruthmodeState>;
  weakAdvance?: boolean;
  satisfaction?: Partial<PitchSatisfaction>;
  humanMessage?: string;
};

export const STEP_ORDER: StepId[] = [
  "paradox",
  "arena",
  "stand",
  "axis",
  "off_axis",
  "onlyness",
  "truthmode",
  "pitch",
  "done",
];

export const REVISABLE_STEPS: StepId[] = [
  "arena",
  "stand",
  "axis",
  "off_axis",
  "onlyness",
  "truthmode",
];

const WEAK_ADVANCE_STEPS: ReadonlySet<StepId> = new Set([
  "stand",
  "axis",
  "off_axis",
  "onlyness",
  "truthmode",
]);

export function emptyTruthmode(): TruthmodeState {
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
  const keys = Object.keys(payload).filter((k) => k !== "humanMessage");
  if (keys.length === 0) return "submit: (empty)";
  return `submit: ${keys.join(", ")}`;
}

export function satisfactionComplete(s: PitchSatisfaction): boolean {
  return s.stand && s.axis && s.off_axis && s.onlyness && s.statement;
}

export function nextStep(step: StepId): StepId {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)]!;
}

function nonEmpty(...vals: string[]): boolean {
  return vals.every((v) => v.trim().length > 0);
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizeRivals(rivals: unknown): RivalMarker[] | undefined {
  if (!Array.isArray(rivals)) return undefined;
  const out: RivalMarker[] = [];
  for (let i = 0; i < rivals.length; i++) {
    const item = rivals[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const label = typeof raw["label"] === "string" ? raw["label"].trim() : "";
    if (!label) continue;
    const id =
      typeof raw["id"] === "string" && raw["id"].trim()
        ? raw["id"].trim()
        : `rival-${i + 1}`;
    const x =
      typeof raw["x"] === "number" ? clampPercent(raw["x"]) : 50;
    out.push({ id, label, x });
  }
  return out;
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

function answerNumber(
  answers: Record<string, unknown>,
  key: string,
  field: string,
): number | undefined {
  const block = answers[key];
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return undefined;
  }
  const v = (block as Record<string, unknown>)[field];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
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
    case "axis": {
      const a = session.answers.axis;
      const rivalsStr = Array.isArray(a?.rivals)
        ? a.rivals.map((r) => `${r.label}:${r.x}`).join(",")
        : "";
      return [
        answerField(session.answers, "axis", "scale"),
        answerField(session.answers, "axis", "leftPole"),
        answerField(session.answers, "axis", "rightPole"),
        answerField(session.answers, "axis", "place"),
        String(answerNumber(session.answers, "axis", "selfX") ?? ""),
        rivalsStr,
        answerField(session.answers, "axis", "ifWin"),
      ].join("\n");
    }
    case "off_axis":
      return [
        answerField(session.answers, "off_axis", "territory"),
        answerField(session.answers, "off_axis", "axisLabel"),
        String(answerNumber(session.answers, "off_axis", "selfX") ?? ""),
        String(answerNumber(session.answers, "off_axis", "selfY") ?? ""),
      ].join("\n");
    case "onlyness":
      return session.statement;
    case "truthmode": {
      const t = session.truthmode;
      if (!t) return "";
      return [t.swap, t.itch, t.sticky, t.jackBlack, t.cuts.join("\n")].join(
        "\n",
      );
    }
    case "pitch": {
      const s = session.satisfaction;
      return [
        s.stand,
        s.axis,
        s.off_axis,
        s.onlyness,
        s.statement,
      ]
        .map((v) => (v ? "1" : "0"))
        .join("");
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
  // Calm exit after coach budget exhaust: weakAdvance unlocks steps 1..truthmode,
  // never Act 0 (paradox / arena), pitch satisfaction, or done.
  if (session.weakAdvance && WEAK_ADVANCE_STEPS.has(session.step)) {
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
      const a = session.answers.stand;
      return a && nonEmpty(a.who ?? "", a.job ?? "", a.solved ?? "")
        ? { ok: true }
        : { ok: false, reason: "stand needs who, job, and solved" };
    }
    case "axis": {
      const a = session.answers.axis;
      const hasScale = Boolean(
        a &&
          (nonEmpty(a.scale ?? "") ||
            nonEmpty(a.leftPole ?? "", a.rightPole ?? "")),
      );
      const hasPlace = Boolean(
        a &&
          (nonEmpty(a.place ?? "") ||
            (typeof a.selfX === "number" && Number.isFinite(a.selfX))),
      );
      const hasIfWin = Boolean(a && nonEmpty(a.ifWin ?? ""));
      return hasScale && hasPlace && hasIfWin
        ? { ok: true }
        : { ok: false, reason: "axis needs scale (or poles), place (or position), and ifWin" };
    }
    case "off_axis": {
      const a = session.answers.off_axis;
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
      if (!t || t.verdict === null) {
        return { ok: false, reason: "run truthmode check first" };
      }
      if (!nonEmpty(t.swap)) {
        return {
          ok: false,
          reason:
            "fill Pass 2 adversarial swap (click Generate rival swap, write one, or run truthmode set-swap)",
        };
      }
      if (!nonEmpty(t.itch, t.sticky, t.jackBlack)) {
        return { ok: false, reason: "fill itch, sticky, and jackBlack" };
      }
      if (t.verdict === "fail" && !session.weakAdvance) {
        return {
          ok: false,
          reason: "truthmode failed — revise off_axis or statement (or set weak advance)",
        };
      }
      return { ok: true };
    }
    case "pitch": {
      if (!nonEmpty(session.statement)) {
        return { ok: false, reason: "need an onlyness statement" };
      }
      const t = session.truthmode;
      if (!t || t.verdict === null) {
        return { ok: false, reason: "run truthmode check first" };
      }
      if (!nonEmpty(t.swap)) {
        return { ok: false, reason: "record Pass 2 adversarial swap first" };
      }
      if (t.verdict === "fail") {
        return { ok: false, reason: "truthmode failed — revise before pitch" };
      }
      if (!satisfactionComplete(session.satisfaction)) {
        return {
          ok: false,
          reason:
            "confirm satisfaction with stand, axis, off-axis, onlyness, and statement",
        };
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

function mergeAnswers(
  prev: SessionAnswers,
  patch: HumanSubmitPayload["answers"],
): SessionAnswers {
  if (!patch) return prev;
  const next: SessionAnswers = { ...prev };

  if (patch.stand && typeof patch.stand === "object" && !Array.isArray(patch.stand)) {
    next.stand = {
      ...(prev.stand ?? {}),
      ...patch.stand,
    };
  }

  if (patch.axis && typeof patch.axis === "object" && !Array.isArray(patch.axis)) {
    const mergedAxis: Partial<AxisAnswer> = {
      ...(prev.axis ?? {}),
      ...patch.axis,
    };
    if (typeof mergedAxis.selfX === "number") {
      mergedAxis.selfX = clampPercent(mergedAxis.selfX);
    }
    if (patch.axis.rivals !== undefined) {
      const sanitized = sanitizeRivals(patch.axis.rivals);
      if (sanitized !== undefined) {
        mergedAxis.rivals = sanitized;
      }
    }
    const left = (mergedAxis.leftPole ?? "").trim();
    const right = (mergedAxis.rightPole ?? "").trim();
    if ((!mergedAxis.scale || !mergedAxis.scale.trim()) && left && right) {
      mergedAxis.scale = `${left} to ${right}`;
    }
    if (
      (!mergedAxis.place || !mergedAxis.place.trim()) &&
      typeof mergedAxis.selfX === "number" &&
      Number.isFinite(mergedAxis.selfX)
    ) {
      mergedAxis.place = `Position ${mergedAxis.selfX}/100`;
    }
    next.axis = mergedAxis;
  }

  if (
    patch.off_axis &&
    typeof patch.off_axis === "object" &&
    !Array.isArray(patch.off_axis)
  ) {
    const mergedOff: Partial<OffAxisAnswer> = {
      ...(prev.off_axis ?? {}),
      ...patch.off_axis,
    };
    if (typeof mergedOff.selfX === "number") {
      mergedOff.selfX = clampPercent(mergedOff.selfX);
    }
    if (typeof mergedOff.selfY === "number") {
      mergedOff.selfY = clampPercent(mergedOff.selfY);
    }
    next.off_axis = mergedOff;
  }

  for (const [k, v] of Object.entries(patch)) {
    if (k === "stand" || k === "axis" || k === "off_axis") continue;
    next[k] = v;
  }

  return next;
}

export function applyHumanSubmit(
  session: Session,
  payload: HumanSubmitPayload,
): Session {
  const beforeBlob = stepAnswerBlob(session);

  let truthmode =
    payload.truthmode !== undefined
      ? {
          ...(session.truthmode ?? emptyTruthmode()),
          ...payload.truthmode,
        }
      : session.truthmode;

  const statementUpdated =
    typeof payload.statement === "string" &&
    substantiveChanged(session.statement, payload.statement);

  if (statementUpdated && truthmode) {
    truthmode = {
      ...truthmode,
      verdict: null,
      checks: [],
    };
  }

  const satisfaction =
    payload.satisfaction !== undefined
      ? { ...session.satisfaction, ...payload.satisfaction }
      : session.satisfaction;

  const mergedAnswers = payload.answers
    ? mergeAnswers(session.answers, payload.answers)
    : session.answers;

  const logEntries = [...session.coachLog];
  const trimmedMsg =
    typeof payload.humanMessage === "string" ? payload.humanMessage.trim() : "";
  const nonMessageKeys = Object.keys(payload).filter(
    (k) => k !== "humanMessage",
  );

  if (trimmedMsg) {
    logEntries.push({
      at: new Date().toISOString(),
      step: session.step,
      role: "human",
      text: trimmedMsg,
    });
  }
  if (nonMessageKeys.length > 0 || !trimmedMsg) {
    logEntries.push({
      at: new Date().toISOString(),
      step: session.step,
      role: "human",
      text: humanSubmitSummary(payload),
    });
  }

  let next: Session = {
    ...session,
    ...(payload.paradoxAck === true ? { paradoxAck: true } : {}),
    ...(payload.paradoxRevealed === true ? { paradoxRevealed: true } : {}),
    ...(payload.arena
      ? { arena: { ...session.arena, ...payload.arena } }
      : {}),
    answers: mergedAnswers,
    ...(typeof payload.statement === "string"
      ? { statement: payload.statement }
      : {}),
    ...(truthmode !== null ? { truthmode } : {}),
    ...(payload.weakAdvance === true ? { weakAdvance: true } : {}),
    ...(payload.satisfaction !== undefined ? { satisfaction } : {}),
    coachLog: logEntries,
  };

  const afterBlob = stepAnswerBlob(next);
  next = resetBudgetIfAnswerChanged(next, beforeBlob, afterBlob);
  return next;
}

export function reviseStep(session: Session, target: StepId): Session {
  if (!REVISABLE_STEPS.includes(target)) {
    throw new Error(
      `cannot revise to '${target}'; valid targets: ${REVISABLE_STEPS.join(", ")}`,
    );
  }

  const sat: PitchSatisfaction = { ...session.satisfaction };
  if (target === "arena" || target === "stand") {
    sat.stand = false;
    sat.axis = false;
    sat.off_axis = false;
    sat.onlyness = false;
    sat.statement = false;
  } else if (target === "axis") {
    sat.axis = false;
    sat.off_axis = false;
    sat.onlyness = false;
    sat.statement = false;
  } else if (target === "off_axis") {
    sat.off_axis = false;
    sat.onlyness = false;
    sat.statement = false;
  } else if (target === "onlyness" || target === "truthmode") {
    sat.onlyness = false;
    sat.statement = false;
  }

  return {
    ...session,
    step: target,
    coachBudget: { used: 0, max: 3, lastJob: null },
    weakAdvance: false,
    satisfaction: sat,
    coachLog: [
      ...session.coachLog,
      {
        at: new Date().toISOString(),
        step: target,
        role: "system",
        text: `revised back to ${target}`,
      },
    ],
  };
}

export function advanceSession(session: Session): Session {
  const gate = canAdvance(session);
  if (!gate.ok) throw new Error(gate.reason ?? "cannot advance");
  const next = nextStep(session.step);
  let truthmode = session.truthmode;
  if (next === "truthmode" && session.statement.trim().length > 0) {
    const { verdict, checks } = runRubric(session.statement, session.arena);
    truthmode = {
      ...(session.truthmode ?? emptyTruthmode()),
      verdict,
      checks,
    };
  }
  return {
    ...session,
    step: next,
    ...(truthmode !== null ? { truthmode } : {}),
    coachBudget: { used: 0, max: 3, lastJob: null },
    weakAdvance: false,
  };
}
