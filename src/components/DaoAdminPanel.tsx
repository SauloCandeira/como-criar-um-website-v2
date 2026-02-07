import React, { useEffect, useState } from 'react';
import './DaoUserPanel.css';
import { DaoProposalDTO, closeDaoProposal, listDaoAdminProposals, publishDaoProposal, reviewDaoProposal } from '../services/daoApi';

interface DaoAdminPanelProps {
  adminId: string;
}

export const DaoAdminPanel: React.FC<DaoAdminPanelProps> = ({ adminId }) => {
  const [proposals, setProposals] = useState<DaoProposalDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProposals = async () => {
    try {
      const data = await listDaoAdminProposals();
      setProposals(data);
    } catch (err) {
      setError('Não foi possível carregar propostas DAO.');
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const handleReview = async (id: string, approved: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await reviewDaoProposal({ id, approved, adminId });
      await loadProposals();
    } catch (err) {
      setError('Não foi possível revisar a proposta.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await publishDaoProposal({ id });
      await loadProposals();
    } catch (err) {
      setError('Não foi possível publicar a proposta.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await closeDaoProposal({ id });
      await loadProposals();
    } catch (err) {
      setError('Não foi possível encerrar a votação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dao-admin-panel">
      {error && <p className="dao-error">{error}</p>}
      <h3>Propostas enviadas</h3>
      <ul className="dao-list">
        {proposals.map((p) => (
          <li key={p.id} className="dao-list-item">
            <strong>{p.title}</strong>
            <span className="dao-status">{p.status}</span>
            <p>{p.description}</p>
            <div className="dao-actions">
              <button className="dao-primary-btn" disabled={loading} onClick={() => handleReview(p.id, true)}>Aprovar</button>
              <button className="dao-secondary-btn" disabled={loading} onClick={() => handleReview(p.id, false)}>Rejeitar</button>
              <button className="dao-primary-btn" disabled={loading} onClick={() => handlePublish(p.id)}>Publicar</button>
              <button className="dao-secondary-btn" disabled={loading} onClick={() => handleClose(p.id)}>Encerrar votação</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
