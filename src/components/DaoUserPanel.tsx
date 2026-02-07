import React, { useEffect, useState } from 'react';
import './DaoUserPanel.css';
import { DaoProposalDTO, DaoVoteType, createDaoProposal, getDaoMyBot, listDaoProposals, voteDaoProposal } from '../services/daoApi';

interface DaoUserPanelProps {
  userId: string;
}

export const DaoUserPanel: React.FC<DaoUserPanelProps> = ({ userId }) => {
  const [proposals, setProposals] = useState<DaoProposalDTO[]>([]);
  const [myBotId, setMyBotId] = useState<string | null>(null);
  const [myBotBalance, setMyBotBalance] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [voteProposalId, setVoteProposalId] = useState<string | null>(null);
  const [voteType, setVoteType] = useState<DaoVoteType>('YES');
  const [amountBet, setAmountBet] = useState(0);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = async () => {
    try {
      const data = await listDaoProposals();
      setProposals(data);
    } catch (err) {
      setError('Não foi possível carregar propostas DAO.');
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  useEffect(() => {
    if (!userId) return;
    getDaoMyBot(userId)
      .then((data) => {
        setMyBotId(data.myBotId);
        setMyBotBalance(data.balance);
      })
      .catch(() => {
        setMyBotId(null);
        setMyBotBalance(null);
      });
  }, [userId]);

  const handleCreateProposal = async () => {
    if (!createTitle.trim() || !createDescription.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const created = await createDaoProposal({
        title: createTitle.trim(),
        description: createDescription.trim(),
        createdByUserId: userId,
      });
      setProposals((prev) => [created, ...prev]);
      setCreateTitle('');
      setCreateDescription('');
      setShowCreate(false);
    } catch (err) {
      setError('Não foi possível criar a proposta.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!voteProposalId || !userId || !myBotId) {
      setError('Selecione um MyBot válido para votar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await voteDaoProposal({
        proposalId: voteProposalId,
        userId,
        myBotId,
        vote: voteType,
        amountBet,
      });
      setVoteProposalId(null);
      setAmountBet(0);
      await loadProposals();
    } catch (err) {
      setError('Não foi possível registrar seu voto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dao-user-panel">
      <h2>DAO - Governança</h2>
      <div className="dao-actions">
        <button className="dao-primary-btn" onClick={() => setShowCreate(true)}>Criar Proposta</button>
        <button className="dao-secondary-btn" onClick={loadProposals}>Atualizar</button>
        {myBotBalance !== null && (
          <span className="dao-status">Saldo MyBot: {myBotBalance.toFixed(2)}</span>
        )}
      </div>
      {error && <span className="dao-error">{error}</span>}

      <h3>Propostas aprovadas / em votação</h3>
      <ul className="dao-list">
        {proposals.map((p) => (
          <li key={p.id} className="dao-list-item">
            <strong>{p.title}</strong>
            <span className="dao-status">{p.status}</span>
            <p>{p.description}</p>
            {p.status === 'VOTING' && (
              <button className="dao-primary-btn" onClick={() => setVoteProposalId(p.id)}>Apostar/Votar</button>
            )}
          </li>
        ))}
      </ul>

      {showCreate && (
        <div className="dao-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="dao-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dao-modal__header">
              <h3>Nova proposta</h3>
              <button className="dao-secondary-btn" onClick={() => setShowCreate(false)}>Fechar</button>
            </div>
            <div className="dao-field">
              <label>Título</label>
              <input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Título da proposta" />
            </div>
            <div className="dao-field">
              <label>Descrição</label>
              <textarea value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} rows={4} placeholder="Descreva sua proposta" />
            </div>
            <div className="dao-modal__footer">
              <button className="dao-secondary-btn" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="dao-primary-btn" disabled={loading} onClick={handleCreateProposal}>
                {loading ? 'Enviando...' : 'Enviar proposta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {voteProposalId && (
        <div className="dao-modal-backdrop" onClick={() => setVoteProposalId(null)}>
          <div className="dao-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dao-modal__header">
              <h3>Votar/Apostar</h3>
              <button className="dao-secondary-btn" onClick={() => setVoteProposalId(null)}>Fechar</button>
            </div>
            <div className="dao-field">
              <label>Voto</label>
              <select value={voteType} onChange={(e) => setVoteType(e.target.value as DaoVoteType)}>
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
            <div className="dao-field">
              <label>Valor a apostar</label>
              <input type="number" value={amountBet} onChange={(e) => setAmountBet(Number(e.target.value))} min={1} placeholder="Valor" />
            </div>
            <div className="dao-modal__footer">
              <button className="dao-secondary-btn" onClick={() => setVoteProposalId(null)}>Cancelar</button>
              <button className="dao-primary-btn" disabled={loading} onClick={handleVote}>
                {loading ? 'Enviando...' : 'Confirmar voto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
