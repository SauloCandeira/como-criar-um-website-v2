import React, { useState } from 'react';
import { DaoProposal } from '../Interfaces/InterfaceDao';

export const DaoCreateProposal: React.FC<{ onCreated?: (proposal: DaoProposal) => void }> = ({ onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const proposal = { title, description };
    const res = await fetch('/api/dao/proposals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposal)
    });
    const data = await res.json();
    setLoading(false);
    setTitle('');
    setDescription('');
    if (onCreated) onCreated(data);
  };

  return (
    <form className="dao-create-proposal" onSubmit={handleSubmit}>
      <h4>Criar Proposta</h4>
      <input
        type="text"
        placeholder="Título"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Descrição"
        value={description}
        onChange={e => setDescription(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>Enviar</button>
    </form>
  );
};
