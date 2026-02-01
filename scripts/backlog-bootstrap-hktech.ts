/*
  HKTECH backlog bootstrap (contract kanban_items)
  - Creates tasks in projetos/{projectId}/kanban_items if empty
  - Updates projetos/{projectId}.last_backlog_bootstrap_at
  - Writes one AI report (BACKLOG_PERSISTED)
  - Idempotent: exits if kanban_items already has documents
*/

import admin from "firebase-admin";
import fs from "fs";
import path from "path";

/**
 * === CONFIGURATION ===
 * Path to the Firebase Admin service account JSON
 * (DO NOT COMMIT THIS FILE)
 */
const SERVICE_ACCOUNT_PATH = path.resolve(
  process.cwd(),
  "secrets/firebase-admin.json"
);

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  throw new Error(
    `Firebase service account not found at ${SERVICE_ACCOUNT_PATH}`
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"))
    ),
  });
}

const db = admin.firestore();

/**
 * === PROJECT CONFIG ===
 */
const projectId = "ec251b4c-4c98-47ea-a077-a9a75708566b";

const backlogTasks: Array<{
  title: string;
  assignedAi: string;
}> = [
  {
    title: "Define v1 API contract spec aligned to domain separation",
    assignedAi: "ChatGPT Web",
  },
  {
    title: "Publish learning event registry + schema constraints",
    assignedAi: "ChatGPT Web",
  },
  {
    title: "Draft memory governance policy summary (LGPD-aligned, non-legal)",
    assignedAi: "ChatGPT Web",
  },
  {
    title: "Define observability metrics + redaction policy",
    assignedAi: "Gemini",
  },
  {
    title: "Create security isolation checklist (Firestore rules + API guards)",
    assignedAi: "Gemini",
  },
  {
    title: "Draft AI report (ATA) template + storage fields",
    assignedAi: "Copilot",
  },
  {
    title: "Map Kanban lifecycle to ATA creation rules (operational spec)",
    assignedAi: "Copilot",
  },
  {
    title: "Draft admin-only reporting view requirements (read-only)",
    assignedAi: "Antigravity",
  },
];

async function bootstrap() {
  console.log("Starting HKTECH backlog bootstrap...");

  const projectRef = db.collection("projetos").doc(projectId);
  const itemsRef = projectRef.collection("kanban_items");
  const reportsRef = projectRef.collection("ai_reports");

  const existingSnap = await itemsRef.limit(1).get();

  if (!existingSnap.empty) {
    console.log("Kanban items already exist; skipping bootstrap.");
    return;
  }

  const batch = db.batch();

  backlogTasks.forEach((task, index) => {
    const docRef = itemsRef.doc();

    batch.set(docRef, {
      title: task.title,
      status: "TODO",
      assignedAi: task.assignedAi,
      order: index + 1,
      isFirstActionable: index === 0,
      projectId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  batch.set(
    projectRef,
    {
      last_backlog_bootstrap_at:
        admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  batch.set(reportsRef.doc(), {
    type: "BACKLOG_PERSISTED",
    projectId,
    summary:
      "Backlog inicial persistido com 8 tarefas arquiteturais em TODO, sem execução iniciada.",
    firstTask: backlogTasks[0].title,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  console.log("HKTECH backlog bootstrap completed successfully.");
}

bootstrap().catch((error) => {
  console.error("HKTECH backlog bootstrap failed:", error);
  process.exit(1);
});
