// DAO Entities
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface MyBot {
  id: string;
  userId: string;
  balance: number; // dinheiro fictício inicial
}

export type DaoProposalStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'VOTING'
  | 'CLOSED';

export interface DaoProposal {
  id: string;
  title: string;
  description: string;
  createdByUserId: string;
  status: DaoProposalStatus;
  createdAt: Date;
  approvedByAdminId?: string;
  votingStart?: Date;
  votingEnd?: Date;
}

export type DaoVoteType = 'YES' | 'NO';

export interface DaoVote {
  id: string;
  proposalId: string;
  userId: string;
  myBotId: string;
  vote: DaoVoteType;
  amountBet: number;
  createdAt: Date;
}
