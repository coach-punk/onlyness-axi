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

export interface PitchSatisfaction {
  stand: boolean;
  axis: boolean;
  off_axis: boolean;
  onlyness: boolean;
  statement: boolean;
}

export interface Arena {
  industry: string;
  offering: string;
  audience: string;
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
  entry: EntryKind;
  step: StepId;
  paradoxAck: boolean;
  arena: Arena;
  contextSources: string[];
  answers: Record<string, unknown>;
  statement: string;
  truthmode: TruthmodeState | null;
  coachLog: CoachEntry[];
  coachBudget: { used: number; max: 3; lastJob: CoachJob | null };
  status: SessionStatus;
  weakAdvance?: boolean;
  port?: number;
  authToken: string;
  version: number;
  /** ISO time when coach last offered a chill break (surface shows Accept once). */
  chillOfferedAt?: string | null;
  satisfaction: PitchSatisfaction;
}
