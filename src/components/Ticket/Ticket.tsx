import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  // Importando useNavigate
import { useTranslation } from 'react-i18next';
import { createCheckout, listCheckouts, CheckoutResponse } from '../../services/sumupService';
import { Product } from '../../Interfaces/InterfaceProduct';
import eBookImg from './../../assets/img/e-book.png';
import videoImg from './../../assets/img/video.png';
import packageImg from './../../assets/img/package.png';
import './Ticket.css';

const Ticket: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null);
  const [pendingCheckouts, setPendingCheckouts] = useState<CheckoutResponse[]>([]);
  const navigate = useNavigate();  // Inicializando o hook useNavigate

  const products: Product[] = [
    {
      id: 1,
      name: 'Basico',
      price: 0.00,
      description: t('ticket.eBookDescription'),
      image: eBookImg,
      link: '#',
    },
    {
      id: 2,
      name: 'Intermediario',
      price: 49.90,
      description: t('ticket.videoDescription'),
      image: videoImg,
      link: '#',
    },
    {
      id: 3,
      name: 'Avancado',
      price: 79.90,
      description: t('ticket.completePackageDescription'),
      image: packageImg,
      link: '#',
    },
  ];

  const loadCheckouts = async () => {
    console.log('Carregando checkouts...');
    try {
      const response = await listCheckouts();
      console.log('Resposta da API de checkouts:', response);
      if (response && response.checkouts) {
        const pending = response.checkouts.filter((checkout: CheckoutResponse) => checkout.status === 'PENDING');
        console.log('Checkouts pendentes:', pending);
        setPendingCheckouts(pending);
      }
    } catch (error) {
      console.error('Erro ao carregar checkouts:', error);
    }
  };

  useEffect(() => {
    loadCheckouts();
  }, []);

  const getCurrencySymbol = () => (i18n.language === 'pt' ? 'R$' : '$');

  const handleReserve = async (product: Product) => {
    console.log(`Iniciando reserva para o produto: ${product.name}`);
    setLoadingProductId(product.id);

    try {
      const paymentLink = await createCheckout(product.price, 'BRL', product.name);
      console.log('Link de pagamento gerado:', paymentLink);

      setLoadingProductId(null);

      if (paymentLink) {
        // Redireciona para a página de checkout, passando os dados via state
        navigate('/product', { state: { checkoutData: paymentLink } });
      } else {
        alert('Erro ao gerar o link de pagamento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao criar o checkout:', error);
      setLoadingProductId(null);
    }
  };

  return (
    <div id="embarque" className="ticket-section">
      <div className="bottom-section-text">
        <h1 className="text-5xl font-bold mb-4">{t('ticket.title')}</h1>
        <p className="text-xl">{t('ticket.description')}</p>
      </div>

      <div className="pending-checkouts">
        <h2 className="text-3xl font-bold mb-4">{t('ticket.pendingCheckoutsTitle')}</h2>
        {pendingCheckouts.length > 0 ? (
          <div className="checkouts-list">
            {pendingCheckouts.map((checkout: CheckoutResponse) => (
              <div key={checkout.checkout_reference} className="checkout-item">
                <p>{t('ticket.checkoutReference')}: {checkout.checkout_reference}</p>
                <p>{t('ticket.checkoutAmount')}: {checkout.currency} {checkout.amount}</p>
                <p>{t('ticket.checkoutDescription')}: {checkout.description}</p>
                <p>{t('ticket.checkoutDate')}: {new Date(checkout.date).toLocaleString()}</p>
                <p>{t('ticket.checkoutStatus')}: {checkout.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>{t('ticket.noPendingCheckouts')}</p>
        )}
      </div>

      <div className="container">
        <div className="card-content">
          {products.map((product) => (
            <div key={product.id} className="package">
              <img src={product.image} alt={product.name} className="w-32 mx-auto mb-4" />
              <h2 className="text-3xl font-semibold mb-2 text-white">{product.name}</h2>

              <p className="text-lg mb-4">{product.description}</p>
              <p className="text-2xl font-bold mb-6">
                {getCurrencySymbol()} {product.price.toFixed(2)}
              </p>
              <button
                className="reserve-button"
                onClick={() => handleReserve(product)}
                disabled={loadingProductId === product.id}
              >
                {loadingProductId === product.id ? t('ticket.loading') : t('ticket.reserveNow')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ticket;
