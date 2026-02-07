import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/init-firebase";
import type { KanbanColumn, KanbanItem, KanbanProjectSnapshot, KanbanStatus } from "./kanbanTypes";

type ContractStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "BLOCKED" | "DONE";

const UI_COLUMNS: Array<{ id: string; title: string; status: KanbanStatus; order: number }> = [
  { id: "no_status", title: "No Status", status: "no_status", order: 1 },
  { id: "not_started", title: "Not Started", status: "not_started", order: 2 },
  { id: "in_progress", title: "In Progress", status: "in_progress", order: 3 },
  { id: "completed", title: "Completed", status: "completed", order: 4 },
];

const CONTRACT_COLUMNS: Array<{ id: string; title: string; status: ContractStatus; order: number }> = [
  { id: "TODO", title: "TODO", status: "TODO", order: 1 },
  { id: "IN_PROGRESS", title: "IN_PROGRESS", status: "IN_PROGRESS", order: 2 },
  { id: "REVIEW", title: "REVIEW", status: "REVIEW", order: 3 },
  { id: "BLOCKED", title: "BLOCKED", status: "BLOCKED", order: 4 },
  { id: "DONE", title: "DONE", status: "DONE", order: 5 },
];

const TEMPLATE_TASKS: Array<{ text: string; status: ContractStatus }> = [
  { text: "Definir objetivo da página institucional", status: "TODO" },
  { text: "Revisar identidade visual (cores e tipografia)", status: "TODO" },
  { text: "Montar estrutura base do HTML", status: "TODO" },
  { text: "Criar sessão 'Quem Somos'", status: "TODO" },
  { text: "Criar sessão 'Nossos Serviços'", status: "TODO" },
  { text: "Adicionar rodapé com informações legais", status: "TODO" },
  { text: "Aplicar estilos responsivos", status: "TODO" },
  { text: "Revisar conteúdo e validar preview", status: "TODO" },
];

const contractColumnsRef = (projectId: string) =>
  collection(db, "projetos", projectId, "kanban");
const contractItemsRef = (projectId: string) =>
  collection(db, "projetos", projectId, "kanban_items");

const legacyItemsRef = (projectId: string) =>
  collection(db, "projetos", projectId, "kanbanItems");

const toIso = (value: any) => (value?.toDate ? value.toDate().toISOString() : undefined);

const contractToUiStatus = (status: ContractStatus): KanbanStatus => {
  switch (status) {
    case "TODO":
      return "no_status";
    case "IN_PROGRESS":
      return "in_progress";
    case "REVIEW":
      return "in_progress";
    case "BLOCKED":
      return "not_started";
    case "DONE":
      return "completed";
    default:
      return "no_status";
  }
};

const uiToContractStatus = (status: KanbanStatus): ContractStatus => {
  switch (status) {
    case "in_progress":
      return "IN_PROGRESS";
    case "completed":
      return "DONE";
    case "not_started":
      return "TODO";
    case "no_status":
    default:
      return "TODO";
  }
};

