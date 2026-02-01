import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/init-firebase";
import type { AiReport } from "./aiReportTypes";

const reportsRef = (projectId: string) =>
  collection(db, "projetos", projectId, "ai_reports");

const toIso = (value: any) => (value?.toDate ? value.toDate().toISOString() : undefined);

export async function createReport(payload: Omit<AiReport, "id" | "createdAt" | "updatedAt">) {
  await addDoc(reportsRef(payload.projectId), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listReportsByProject(projectId: string): Promise<AiReport[]> {
  const q = query(reportsRef(projectId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    projectId,
    kanbanItemId: docSnap.get("kanbanItemId"),
    agent: docSnap.get("agent"),
    summary: docSnap.get("summary"),
    decisions: docSnap.get("decisions") ?? [],
    risks: docSnap.get("risks") ?? [],
    nextActions: docSnap.get("nextActions") ?? [],
    createdAt: toIso(docSnap.get("createdAt")),
    updatedAt: toIso(docSnap.get("updatedAt")),
  }));
}
