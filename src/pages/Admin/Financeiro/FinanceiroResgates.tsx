import React from 'react';
import type { PurchaseDTO } from '../../../services/purchasesApi';

type FinanceiroResgatesProps = {
  redeems: PurchaseDTO[];
  loading: boolean;
  error: string | null;
  onViewProject: (projectId: string) => void;
};

const FinanceiroResgates: React.FC<FinanceiroResgatesProps> = ({ redeems, loading, error, onViewProject }) => {
  return (
    <section>
      <h2>Resgates (Gratuitos)</h2>
      {loading && <p>Carregando resgates...</p>}
      {error && <p>{error}</p>}
      <table className="admin-table admin-table--sales">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th>Projeto</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {!loading && redeems.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum resgate encontrado.</td>
            </tr>
          )}
          {redeems.map((redeem) => (
            <tr key={redeem.id}>
              <td>{redeem.userId}</td>
              <td>{redeem.productName || 'Produto'}</td>
              <td>FREE</td>
              <td>
                {redeem.projectId ? (
                  <button
                    className="admin-btn admin-btn--ghost"
                    onClick={() => onViewProject(redeem.projectId || '')}
                  >
                    Ver projeto
                  </button>
                ) : (
                  '—'
                )}
              </td>
              <td>{redeem.createdAt ? new Date(redeem.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default FinanceiroResgates;
