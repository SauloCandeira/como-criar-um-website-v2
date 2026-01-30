const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export type DepositMethod = 'pix' | 'cartao' | 'credito' | 'crypto' | 'criptomoeda';

export interface DepositResponse {
  account: {
    id: string;
    userId: string;
    cpf?: string;
    balance: number;
    currency?: string;
  };
  transaction: {
    id: string;
    accountId: string;
    method: string;
    amount: number;
    status: string;
    reference?: string;
    createdAt?: string;
  };
}

export async function createDeposit(payload: {
  userId: string;
  amount: number;
  method: DepositMethod;
  cpf?: string;
  reference?: string;
}): Promise<DepositResponse> {
  const res = await fetch(`${API_BASE}/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Falha ao registrar depósito");
  }
  const data = await res.json();
  return {
    account: {
      id: data.account?.id,
      userId: data.account?.userId ?? data.account?.user_id ?? payload.userId,
      cpf: data.account?.cpf ?? "",
      balance: Number(data.account?.balance ?? 0),
      currency: data.account?.currency ?? "BRL",
    },
    transaction: {
      id: data.transaction?.id,
      accountId: data.transaction?.accountId ?? data.transaction?.account_id ?? "",
      method: data.transaction?.method ?? "",
      amount: Number(data.transaction?.amount ?? 0),
      status: data.transaction?.status ?? "",
      reference: data.transaction?.reference ?? "",
      createdAt: data.transaction?.createdAt ?? data.transaction?.created_at ?? "",
    },
  };
}
