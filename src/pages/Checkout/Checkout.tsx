import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createProductCheckout, type ProductCheckoutResponse } from '../../services/checkoutApi';
import CheckoutSummary from '../../components/CheckoutSummary/CheckoutSummary';
import './Checkout.css';

const Checkout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const checkoutData = location.state?.checkoutData; // Captura os dados enviados pelo navigate
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductCheckoutResponse | null>(null);

  const userId = (localStorage.getItem('email') || '').toLowerCase();
  const productId = String(checkoutData?.productId || '');

  useEffect(() => {
    if (!productId || !userId) return;
    const runCheckout = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await createProductCheckout({ productId, userId });
        setResult(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao concluir checkout.');
      } finally {
        setLoading(false);
      }
    };
    runCheckout();
  }, [productId, userId]);

  return (
    <div className="checkout-container">
      <h2>Finalizar Compra</h2>

      {!checkoutData && <p>Não há dados de checkout disponíveis.</p>}
      {checkoutData && !userId && <p>Faça login para concluir o checkout.</p>}

      {loading && <p>Processando seu pedido...</p>}
      {error && <p>{error}</p>}

      {result && (
        <CheckoutSummary
          result={result}
          onOpenProject={(projectId) => navigate(`/manager?projectId=${encodeURIComponent(projectId)}`)}
        />
      )}
    </div>
  );
};

export default Checkout;
