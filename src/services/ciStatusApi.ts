const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type CiRunDTO = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  updatedAt: string;
  runNumber: number;
  headBranch: string;
};

export type CiStatusDTO = {
  repository: string;
  runs: CiRunDTO[];
};

export async function fetchCiStatus(): Promise<CiStatusDTO> {
  const res = await fetch(`${API_BASE}/ci/status`);
  if (!res.ok) throw new Error("Falha ao carregar status do CI");
  return res.json();
}
