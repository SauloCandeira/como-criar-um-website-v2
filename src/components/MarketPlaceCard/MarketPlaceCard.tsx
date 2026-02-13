import './MarketPlaceCard.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPurchases, PurchaseDTO } from '../../services/purchasesApi';
import { fetchProducts, ProductDTO } from '../../services/productsApi';
import { logger } from '../../lib/logger';

const MarketPlaceCard = () => {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<PurchaseDTO[]>([]);

  const navigate = useNavigate();

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

  useEffect(() => {
    if (!userId) return;
    const loadPurchases = async () => {
      try {
        const data = await fetchPurchases(userId);
        setPurchases(data);
      } catch (err) {
        logger.error('Erro ao carregar compras/resgates', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    };
    loadPurchases();
    const handler = () => loadPurchases();
    window.addEventListener('marketplace:purchase', handler);
    return () => window.removeEventListener('marketplace:purchase', handler);
  }, [userId]);

  const formatCurrency = (value: string | number) => {
    const raw = typeof value === 'number' ? value : Number(String(value || '0').replace(',', '.')) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(raw);
  };

  const handlePurchase = async (product: ProductDTO) => {
    if (!userId) {
      setFeedback('Faça login para concluir a compra.');
      return;
    }
    const existing = latestPurchasesByProduct.get(product.id);
    if (existing) {
      if (existing.projectId) {
        navigate(`/manager?projectId=${encodeURIComponent(existing.projectId)}`);
      }
      return;
    }
    navigate('/checkout', {
      state: {
        checkoutData: {
          productId: product.id,
          productName: product.name,
        },
      },
    });
  };

  const sortedProducts = useMemo(() => products.filter((product) => product.showOnMarketplace), [products]);
  const latestPurchasesByProduct = useMemo(() => {
    return purchases.reduce<Map<string, PurchaseDTO>>((map, purchase) => {
      const existing = map.get(purchase.productId);
      if (!existing) {
        map.set(purchase.productId, purchase);
        return map;
      }
      const existingDate = new Date(existing.createdAt || 0).getTime();
      const currentDate = new Date(purchase.createdAt || 0).getTime();
      if (currentDate >= existingDate) {
        map.set(purchase.productId, purchase);
      }
      return map;
    }, new Map());
  }, [purchases]);

  const typeLabel = (type?: string) => {
    if (type === 'servico') return 'Serviço';
    if (type === 'fisico') return 'Produto físico';
    if (type === 'assinatura') return 'Assinatura';
    if (type === 'projeto') return 'Projeto';
    return 'Produto digital';
  };

  return (
    <div className="marketplace-container">
      <div className="products-container">
        {loading && <p>Carregando produtos...</p>}
        {error && <p>{error}</p>}
        {feedback && <p className="marketplace-feedback">{feedback}</p>}
        {!loading && sortedProducts.length === 0 && <p>Nenhum produto disponível no marketplace.</p>}
        {sortedProducts.map((product) => {
          const rawPrice = Number(String(product.salePrice || product.price || '0').replace(',', '.')) || 0;
          const finalPrice = Number(product.finalPrice ?? rawPrice) || 0;
          const isFree = finalPrice <= 0;
          const purchase = latestPurchasesByProduct.get(product.id);
          const hasProject = Boolean(purchase?.projectId);
          const isRedeemed = Boolean(purchase) && (purchase?.purchaseType || '').toLowerCase() === 'free';
          const isPurchased = Boolean(purchase) && (purchase?.purchaseType || '').toLowerCase() !== 'free';
          const actionLabel = hasProject ? 'Ir para projeto' : isFree ? 'Resgatado' : 'Comprado';
          const showStatus = Boolean(purchase);
          const statusLabel = isRedeemed ? 'Resgatado' : isPurchased ? 'Comprado' : '';

          return (
            <div className="marketplace-card" key={product.id}>
              <div className="marketplace-image" aria-hidden="true">
                <span>🛰️</span>
              </div>
              <div className="marketplace-info">
                <span className={`marketplace-badge ${product.productType || 'digital'}`}>
                  {typeLabel(product.productType)}
                </span>
                <h3>{product.name}</h3>
                <p className="marketplace-description">{product.description || 'Produto pronto para entrega imediata.'}</p>
                <div className="marketplace-price">
                  <span className="marketplace-price-original">{formatCurrency(product.price)}</span>
                  <span className="marketplace-price-sale">{formatCurrency(finalPrice)}</span>
                </div>
                {showStatus && (
                  <div className="marketplace-status">
                    <span>{statusLabel}</span>
                  </div>
                )}
                <button
                  className="marketplace-action-btn"
                  onClick={() => handlePurchase(product)}
                  disabled={Boolean(purchase) && !hasProject}
                >
                  {purchase ? actionLabel : isFree ? 'Resgatar' : 'Comprar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketPlaceCard;
