const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type SonarSummaryDTO = {
  projectKey: string;
  qualityGateStatus: string;
  metrics: {
    bugs: number;
    vulnerabilities: number;
    codeSmells: number;
    duplicatedLinesDensity: string;
    coverage: string;
  };
};

export type SonarIssueDTO = {
  key: string;
  rule: string;
  severity: string;
  type: string;
  message: string;
  component: string;
  line?: number;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  riskReason?: string;
};

export async function fetchSonarSummary(): Promise<SonarSummaryDTO> {
  const res = await fetch(`${API_BASE}/sonarcloud/summary`);
  if (!res.ok) throw new Error("Falha ao carregar resumo do SonarCloud");
  return res.json();
}

export async function fetchSonarIssues(): Promise<SonarIssueDTO[]> {
  const res = await fetch(`${API_BASE}/sonarcloud/issues`);
  if (!res.ok) throw new Error("Falha ao carregar issues do SonarCloud");
  return res.json();
}
