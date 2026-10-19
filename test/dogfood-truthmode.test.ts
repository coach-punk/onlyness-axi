import { describe, expect, it } from "vitest";
import { consumeCoachTurn } from "../src/session/coach.js";
import { createSession } from "../src/session/store.js";
import { runRubric } from "../src/truthmode/rubric.js";

const CURB_SALESMAN = "I am the only used-car salesman on this curb";
const CARVANA_LINE =
  "I am the only car retailer that sells cars from a vending machine";

describe("dogfood truthmode fixture", () => {
  it("workshop session: curb salesman fails rubric, Carvana line passes", () => {
    const session = createSession({ entry: "blank" });
    const workshop = {
      ...session,
      step: "truthmode" as const,
      paradoxAck: true,
      arena: {
        industry: "used cars",
        offering: "used car retail",
        audience: "car buyers",
      },
    };

    const curb = runRubric(CURB_SALESMAN, workshop.arena);
    expect(curb.verdict).toBe("fail");
    expect(curb.checks.some((c) => c.id === "geo")).toBe(true);

    const carvana = runRubric(CARVANA_LINE, workshop.arena);
    expect(carvana.verdict).toBe("pass");
  });

  it("simulated coach exhaust returns exhausted after three turns", () => {
    let s = createSession({});
    s = { ...s, step: "truthmode" };
    for (const label of ["clarify", "ground", "mirror"] as const) {
      const turn = consumeCoachTurn(s, `dogfood ${label}`);
      expect("job" in turn && turn.job).toBe(label);
      s = turn.session;
    }
    const exhausted = consumeCoachTurn(s, "still stuck");
    expect("exhausted" in exhausted && exhausted.exhausted).toBe(true);
  });
});
