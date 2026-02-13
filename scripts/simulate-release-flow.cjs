const { Pool } = require("pg");

const API_BASE = process.env.API_BASE || process.env.VITE_API_BASE || "";
const ADMIN_ID = (process.env.ADMIN_ID || "").toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL || "";

const logStep = (message, meta) => {
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  process.stdout.write(`[release-flow] ${message}${payload}\n`);
};

const fail = (message, meta) => {
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  process.stderr.write(`[release-flow] ERROR: ${message}${payload}\n`);
  process.exit(1);
};

const assert = (condition, message, meta) => {
  if (!condition) {
    fail(message, meta);
  }
};

if (!API_BASE) {
  fail("API_BASE not set. Provide API_BASE or VITE_API_BASE.");
}

if (!ADMIN_ID) {
  fail("ADMIN_ID not set. Provide ADMIN_ID (admin email).");
}

if (!DATABASE_URL) {
  fail("DATABASE_URL not set. Required for project_tasks validation.");
}

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
};

const run = async () => {
  const timestamp = Date.now();
  const userEmail = `student+${timestamp}@hktech.com`;

  logStep("Validating template existence");
  const existingTemplates = await request(`/templates?includeInactive=true&adminId=${encodeURIComponent(ADMIN_ID)}`);
  const templateName = "Página Web Institucional";
  let template = Array.isArray(existingTemplates)
    ? existingTemplates.find((item) => (item.name || "").toLowerCase() === templateName.toLowerCase())
    : null;
  assert(template?.id, "Template validation failed.");
  logStep("Template ready", { templateId: template.id });

  logStep("Validating product existence");
  const existingProducts = await request("/products");
  const productName = "Página Web Institucional";
  let product = Array.isArray(existingProducts)
    ? existingProducts.find((item) => (item.name || "").toLowerCase() === productName.toLowerCase())
    : null;
  assert(product?.id, "Product validation failed.");
  logStep("Product ready", { productId: product.id });

  logStep("Creating test user");
  await request("/users", {
    method: "POST",
    body: JSON.stringify({
      authUid: `local-${timestamp}`,
      name: "Student QA",
      email: userEmail,
      authProvider: "Email",
      permissionLevel: "A",
      status: "Ativo",
    }),
  });

  logStep("Running checkout");
  const checkout = await request(`/checkout/products/${encodeURIComponent(product.id)}`, {
    method: "POST",
    body: JSON.stringify({ userId: userEmail }),
  });
  assert(checkout?.order?.id, "Order not created.");
  assert(checkout?.projectId, "Project not cloned from checkout.");
  assert(checkout?.coupon?.discount > 0, "Coupon not applied.", {
    couponCode: checkout?.coupon?.code ?? null,
    discount: checkout?.coupon?.discount ?? 0,
  });

  logStep("Checkout completed", {
    orderId: checkout.order.id,
    projectId: checkout.projectId,
    couponCode: checkout.coupon?.code ?? null,
  });

  logStep("Validating project files");
  const files = await request(`/projects/${encodeURIComponent(checkout.projectId)}/files?userId=${encodeURIComponent(userEmail)}`);
  const indexFile = Array.isArray(files)
    ? files.find((file) => String(file.file_name || file.fileName || "").toLowerCase() === "index.html")
    : null;

  assert(indexFile?.id, "index.html not found in project files.");

  logStep("Validating project tasks in database");
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();
  try {
    const taskResult = await client.query(
      "SELECT id FROM project_tasks WHERE project_id = $1 LIMIT 1",
      [checkout.projectId]
    );
    assert(taskResult.rows.length > 0, "No project_tasks found for cloned project.");
  } finally {
    client.release();
    await pool.end();
  }

  logStep("Updating index.html content");
  await request(`/projects/${encodeURIComponent(checkout.projectId)}/files/${encodeURIComponent(indexFile.id)}`, {
    method: "PUT",
    body: JSON.stringify({
      userId: userEmail,
      fileName: indexFile.fileName || indexFile.file_name || "index.html",
      fileType: indexFile.fileType || indexFile.file_type || "html",
      content: "<html><body><h1>HKTECH Atualizado</h1></body></html>",
    }),
  });

  logStep("Release flow simulated successfully", {
    userEmail,
    templateId: template.id,
    productId: product.id,
    projectId: checkout.projectId,
    orderId: checkout.order.id,
  });
};

run().catch((error) => {
  fail("Release flow failed", { message: error instanceof Error ? error.message : String(error) });
});