async function ensureContractColumns(projectId: string) {
  const snapshot = await getDocs(contractColumnsRef(projectId));
  if (!snapshot.empty) return;

  const batch = writeBatch(db);
  CONTRACT_COLUMNS.forEach((column) => {
    const ref = doc(contractColumnsRef(projectId), column.id);
    batch.set(ref, {
      title: column.title,
      status: column.status,
      order: column.order,
      projectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

async function hasAnyItems(projectId: string) {
  const [contractItemsSnap, legacyItemsSnap] = await Promise.all([
    getDocs(query(contractItemsRef(projectId), limit(1))),
    getDocs(query(legacyItemsRef(projectId), limit(1))),
  ]);
  return !contractItemsSnap.empty || !legacyItemsSnap.empty;
}

async function cloneItemsFromBase(baseProjectId: string, targetProjectId: string) {
  const [contractItemsSnap, legacyItemsSnap] = await Promise.all([
    getDocs(query(contractItemsRef(baseProjectId), orderBy("order", "asc"))),
    getDocs(query(legacyItemsRef(baseProjectId), orderBy("order", "asc"))),
  ]);

  const items: Array<{ text: string; status: ContractStatus; order: number }> = [];

  contractItemsSnap.docs.forEach((docSnap) => {
    items.push({
      text: docSnap.get("text") ?? docSnap.get("title") ?? "",
      status: docSnap.get("status") as ContractStatus,
      order: docSnap.get("order") ?? 0,
    });
  });

  if (items.length === 0) {
    legacyItemsSnap.docs.forEach((docSnap) => {
      const legacyStatus = docSnap.get("status") as KanbanStatus;
      items.push({
        text: docSnap.get("text") ?? "",
        status: uiToContractStatus(legacyStatus),
        order: docSnap.get("order") ?? 0,
      });
    });
  }

  if (items.length === 0) return false;

  const batch = writeBatch(db);
  items.forEach((item, index) => {
    const ref = doc(contractItemsRef(targetProjectId));
    batch.set(ref, {
      text: item.text,
      status: item.status ?? "TODO",
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
      projectId: targetProjectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return true;
}

async function seedTemplateTasks(targetProjectId: string) {
  const batch = writeBatch(db);
  TEMPLATE_TASKS.forEach((task, index) => {
    const ref = doc(contractItemsRef(targetProjectId));
    batch.set(ref, {
      text: task.text,
      status: task.status,
      order: index,
      projectId: targetProjectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function ensureProjectTasksSeed(
  projectId: string,
  options: { baseProjectId?: string | null; isTemplate?: boolean }
) {
  await ensureContractColumns(projectId);
  const alreadyHas = await hasAnyItems(projectId);
  if (alreadyHas) return;

  if (options.baseProjectId) {
    const cloned = await cloneItemsFromBase(options.baseProjectId, projectId);
    if (cloned) return;
  }

  if (options.isTemplate) {
    await seedTemplateTasks(projectId);
  }
}

export async function fetchKanbanSnapshot(projectId: string): Promise<KanbanProjectSnapshot> {
  await ensureContractColumns(projectId);

  const [contractItemsSnap, legacyItemsSnap] = await Promise.all([
    getDocs(query(contractItemsRef(projectId), orderBy("order", "asc"))),
    getDocs(query(legacyItemsRef(projectId), orderBy("order", "asc"))),
  ]);

  const contractItems: KanbanItem[] = contractItemsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    text: docSnap.get("text") ?? docSnap.get("title") ?? "",
    status: contractToUiStatus(docSnap.get("status") as ContractStatus),
    order: docSnap.get("order") ?? 0,
    projectId: docSnap.get("projectId"),
    columnId: docSnap.get("columnId"),
    createdAt: toIso(docSnap.get("createdAt")),
    updatedAt: toIso(docSnap.get("updatedAt")),
  }));

  const legacyItems: KanbanItem[] = legacyItemsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    text: docSnap.get("text"),
    status: docSnap.get("status"),
    order: docSnap.get("order"),
    projectId: docSnap.get("projectId"),
    columnId: docSnap.get("columnId"),
    createdAt: toIso(docSnap.get("createdAt")),
    updatedAt: toIso(docSnap.get("updatedAt")),
  }));

  const itemsById = new Map<string, KanbanItem>();
  contractItems.forEach((item) => itemsById.set(item.id, item));
  legacyItems.forEach((item) => {
    if (!itemsById.has(item.id)) {
      itemsById.set(item.id, item);
    }
  });

  const items = Array.from(itemsById.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const columns: KanbanColumn[] = UI_COLUMNS.map((column) => ({
    ...column,
    projectId,
  }));

  return { projectId, columns, items };
}

export async function createKanbanItem(projectId: string, text: string, status: KanbanStatus) {
  const contractStatus = uiToContractStatus(status);
  const lastQuery = query(
    contractItemsRef(projectId),
    where("status", "==", contractStatus),
    orderBy("order", "desc"),
    limit(1)
  );
  const lastSnap = await getDocs(lastQuery);
  const lastOrder = lastSnap.docs[0]?.get("order") ?? 0;

  await addDoc(contractItemsRef(projectId), {
    text,
    status: contractStatus,
    order: lastOrder + 1,
    projectId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateKanbanItemStatus(projectId: string, itemId: string, status: KanbanStatus) {
  const contractStatus = uiToContractStatus(status);
  const contractRef = doc(contractItemsRef(projectId), itemId);
  const contractSnap = await getDoc(contractRef);
  if (contractSnap.exists()) {
    await updateDoc(contractRef, {
      status: contractStatus,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const legacyRef = doc(legacyItemsRef(projectId), itemId);
  await updateDoc(legacyRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteKanbanItem(projectId: string, itemId: string) {
  const contractRef = doc(contractItemsRef(projectId), itemId);
  const contractSnap = await getDoc(contractRef);
  if (contractSnap.exists()) {
    await deleteDoc(contractRef);
    return;
  }

  const legacyRef = doc(legacyItemsRef(projectId), itemId);
  await deleteDoc(legacyRef);
}
