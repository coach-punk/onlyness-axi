// Smoke and end-to-end Option B CLI tests. Requires build (`pretest`).
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const bin = fileURLToPath(new URL("../bin/onlyness-axi.js", import.meta.url));
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8"),
) as { version: string };

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop()!;
    rmSync(d, { recursive: true, force: true });
  }
});

function makeTempCwd(): string {
  const dir = mkdtempSync(join(tmpdir(), "onlyness-cli-"));
  tempDirs.push(dir);
  return dir;
}

function cli(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    cwd,
    env: { ...process.env, ONLYNESS_NO_BROWSER: "1" },
  });
}

describe("onlyness-axi AXI contract and Option B workflow", () => {
  it("no-args shows content and exits 0 (principle 8)", () => {
    const cwd = makeTempCwd();
    const r = cli([], cwd);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/^\s*usage[:\s]/i);
    expect(r.stdout.trim().length).toBeGreaterThan(0);
    expect(r.stderr.trim()).toBe("");
  });

  it("--help exits 0 and --version matches package.json", () => {
    const h = cli(["--help"]);
    expect(h.status).toBe(0);
    expect(h.stdout).toContain("--");

    const v = cli(["--version"]);
    expect(v.status).toBe(0);
    expect(v.stdout.trim()).toBe(`onlyness-axi: ${pkg.version}`);
  });

  it("unknown flag exits 2 naming valid flags (principle 6)", () => {
    const r = cli(["--not-a-real-flag"]);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("error:");
    expect(r.stdout).toContain("--");
  });

  it("paused chill sessions remain visible in default list", () => {
    const cwd = makeTempCwd();
    const started = cli(["start", "--entry", "blank", "--no-open"], cwd);
    expect(started.status).toBe(0);
    const id = started.stdout.match(/^session:\s*(\S+)/m)![1]!;

    const chilled = cli(["chill", id, "--reason", "take a walk"], cwd);
    expect(chilled.status).toBe(0);

    const listed = cli(["list"], cwd);
    expect(listed.status).toBe(0);
    expect(listed.stdout).toContain(id);
    expect(listed.stdout).toContain("paused");

    const ended = cli(["end", id], cwd);
    expect(ended.status).toBe(0);
    const afterEnd = cli(["list"], cwd);
    expect(afterEnd.stdout).not.toContain(id);
    const allList = cli(["list", "--all"], cwd);
    expect(allList.stdout).toContain(id);
  });

  it("init writes and updates AGENTS.md idempotently without touching trail block", () => {
    const cwd = makeTempCwd();
    const agents = join(cwd, "AGENTS.md");
    writeFileSync(agents, "<!-- trail:start -->\nKeep me intact\n<!-- trail:end -->\n");

    const r1 = cli(["init", "--dir", cwd], cwd);
    expect(r1.status).toBe(0);
    expect(r1.stdout).toContain("action: appended");

    const content1 = readFileSync(agents, "utf8");
    expect(content1).toContain("<!-- trail:start -->");
    expect(content1).toContain("<!-- onlyness:start -->");

    const r2 = cli(["init", "--dir", cwd], cwd);
    expect(r2.status).toBe(0);
    expect(r2.stdout).toContain("action: updated");
    const content2 = readFileSync(agents, "utf8");
    expect(content2).toBe(content1);
  });

  it("runs a full end-to-end Option B workshop with truthmode fail -> revise -> pass -> pitch -> result", () => {
    const cwd = makeTempCwd();

    const startRes = cli(["start", "--entry", "prune", "--seed-text", "SaaS notes", "--no-open"], cwd);
    expect(startRes.status).toBe(0);
    const id = startRes.stdout.match(/^session:\s*(\S+)/m)![1]!;
    const workshopFile = startRes.stdout.match(/^workshopFile:\s*(\S+)/m)![1]!;
    expect(existsSync(workshopFile)).toBe(true);

    // Prefill arena
    const pre = cli(
      [
        "prefill",
        id,
        "--industry",
        "Used car retail",
        "--offering",
        "Car vending tower",
        "--audience",
        "First-time buyers",
        "--source",
        "chat",
      ],
      cwd,
    );
    expect(pre.status).toBe(0);

    // Paradox ack -> arena
    expect(cli(["submit", id, "--json", '{"paradoxAck":true}'], cwd).status).toBe(0);
    expect(cli(["advance", id], cwd).status).toBe(0);

    // Arena -> Stand (already prefilled)
    expect(cli(["advance", id], cwd).status).toBe(0);

    // Stand -> Axis
    expect(
      cli(
        [
          "submit",
          id,
          "--json",
          JSON.stringify({
            answers: {
              stand: {
                who: "First-time buyers",
                job: "Skip haggling",
                solved: "Walk up to tower and drive home",
              },
            },
          }),
        ],
        cwd,
      ).status,
    ).toBe(0);
    expect(cli(["coach", id, "--text", "Sharp stand."], cwd).status).toBe(0);
    expect(cli(["advance", id], cwd).status).toBe(0);

    // Axis -> Off-axis
    expect(
      cli(
        [
          "submit",
          id,
          "--json",
          JSON.stringify({
            answers: {
              axis: {
                leftPole: "Sketchy lot",
                rightPole: "Cheap lot",
                selfX: 70,
                rivals: [{ id: "r1", label: "Honest Bob", x: 72 }],
                ifWin: "Still just a car lot",
              },
            },
          }),
        ],
        cwd,
      ).status,
    ).toBe(0);
    expect(cli(["advance", id], cwd).status).toBe(0);

    // Off-axis -> Onlyness
    expect(
      cli(
        [
          "submit",
          id,
          "--json",
          JSON.stringify({
            answers: {
              off_axis: {
                axisLabel: "Glass vending tower",
                territory: "Automated tower pickup ritual",
                selfX: 65,
                selfY: 88,
              },
            },
          }),
        ],
        cwd,
      ).status,
    ).toBe(0);
    expect(cli(["advance", id], cwd).status).toBe(0);

    // Submit failing statement -> Truthmode check fails -> Revise -> Pass
    expect(
      cli(
        [
          "submit",
          id,
          "--json",
          JSON.stringify({
            statement: "I am the only car retailer that is faster and cheaper",
          }),
        ],
        cwd,
      ).status,
    ).toBe(0);
    expect(cli(["advance", id], cwd).status).toBe(0);

    const failCheck = cli(["truthmode", "check", id], cwd);
    expect(failCheck.status).toBe(0);
    expect(failCheck.stdout).toContain("verdict: fail");

    // Revise back to onlyness
    const rev = cli(["revise", id, "onlyness"], cwd);
    expect(rev.status).toBe(0);
    expect(rev.stdout).toContain("step: onlyness");

    // Rewrite strong paradigm statement
    expect(
      cli(
        [
          "submit",
          id,
          "--json",
          JSON.stringify({
            statement:
              "I am the only car retailer that sells cars from a vending machine",
          }),
        ],
        cwd,
      ).status,
    ).toBe(0);
    expect(cli(["advance", id], cwd).status).toBe(0);

    const passCheck = cli(["truthmode", "check", id], cwd);
    expect(passCheck.status).toBe(0);
    expect(passCheck.stdout).toContain("verdict: pass");

    expect(
      cli(
        [
          "truthmode",
          "set-swap",
          id,
          "--text",
          "Honest Bob claims he uses a vending machine despite having only a gravel curb.",
        ],
        cwd,
      ).status,
    ).toBe(0);

    expect(
      cli(
        [
          "submit",
          id,
          "--json",
          JSON.stringify({
            truthmode: {
              itch: "Eliminates dealership dread",
              sticky: "Glass car tower",
              jackBlack: "Gravel lots sound absurd making that claim",
              cuts: ["Negotiation desks"],
            },
          }),
        ],
        cwd,
      ).status,
    ).toBe(0);

    expect(cli(["advance", id], cwd).status).toBe(0);
    const statPitch = cli(["status", id], cwd);
    expect(statPitch.stdout).toContain("step: pitch");

    // Confirm satisfaction -> pitch -> done
    expect(
      cli(
        [
          "submit",
          id,
          "--json",
          JSON.stringify({
            satisfaction: {
              stand: true,
              axis: true,
              off_axis: true,
              onlyness: true,
              statement: true,
            },
          }),
        ],
        cwd,
      ).status,
    ).toBe(0);

    const pitchRes = cli(["pitch", id], cwd);
    expect(pitchRes.status).toBe(0);
    const pitchFile = pitchRes.stdout.match(/^pitchFile:\s*(\S+)/m)![1]!;
    expect(existsSync(pitchFile)).toBe(true);
    expect(readFileSync(pitchFile, "utf8")).toContain("Negotiation desks");

    expect(cli(["advance", id], cwd).status).toBe(0);

    const res = cli(["result", id], cwd);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("verdict: pass");
    expect(res.stdout).toContain("Negotiation desks");
    expect(res.stdout).toContain("step: done");

    expect(cli(["end", id], cwd).status).toBe(0);
  });

  it("supports start --no-server --no-open in standalone mode without server.json", () => {
    const cwd = makeTempCwd();
    const res = cli(["start", "--entry", "blank", "--no-server", "--no-open"], cwd);
    expect(res.status).toBe(0);
    const id = res.stdout.match(/^session:\s*(\S+)/m)![1]!;
    expect(res.stdout).toContain("mode: standalone");
    expect(existsSync(join(cwd, ".onlyness", id, "server.json"))).toBe(false);
    expect(cli(["end", id], cwd).status).toBe(0);
  });

  it("starts live loopback HTTP server on start --no-open, serves & advances over HTTP, and stops on end", async () => {
    const cwd = makeTempCwd();
    const res = cli(["start", "--entry", "blank", "--no-open"], cwd);
    expect(res.status).toBe(0);
    const id = res.stdout.match(/^session:\s*(\S+)/m)![1]!;
    expect(res.stdout).toContain("mode: live-http");

    const urlMatch = res.stdout.match(/^url:\s*(\S+)/m);
    expect(urlMatch).toBeTruthy();
    const url = urlMatch![1]!;
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/s\/[a-f0-9]+\/$/);

    const serverJsonPath = join(cwd, ".onlyness", id, "server.json");
    expect(existsSync(serverJsonPath)).toBe(true);
    const serverMeta = JSON.parse(readFileSync(serverJsonPath, "utf8")) as {
      pid: number;
      port: number;
      token: string;
    };

    const page = await fetch(url);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('"live":true');
    expect(html).toContain("btn-next-paradox");

    const origin = `http://127.0.0.1:${serverMeta.port}`;
    const sub = await fetch(`${origin}/api/${serverMeta.token}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ paradoxAck: true }),
    });
    expect(sub.status).toBe(200);

    const adv = await fetch(`${origin}/api/${serverMeta.token}/advance`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: "{}",
    });
    expect(adv.status).toBe(200);
    const advBody = (await adv.json()) as { step: string };
    expect(advBody.step).toBe("arena");

    expect(cli(["end", id], cwd).status).toBe(0);
    expect(existsSync(serverJsonPath)).toBe(false);

    // Wait briefly for SIGTERM exit and verify server process is gone
    let alive = true;
    for (let i = 0; i < 20; i++) {
      try {
        process.kill(serverMeta.pid, 0);
        await new Promise((r) => setTimeout(r, 50));
      } catch {
        alive = false;
        break;
      }
    }
    expect(alive).toBe(false);
  });
});
