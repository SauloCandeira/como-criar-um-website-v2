const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type DaoProposalStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'VOTING'
  | 'CLOSED';

export interface DaoProposalDTO {
  id: string;
  title: string;
  description: string;
  createdByUserId: string;
  status: DaoProposalStatus;
  createdAt: string;
  approvedByAdminId?: string | null;
  votingStart?: string | null;
  votingEnd?: string | null;
}

export type DaoVoteType = 'YES' | 'NO';

export async function listDaoProposals(): Promise<DaoProposalDTO[]> {
  const res = await fetch(`${API_BASE}/dao/proposals`);
  if (!res.ok) throw new Error('Falha ao carregar propostas DAO');
  return res.json();
}

export async function createDaoProposal(payload: { title: string; description: string; createdByUserId: string; }): Promise<DaoProposalDTO> {
  const res = await fetch(`${API_BASE}/dao/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao criar proposta DAO');
  return res.json();
}

export async function voteDaoProposal(payload: { proposalId: string; userId: string; myBotId: string; vote: DaoVoteType; amountBet: number; }): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/dao/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao votar na proposta DAO');
  return res.json();
}

export async function listDaoAdminProposals(): Promise<DaoProposalDTO[]> {
  const res = await fetch(`${API_BASE}/dao/admin/proposals`);
  if (!res.ok) throw new Error('Falha ao carregar propostas DAO (admin)');
  return res.json();
}

export async function reviewDaoProposal(payload: { id: string; approved: boolean; adminId: string; }): Promise<DaoProposalDTO> {
  const res = await fetch(`${API_BASE}/dao/admin/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao revisar proposta DAO');
  return res.json();
}

export async function publishDaoProposal(payload: { id: string; }): Promise<DaoProposalDTO> {
  const res = await fetch(`${API_BASE}/dao/admin/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao publicar proposta DAO');
  return res.json();
}

export async function closeDaoProposal(payload: { id: string; }): Promise<DaoProposalDTO> {
  const res = await fetch(`${API_BASE}/dao/admin/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Falha ao encerrar proposta DAO');
  return res.json();
}

export async function getDaoMyBot(userId: string): Promise<{ myBotId: string; balance: number }> {
  const res = await fetch(`${API_BASE}/dao/mybot?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Falha ao carregar MyBot DAO');
  return res.json();
}
