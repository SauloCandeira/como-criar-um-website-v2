import React from 'react';
import type { PurchaseDTO } from '../../../services/purchasesApi';

type FinanceiroVendasProps = {
  paidSales: PurchaseDTO[];
  loading: boolean;
  error: string | null;
  onViewProject: (projectId: string) => void;
};

const FinanceiroVendas: React.FC<FinanceiroVendasProps> = ({ paidSales, loading, error, onViewProject }) => {
  return (
    <section>
      <h2>Vendas (Pagas)</h2>
      {loading && <p>Carregando vendas...</p>}
      {error && <p>{error}</p>}
      <table className="admin-table admin-table--sales">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Produto</th>
            <th>Preço</th>
            <th>Status</th>
            <th>Projeto</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          {!loading && paidSales.length === 0 && (
            <tr>
              <td colSpan={6}>Nenhuma venda encontrada.</td>
            </tr>
          )}
          {paidSales.map((sale) => (
            <tr key={sale.id}>
              <td>{sale.userId}</td>
              <td>{sale.productName || 'Produto'}</td>
              <td>R$ {Number(sale.price || 0).toFixed(2).replace('.', ',')}</td>
              <td>{sale.status}</td>
              <td>
                {sale.projectId ? (
                  <button
                    className="admin-btn admin-btn--ghost"
                    onClick={() => onViewProject(sale.projectId || '')}
                  >
                    Ver projeto
                  </button>
                ) : (
                  '—'
                )}
              </td>
              <td>{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default FinanceiroVendas;
