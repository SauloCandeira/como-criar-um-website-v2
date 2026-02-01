/*
  HKTech Firestore Bootstrap Script
  - Creates projetos/HKTECH if missing
  - Creates Kanban columns and items
  - Creates initial sprint metadata
  - Idempotent: only creates docs if they do not exist
  - Does NOT touch other projects

  Usage (not executed here):
    1) Provide Firebase Admin credentials via GOOGLE_APPLICATION_CREDENTIALS
    2) Run with ts-node or compile to JS
*/

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

type EnsureDocParams = {
  ref: FirebaseFirestore.DocumentReference;
  data: FirebaseFirestore.DocumentData;
};

async function ensureDoc({ ref, data }: EnsureDocParams) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, data, { merge: true });
    }
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function bootstrap() {
  const projectId = "HKTECH";
  const projectRef = db.collection("projetos").doc(projectId);

  await ensureDoc({
    ref: projectRef,
    data: {
      name: "HKTECH",
      slug: "hktech",
      type: "ai-managed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  // Kanban columns
  const columns = [
    { key: "backlog", title: "Backlog", order: 1 },
    { key: "ready", title: "Ready", order: 2 },
    { key: "in-progress", title: "In Progress", order: 3 },
    { key: "review", title: "Review", order: 4 },
    { key: "done", title: "Done", order: 5 },
  ];

  for (const column of columns) {
    const columnRef = projectRef.collection("kanbanColumns").doc(column.key);
    await ensureDoc({
      ref: columnRef,
      data: {
        key: column.key,
        title: column.title,
        order: column.order,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }

  // Kanban items from ai-kanban-bootstrap.ata.md backlog
  const backlogItems = [
    "Define v1 API contract spec (OpenAPI/DTO doc)",
    "Publish learning event registry + schema doc",
    "Draft memory policy summary (user-facing, non-legal)",
    "Define metric naming + redaction policy",
    "Review MyAlien/MyBot route separation (audit only)",
    "Draft audit log schema (redacted)",
    "Add correlation/trace ID standard (design)",
  ];

  let backlogOrder = 1;
  for (const title of backlogItems) {
    const itemId = `backlog-${slugify(title)}`;
    const itemRef = projectRef.collection("kanbanItems").doc(itemId);
    await ensureDoc({
      ref: itemRef,
      data: {
        title,
        status: "backlog",
        columnKey: "backlog",
        order: backlogOrder++,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }

  // Sprint metadata from ai-sprint-1.ata.md
  const sprintId = "ai-sprint-1";
  const sprintRef = projectRef.collection("sprints").doc(sprintId);

  await ensureDoc({
    ref: sprintRef,
    data: {
      name: "AI Sprint 1 (MVP-Scoped)",
      goal:
        "Establish MVP-safe architecture artifacts that enable immediate implementation without violating MyAlien/MyBot constraints or LGPD.",
      scope: [
        "Use HKTech orchestrator as source of truth.",
        "No code changes yet; deliverables are documentation + validation artifacts.",
        "Firestore collection `projetos` already exists.",
      ],
      definitionOfDone: [
        "Document exists in /docs or /prompts with clear scope and constraints.",
        "No new features introduced.",
        "Explicitly distinguishes design vs implementation.",
      ],
      risks: [
        "Legal approval required before enforcing retention/deletion timelines.",
        "Current backend route layout must be reviewed before code enforcement.",
      ],
      deliverables: ["Documentation artifacts only; no code changes."],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });

  // Sprint tasks (linked to backlog items by title)
  const sprintTasks = [
    "Create v1 API contract spec (OpenAPI/DTO) aligned with domain separation.",
    "Publish learning event registry + schema rules.",
    "Draft redacted audit log schema for memory/admin actions.",
    "Define metrics naming/tagging + redaction policy.",
    "Draft user-facing memory policy summary (non-legal).",
    "Review current MyAlien/MyBot route separation (audit only).",
  ];

  let sprintOrder = 1;
  for (const title of sprintTasks) {
    const taskId = `task-${slugify(title)}`;
    const taskRef = sprintRef.collection("tasks").doc(taskId);
    await ensureDoc({
      ref: taskRef,
      data: {
        title,
        status: "backlog",
        order: sprintOrder++,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }
}

bootstrap()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("HKTech bootstrap completed (idempotent).");
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("HKTech bootstrap failed:", error);
    process.exitCode = 1;
  });
