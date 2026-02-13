const test = require("node:test");
const assert = require("node:assert/strict");

const {
  fetchSonarSummary,
  fetchSonarIssues,
  validatePatchAgainstRestrictions,
  buildFixPlan,
} = require("../lib/services/hktechAI.service");

test("fetchSonarSummary parses quality gate and metrics", async () => {
  const mockFetch = async (url) => {
    if (url.includes("qualitygates")) {
      return {
        ok: true,
        json: async () => ({ projectStatus: { status: "OK" } }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        component: {
          measures: [
            { metric: "bugs", value: "2" },
            { metric: "vulnerabilities", value: "1" },
            { metric: "code_smells", value: "5" },
            { metric: "duplicated_lines_density", value: "0.3" },
          ],
        },
      }),
    };
  };

  const summary = await fetchSonarSummary({ token: "t", projectKey: "p" }, mockFetch);
  assert.equal(summary.qualityGateStatus, "OK");
  assert.equal(summary.metrics.bugs, 2);
  assert.equal(summary.metrics.vulnerabilities, 1);
  assert.equal(summary.metrics.codeSmells, 5);
  assert.equal(summary.metrics.duplicatedLinesDensity, "0.3");
});

test("fetchSonarIssues filters and maps issues", async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      issues: [
        {
          key: "ISSUE-1",
          rule: "rule",
          severity: "MAJOR",
          type: "BUG",
          message: "msg",
          component: "file.ts",
          line: 10,
        },
      ],
    }),
  });

  const issues = await fetchSonarIssues({ token: "t", projectKey: "p" }, mockFetch);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].key, "ISSUE-1");
});

test("validatePatchAgainstRestrictions blocks restricted paths", () => {
  const result = validatePatchAgainstRestrictions("diff --git a/prisma/schema.prisma b/prisma/schema.prisma");
  assert.equal(result.ok, false);
  assert.ok(result.blockedPaths.length > 0);
});

test("buildFixPlan builds basic plan", () => {
  const plan = buildFixPlan([
    { key: "ISSUE-1", rule: "r", severity: "MAJOR", type: "BUG", message: "m", component: "c" },
  ]);
  assert.equal(plan.issueKeys[0], "ISSUE-1");
  assert.ok(plan.steps.length > 0);
});
