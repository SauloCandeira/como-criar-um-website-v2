import React from 'react';

type BillingCycle = 'monthly' | 'annual';

type CostItem = {
  id: string;
  name: string;
  costValue: string;
  billingCycle: BillingCycle;
};

type CostDraft = {
  name: string;
  costValue: string;
  billingCycle: BillingCycle;
};

type CostEdit = {
  id: string;
  name: string;
  costValue: string;
  billingCycle: BillingCycle;
};

type FinanceiroCustosProps = {
  costs: CostItem[];
  loading: boolean;
  error: string | null;
  totalCostsMonthly: number;
  totalCostsAnnual: number;
  newCost: CostDraft;
  setNewCost: React.Dispatch<React.SetStateAction<CostDraft>>;
  onCreateCost: () => void;
  onEditCost: (cost: CostItem) => void;
  onDeleteCost: (cost: CostItem) => void;
  getMonthlyCost: (cost: CostItem) => number;
  isEditCostModalOpen: boolean;
  setIsEditCostModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editCostData: CostEdit;
  setEditCostData: React.Dispatch<React.SetStateAction<CostEdit>>;
  onSaveCostEdit: () => void;
};

const FinanceiroCustos: React.FC<FinanceiroCustosProps> = ({
  costs,
  loading,
  error,
  totalCostsMonthly,
  totalCostsAnnual,
  newCost,
  setNewCost,
  onCreateCost,
  onEditCost,
  onDeleteCost,
  getMonthlyCost,
  isEditCostModalOpen,
  setIsEditCostModalOpen,
  editCostData,
  setEditCostData,
  onSaveCostEdit,
}) => {
  return (
    <section>
      <h2>Custos</h2>
      {loading && <p>Carregando custos...</p>}
      {error && <p>{error}</p>}
      <div className="report-summary">
        <div className="report-card">
          <span>Custos mensais</span>
          <strong>R$ {totalCostsMonthly.toFixed(2).replace('.', ',')}</strong>
        </div>
        <div className="report-card">
          <span>Custos anuais</span>
          <strong>R$ {totalCostsAnnual.toFixed(2).replace('.', ',')}</strong>
        </div>
        <div className="report-card">
          <span>Total de itens</span>
          <strong>{costs.length}</strong>
        </div>
      </div>
      <div className="admin-user-actions">
        <input
          type="text"
          placeholder="Nome do custo"
          value={newCost.name}
          onChange={(e) => setNewCost((prev) => ({ ...prev, name: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Valor (opcional)"
          value={newCost.costValue}
          onChange={(e) => setNewCost((prev) => ({ ...prev, costValue: e.target.value }))}
        />
        <select
          value={newCost.billingCycle}
          onChange={(e) => setNewCost((prev) => ({ ...prev, billingCycle: e.target.value as BillingCycle }))}
        >
          <option value="monthly">Mensal</option>
          <option value="annual">Anual</option>
        </select>
        <button className="admin-btn" onClick={onCreateCost}>Adicionar custo</button>
      </div>

      <table className="admin-table admin-table--costs">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Valor</th>
            <th>Ciclo</th>
            <th>Mensal eq.</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {!loading && costs.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum custo encontrado.</td>
            </tr>
          )}
          {costs.map((cost) => (
            <tr key={cost.id}>
              <td>{cost.name}</td>
              <td>{cost.costValue || '-'}</td>
              <td>{cost.billingCycle === 'annual' ? 'Anual' : 'Mensal'}</td>
              <td>R$ {getMonthlyCost(cost).toFixed(2).replace('.', ',')}</td>
              <td className="admin-actions">
                <button className="admin-btn" onClick={() => onEditCost(cost)} aria-label="Editar">
                  <span className="admin-action-icon">✏️</span>
                  <span className="admin-action-text">Editar</span>
                </button>
                <button className="admin-btn admin-btn--danger" onClick={() => onDeleteCost(cost)} aria-label="Excluir">
                  <span className="admin-action-icon">🗑️</span>
                  <span className="admin-action-text">Excluir</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isEditCostModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsEditCostModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Editar custo</h3>
              <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditCostModalOpen(false)}>Fechar</button>
            </div>
            {error && <p className="admin-modal__error">{error}</p>}
            <div className="admin-modal__form">
              <label>
                <span>Nome</span>
                <input
                  type="text"
                  value={editCostData.name}
                  onChange={(e) => setEditCostData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label>
                <span>Valor</span>
                <input
                  type="text"
                  value={editCostData.costValue}
                  onChange={(e) => setEditCostData((prev) => ({ ...prev, costValue: e.target.value }))}
                />
              </label>
              <label>
                <span>Ciclo</span>
                <select
                  value={editCostData.billingCycle}
                  onChange={(e) => setEditCostData((prev) => ({ ...prev, billingCycle: e.target.value as BillingCycle }))}
                >
                  <option value="monthly">Mensal</option>
                  <option value="annual">Anual</option>
                </select>
              </label>
            </div>
            <div className="admin-modal__footer">
              <button className="admin-btn admin-btn--ghost" onClick={() => setIsEditCostModalOpen(false)}>Cancelar</button>
              <button className="admin-btn" onClick={onSaveCostEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FinanceiroCustos;
