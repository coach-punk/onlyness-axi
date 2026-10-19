import { describe, expect, it } from "vitest";
import { consumeCoachTurn, nextCoachJob } from "../src/session/coach.js";
import { createSession } from "../src/session/store.js";

describe("coach budget", () => {
  it("orders clarify → ground → mirror then exhausts", () => {
    expect(nextCoachJob(0)).toBe("clarify");
    expect(nextCoachJob(1)).toBe("ground");
    expect(nextCoachJob(2)).toBe("mirror");
    expect(nextCoachJob(3)).toBe(null);
    let s = createSession({});
    s.step = "stand";
    for (const job of ["clarify", "ground", "mirror"] as const) {
      const r = consumeCoachTurn(s, `push ${job}`);
      expect("job" in r && r.job).toBe(job);
      s = r.session;
    }
    const done = consumeCoachTurn(s, "too much");
    expect("exhausted" in done && done.exhausted).toBe(true);
  });
});
