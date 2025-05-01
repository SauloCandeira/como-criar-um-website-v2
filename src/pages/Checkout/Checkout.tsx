import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Checkout.css';

const Checkout: React.FC = () => {
  const location = useLocation();
  const checkoutData = location.state?.checkoutData; // Captura os dados enviados pelo navigate

  useEffect(() => {
    console.log('Dados recebidos no Checkout:', checkoutData);
  }, [checkoutData]);

  return (
    <div className="checkout-container">
      <h2>Finalizar Compra</h2>
      
      {checkoutData ? (
        <div className="checkout-info">
          <p><strong>ID da Transação:</strong> {checkoutData.transactionId}</p>
          <p><strong>Valor:</strong> R$ {checkoutData.amount}</p>
          <p><strong>Método de Pagamento:</strong> {checkoutData.paymentMethod}</p>
          {checkoutData.paymentMethod === 'pix' && (
            <div className="pix-info">
              <p><strong>Chave Pix:</strong> {checkoutData.pixKey}</p>
              <img src={checkoutData.qrCodeUrl} alt="QR Code Pix" />
            </div>
          )}
        </div>
      ) : (
        <p>Não há dados de checkout disponíveis.</p>
      )}
    </div>
  );
};

export default Checkout;
