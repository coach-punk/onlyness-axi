import type { Arena, TruthmodeCheck } from "../session/types.js";

const GEO_PATTERN =
  /\bonly\b.*\b(?:in|on|at)\b.*\b(?:city|town|street|curb|zip|area|edge|block|neighborhood|corner|mall|radius)\b/i;
const RADIUS_PATTERN = /\bwithin\s+\d+\s*(?:miles?|blocks?|km|kilometers?)\b/i;
const THIS_WHOLE_PATTERN = /\bthis whole\b/i;

const BETTER_AXIS_WORDS =
  /\b(better|faster|cheaper|prettier|best|improved|ai-?powered|smarter|easier|simpler|seamless|more\s+affordable|higher\s+quality|10x|next-?gen|world-?class|best-in-class)\b/gi;

const NEGATION_CONTEXT =
  /\b(?:not|never|instead\s+of|rather\s+than|without|stop|stops|refuse|refuses\s+to|doesn't|don't|ignore|ignores|beyond|unlike)\b/i;

const CATEGORY_WHO_PATTERN = /\bonly\s+.+?\s+who\s+(?:sells?|makes?|provides?)\b/i;

const ONLYNESS_PREFIX =
  /^(?:i\s+am|we\s+are|our\s+[a-z0-9'&.-]+\s+is|[a-z0-9'&.-]+(?:\s+[a-z0-9'&.-]+){0,3}\s+(?:is|are))\s+the\s+only\b/i;

const CONNECTOR_PATTERN = /\b(that|who|where|which|with)\b/i;

const STOP_WORDS = new Set([
  "i",
  "am",
  "we",
  "our",
  "the",
  "only",
  "that",
  "who",
  "where",
  "which",
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
  "by",
  "as",
  "it",
  "its",
  "their",
  "your",
  "you",
  "them",
  "they",
  "no",
  "not",
  "without",
]);

const GENERIC_VERBS = new Set([
  "sell",
  "sells",
  "make",
  "makes",
  "build",
  "builds",
  "provide",
  "provides",
  "offer",
  "offers",
  "do",
  "does",
  "help",
  "helps",
  "give",
  "gives",
]);

const PUFFERY_WORDS = new Set([
  "great",
  "good",
  "nice",
  "quality",
  "modern",
  "innovative",
  "unique",
  "passionate",
  "dedicated",
  "trusted",
  "reliable",
  "leading",
  "premier",
  "custom",
  "personalized",
  "solutions",
  "experience",
  "service",
  "friendly",
  "professional",
]);

export const RUBRIC_CLIENT_RULES = {
  geoSource: GEO_PATTERN.source,
  radiusSource: RADIUS_PATTERN.source,
  thisWholeSource: THIS_WHOLE_PATTERN.source,
  betterAxisSource: BETTER_AXIS_WORDS.source,
  negationSource: NEGATION_CONTEXT.source,
  prefixSource: ONLYNESS_PREFIX.source,
  connectorSource: CONNECTOR_PATTERN.source,
  pufferyWords: [...PUFFERY_WORDS],
} as const;

export interface ParsedOnlyness {
  matchedPrefix: boolean;
  category: string;
  connector: string;
  differentiator: string;
}

export function parseOnlynessFormula(statement: string): ParsedOnlyness {
  const trimmed = statement.trim();
  const prefixMatch = trimmed.match(ONLYNESS_PREFIX);
  const matchedPrefix = Boolean(prefixMatch);
  const remainder = matchedPrefix
    ? trimmed.slice(prefixMatch![0].length).trim()
    : trimmed;

  const connMatch = remainder.match(CONNECTOR_PATTERN);
  if (!connMatch || connMatch.index === undefined) {
    return {
      matchedPrefix,
      category: remainder,
      connector: "",
      differentiator: "",
    };
  }

  return {
    matchedPrefix,
    category: remainder.slice(0, connMatch.index).trim(),
    connector: connMatch[1]!.toLowerCase(),
    differentiator: remainder.slice(connMatch.index + connMatch[0].length).trim(),
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 0);
}

function checkGeo(statement: string): TruthmodeCheck | null {
  if (
    GEO_PATTERN.test(statement) ||
    RADIUS_PATTERN.test(statement) ||
    THIS_WHOLE_PATTERN.test(statement)
  ) {
    return {
      id: "geo",
      severity: "fail",
      detail: "Geographic or positional scarcity is not onlyness.",
    };
  }
  return null;
}

function checkBetterAxis(statement: string): TruthmodeCheck | null {
  const matches = [...statement.matchAll(BETTER_AXIS_WORDS)];
  for (const m of matches) {
    const idx = m.index ?? 0;
    const lookbackStart = Math.max(0, idx - 36);
    const windowText = statement.slice(lookbackStart, idx);
    // Keep negation scoped to the immediate clause (after last comma/semicolon/period)
    const clauseTail = windowText.split(/[,.;:]/).pop() ?? windowText;
    if (!NEGATION_CONTEXT.test(clauseTail)) {
      return {
        id: "better_axis",
        severity: "fail",
        detail: `Axis-of-better comparative ("${m[0]}") is not paradigm onlyness.`,
      };
    }
  }
  return null;
}

function checkCategoryRestate(
  statement: string,
  arena: Arena,
): TruthmodeCheck | null {
  const hasArenaContext =
    arena.offering.trim().length > 0 || arena.industry.trim().length > 0;
  if (!hasArenaContext) {
    return null;
  }

  const parsed = parseOnlynessFormula(statement);
  const diffText = parsed.differentiator || parsed.category;
  const arenaTokens = new Set([
    ...tokenize(arena.offering),
    ...tokenize(arena.industry),
  ]);

  const novelWords = tokenize(diffText).filter(
    (w) =>
      w.length > 1 &&
      !STOP_WORDS.has(w) &&
      !GENERIC_VERBS.has(w) &&
      !arenaTokens.has(w),
  );

  const whoMatch = statement.match(CATEGORY_WHO_PATTERN);
  if (whoMatch) {
    const afterWho = statement.slice(
      (whoMatch.index ?? 0) + whoMatch[0].length,
    );
    const afterNovel = tokenize(afterWho).filter(
      (w) =>
        w.length > 1 &&
        !STOP_WORDS.has(w) &&
        !GENERIC_VERBS.has(w) &&
        !arenaTokens.has(w),
    );
    if (afterNovel.length === 0) {
      return {
        id: "category_restate",
        severity: "fail",
        detail:
          "Who-sells pattern adds no differentiator beyond the obvious offering.",
      };
    }
  }

  if (novelWords.length < 2) {
    return {
      id: "category_restate",
      severity: "fail",
      detail:
        "Statement restates the category/offering without a distinct paradigm differentiator.",
    };
  }

  return null;
}

function checkNoItch(statement: string): TruthmodeCheck | null {
  const parsed = parseOnlynessFormula(statement);
  if (!parsed.connector) {
    return {
      id: "no_itch",
      severity: "weak",
      detail: "Missing a differentiator clause (that / who / where / with) naming the itch.",
    };
  }

  const meaningful = tokenize(parsed.differentiator).filter(
    (w) => w.length > 1 && !STOP_WORDS.has(w),
  );
  if (meaningful.length < 2) {
    return {
      id: "no_itch",
      severity: "weak",
      detail: "Differentiator clause is too thin to carry a concrete buyer itch.",
    };
  }

  return null;
}

function checkFindReplace(
  statement: string,
  arena?: Arena,
): TruthmodeCheck | null {
  const parsed = parseOnlynessFormula(statement);
  const target = parsed.differentiator || parsed.category;
  const arenaTokens = new Set(
    arena ? [...tokenize(arena.industry), ...tokenize(arena.offering)] : [],
  );

  const substantive = tokenize(target).filter(
    (w) =>
      w.length > 2 &&
      !STOP_WORDS.has(w) &&
      !GENERIC_VERBS.has(w) &&
      !arenaTokens.has(w),
  );

  if (substantive.length === 0) {
    return {
      id: "find_replace",
      severity: "weak",
      detail:
        "Any rival could claim this via find-replace; add a concrete mechanism or ritual.",
    };
  }

  const allPuffery = substantive.every((w) => PUFFERY_WORDS.has(w));
  if (allPuffery) {
    return {
      id: "find_replace",
      severity: "weak",
      detail:
        "Differentiator uses generic puffery any rival could claim; anchor it in a specific hook.",
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
  }

  const findReplace = checkFindReplace(statement, arena);
  if (findReplace) checks.push(findReplace);

  const noItch = checkNoItch(statement);
  if (noItch) checks.push(noItch);

  return { verdict: computeVerdict(checks), checks };
}
