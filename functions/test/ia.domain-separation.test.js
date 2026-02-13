const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(__dirname, "..", "src", "index.ts");
const source = fs.readFileSync(sourcePath, "utf8");

test("IA tasks endpoint excludes project tasks", () => {
  assert.match(
    source,
    /FROM project_tasks WHERE domain = 'IA' AND project_id IS NULL ORDER BY created_at DESC/
  );
});

test("IA reset only removes IA domain tasks", () => {
  assert.match(
    source,
    /DELETE FROM project_tasks WHERE domain = 'IA' AND project_id IS NULL RETURNING id/
  );
});

test("IA migrate targets HKTECH or IA domain", () => {
  assert.match(
    source,
    /UPDATE project_tasks SET domain = 'IA', generated_by_ai = true, project_id = NULL WHERE \(project_id = ANY\(\$1::uuid\[]\) OR project_id::text = 'HKTECH' OR domain = 'IA'\)/
  );
});
