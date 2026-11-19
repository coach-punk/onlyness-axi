// src/session/types.ts

export type StepId =
  | "paradox"
  | "arena"
  | "stand"
  | "axis"
  | "off_axis"
  | "onlyness"
  | "truthmode"
  | "pitch"
  | "done";

export type EntryKind = "blank" | "seed" | "prune";
export type CoachJob = "clarify" | "ground" | "mirror";
export type SessionStatus = "active" | "paused" | "ended";

export interface Arena {
  industry: string;
  offering: string;
  audience: string;
}

export interface WorkedExample {
  name: string;
  stand: string;
  axisLeft: string;
  axisRight: string;
  rivals: Array<{ label: string; x: number }>;
  axisPointX: number;
  offAxisLabel: string;
  offAxisX: number;
  offAxisY: number;
  statement: string;
}

export interface StandAnswer {
  who: string;
  job: string;
  solved: string;
}

export interface RivalMarker {
  id: string;
  label: string;
  x: number;
}

export interface AxisAnswer {
  scale: string;
  leftPole: string;
  rightPole: string;
  place: string;
  selfX: number;
  rivals: RivalMarker[];
  ifWin: string;
}

export interface OffAxisAnswer {
  territory: string;
  axisLabel: string;
  selfX: number;
  selfY: number;
}

export interface SessionAnswers {
  stand?: Partial<StandAnswer>;
  axis?: Partial<AxisAnswer>;
  off_axis?: Partial<OffAxisAnswer>;
  [key: string]: unknown;
}

export interface PitchSatisfaction {
  stand: boolean;
  axis: boolean;
  off_axis: boolean;
  onlyness: boolean;
  statement: boolean;
}

export interface CoachEntry {
  at: string;
  step: StepId;
  role: "human" | "coach" | "system";
  job?: CoachJob;
  text: string;
}

export interface TruthmodeCheck {
  id: string;
  severity: "fail" | "weak";
  detail: string;
}

export interface TruthmodeState {
  verdict: "pass" | "weak" | "fail" | null;
  checks: TruthmodeCheck[];
  swap: string;
  itch: string;
  sticky: string;
  jackBlack: string;
  cuts: string[];
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  entry: EntryKind;
  step: StepId;
  paradoxAck: boolean;
  paradoxRevealed?: boolean;
  arena: Arena;
  workedExample: WorkedExample;
  contextSources: string[];
  seedPreview?: string;
  answers: SessionAnswers;
  statement: string;
  truthmode: TruthmodeState | null;
  coachLog: CoachEntry[];
  coachBudget: { used: number; max: 3; lastJob: CoachJob | null };
  status: SessionStatus;
  weakAdvance?: boolean;
  authToken: string;
  version: number;
  /** ISO time when coach last offered a chill break (surface shows Accept once). */
  chillOfferedAt?: string | null;
  chillReason?: string;
  satisfaction: PitchSatisfaction;
}
