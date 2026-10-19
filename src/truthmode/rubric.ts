import type { Arena, TruthmodeCheck } from "../session/types.js";

const GEO_PATTERN =
  /\bonly\b.*\b(in|on|at)\b.*\b(city|town|street|curb|zip|area|edge|block)\b/i;
const BETTER_AXIS_PATTERN =
  /\b(better|faster|cheaper|prettier|best|improved|ai-?powered)\b/i;
const CATEGORY_WHO_PATTERN = /only .+ who (sells|makes|provides)/i;
const ONLYNESS_PREFIX = /^i am the only/i;

const STOP_WORDS = new Set([
  "i",
  "am",
  "the",
  "only",
  "that",
  "who",
  "a",
  "an",
  "is",
  "are",
  "and",
  "or",
  "from",
  "in",
  "on",
  "at",
  "to",
  "of",
  "for",
  "with",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 0);
}

function checkGeo(statement: string): TruthmodeCheck | null {
  if (GEO_PATTERN.test(statement) || /this whole/i.test(statement)) {
    return {
      id: "geo",
      severity: "fail",
      detail: "Geographic or positional scarcity is not onlyness.",
    };
  }
  return null;
}

function checkBetterAxis(statement: string): TruthmodeCheck | null {
  if (BETTER_AXIS_PATTERN.test(statement)) {
    return {
      id: "better_axis",
      severity: "fail",
      detail: "Better/faster/cheaper axis is not onlyness.",
    };
  }
  return null;
}

function offeringTokens(offering: string): Set<string> {
  return new Set(tokenize(offering));
}

function checkCategoryRestate(
  statement: string,
  arena: Arena,
): TruthmodeCheck | null {
  const offering = arena.offering.trim();
  if (!offering) {
    return null;
  }

  const afterOnly = statement.replace(ONLYNESS_PREFIX, "").trim();
  if (afterOnly.length > 0 && afterOnly.length < 40) {
    return {
      id: "category_restate",
      severity: "fail",
      detail: "Statement restates the offering without a differentiating clause.",
    };
  }

  const whoMatch = statement.match(CATEGORY_WHO_PATTERN);
  if (whoMatch) {
    const offeringSet = offeringTokens(offering);
    const afterWho = statement.slice(
      (whoMatch.index ?? 0) + whoMatch[0].length,
    );
    const clauseWords = tokenize(afterWho).filter((w) => !STOP_WORDS.has(w));
    const hasDifferentiator = clauseWords.some((w) => !offeringSet.has(w));
    if (!hasDifferentiator) {
      return {
        id: "category_restate",
        severity: "fail",
        detail:
          "Who-sells pattern adds no differentiator beyond the obvious offering.",
      };
    }
  }

  return null;
}

function checkNoItch(statement: string): TruthmodeCheck | null {
  const thatIndex = statement.search(/\bthat\b/i);
  if (thatIndex === -1) {
    return {
      id: "no_itch",
      severity: "weak",
      detail: "Missing a that-clause describing the itch or paradigm shift.",
    };
  }

  const afterThat = statement.slice(thatIndex).replace(/\bthat\b/i, "").trim();
  const wordCount = afterThat.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4) {
    return {
      id: "no_itch",
      severity: "weak",
      detail: "That-clause is too short to carry a concrete itch.",
    };
  }

  return null;
}

function checkFindReplace(
  statement: string,
  arena: Arena,
): TruthmodeCheck | null {
  const industry = arena.industry.trim();
  if (!industry) {
    return null;
  }

  const industrySet = new Set(tokenize(industry));
  const statementWords = tokenize(statement).filter(
    (w) => !STOP_WORDS.has(w) && w.length > 2,
  );
  const concreteBeyondIndustry = statementWords.some(
    (w) => !industrySet.has(w),
  );

  if (!concreteBeyondIndustry) {
    return {
      id: "find_replace",
      severity: "weak",
      detail:
        "No concrete noun beyond industry tokens; add a find-and-replace detail.",
    };
  }

  return null;
}

function computeVerdict(
  checks: TruthmodeCheck[],
): "pass" | "weak" | "fail" {
  if (checks.some((c) => c.severity === "fail")) {
    return "fail";
  }
  if (checks.some((c) => c.severity === "weak")) {
    return "weak";
  }
  return "pass";
}

export function runRubric(
  statement: string,
  arena?: Arena,
): { verdict: "pass" | "weak" | "fail"; checks: TruthmodeCheck[] } {
  const checks: TruthmodeCheck[] = [];

  const geo = checkGeo(statement);
  if (geo) checks.push(geo);

  const betterAxis = checkBetterAxis(statement);
  if (betterAxis) checks.push(betterAxis);

  if (arena) {
    const category = checkCategoryRestate(statement, arena);
    if (category) checks.push(category);

    const findReplace = checkFindReplace(statement, arena);
    if (findReplace) checks.push(findReplace);
  }

  const noItch = checkNoItch(statement);
  if (noItch) checks.push(noItch);

  return { verdict: computeVerdict(checks), checks };
}
