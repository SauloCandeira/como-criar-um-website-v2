import React from 'react';
import type { ProductCheckoutResponse } from '../../services/checkoutApi';

interface CheckoutSummaryProps {
  result: ProductCheckoutResponse;
  onOpenProject?: (projectId: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const CheckoutSummary: React.FC<CheckoutSummaryProps> = ({ result, onOpenProject }) => {
  return (
    <div className="checkout-info">
      <p><strong>Produto:</strong> {result.product.name}</p>
      <p><strong>Preço original:</strong> {formatCurrency(result.amounts.original)}</p>
      <p><strong>Cupom aplicado:</strong> {result.coupon?.code || 'Nenhum'}</p>
      <p><strong>Desconto:</strong> {formatCurrency(result.amounts.discount)}</p>
      <p><strong>Total:</strong> {formatCurrency(result.amounts.final)}</p>
      <p><strong>Status do pedido:</strong> {result.order.status}</p>
      <p><strong>Método de pagamento:</strong> {result.order.payment_method}</p>
      {result.projectId && onOpenProject && (
        <button
          className="view-all-button"
          onClick={() => onOpenProject(result.projectId || '')}
        >
          Abrir projeto
        </button>
      )}
    </div>
  );
};

export default CheckoutSummary;
