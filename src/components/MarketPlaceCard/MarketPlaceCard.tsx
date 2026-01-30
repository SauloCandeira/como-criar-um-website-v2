import './MarketPlaceCard.css';
import { useEffect, useMemo, useState } from 'react';
import { createPurchase } from '../../services/purchasesApi';
import { fetchProducts, ProductDTO } from '../../services/productsApi';

const MarketPlaceCard = () => {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const userId = (localStorage.getItem('email') || '').toLowerCase();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar produtos.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatCurrency = (value: string | number) => {
    const raw = typeof value === 'number' ? value : Number(String(value || '0').replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(raw);
  };

  const handlePurchase = async (productId: string) => {
    if (!userId) {
      setFeedback('Faça login para concluir a compra.');
      return;
    }
    setPurchaseLoadingId(productId);
    setFeedback(null);
    try {
      await createPurchase({ userId, productId });
      setFeedback('Compra registrada! Seu projeto já está disponível no dashboard.');
      window.dispatchEvent(new Event('marketplace:purchase'));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Falha ao registrar compra.');
    } finally {
      setPurchaseLoadingId(null);
    }
  };

  const sortedProducts = useMemo(() => products, [products]);

  return (
    <div className="marketplace-container">
      <div className="products-container">
        {loading && <p>Carregando produtos...</p>}
        {error && <p>{error}</p>}
        {feedback && <p className="marketplace-feedback">{feedback}</p>}
        {!loading && sortedProducts.length === 0 && <p>Nenhum produto disponível.</p>}
        {sortedProducts.map((product) => (
          <div className="product-card" key={product.id}>
            <div className="product-image" aria-hidden="true">
              <span>🛰️</span>
            </div>
            <div className="product-info">
              <h3>{product.name}</h3>
              <p className="product-description">{product.description || 'Produto pronto para entrega imediata.'}</p>
              <div className="product-price">
                <span className="price-original">{formatCurrency(product.price)}</span>
                <span className="price-sale">{formatCurrency(product.salePrice || product.price)}</span>
              </div>
              <button
                className="view-product-btn"
                onClick={() => handlePurchase(product.id)}
                disabled={purchaseLoadingId === product.id}
              >
                {purchaseLoadingId === product.id ? 'Processando...' : 'Comprar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketPlaceCard;
