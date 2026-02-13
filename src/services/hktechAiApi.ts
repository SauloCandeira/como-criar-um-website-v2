const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type HKTechAiResult = {
  status: "blocked" | "planned";
  reason?: string;
  issues: Array<{ key: string; message: string; severity: string; type: string }>;
  plan?: { issueKeys: string[]; risk: string; steps: string[] } | null;
  branchName?: string;
  prLink?: string;
  qualityGate?: string;
  confidenceScore?: number;
};

export type HKTechSimulateResult = HKTechAiResult;

export async function runHKTechAutofix(adminId: string): Promise<HKTechAiResult> {
  const res = await fetch(`${API_BASE}/hktech-ai/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  });
  if (!res.ok) throw new Error("Falha ao executar HKTECH IA");
  return res.json();
}

export async function simulateHKTechFix(adminId: string, issueKey: string): Promise<HKTechSimulateResult> {
  const res = await fetch(`${API_BASE}/hktech-ai/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, issueKey }),
  });
  if (!res.ok) throw new Error("Falha ao simular HKTECH IA");
  return res.json();
}

export async function resolveHKTechIssues(adminId: string, issueKeys: string[], maxIssues: number): Promise<HKTechAiResult> {
  const res = await fetch(`${API_BASE}/hktech-ai/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, issueKeys, maxIssues }),
  });
  if (!res.ok) throw new Error("Falha ao resolver issues via HKTECH IA");
  return res.json();
}
