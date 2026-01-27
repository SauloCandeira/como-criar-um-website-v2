import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Product.css';

const Product: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutData = useMemo(() => location.state?.checkoutData || {}, [location.state]);

  useEffect(() => {
    console.log('Dados recebidos no Checkout:', checkoutData);
  }, [checkoutData]);

  const handleEnroll = () => {
    const transaction = {
      amount: 149.90,
      auth_code: '987654',
      currency: 'BRL',
      entry_mode: 'CUSTOMER_ENTRY',
      id: 'trn-' + Math.random().toString(36).substr(2, 9),
      installments_count: 1,
      internal_id: 0,
      merchant_code: 'MH4H92C7',
      payment_type: 'ECOM',
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      tip_amount: 0,
      transaction_code: 'TXN' + Math.random().toString(36).substr(2, 6),
      vat_amount: 0
    };

    const contract = {
      buyer: checkoutData.contract?.buyer || {
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '+55 11 99999-9999'
      },
      seller: checkoutData.contract?.seller || {
        name: 'Curso Web Ltda',
        email: 'contato@cursoweb.com',
        cnpj: '12.345.678/0001-99'
      },
      transaction
    };

    navigate('/checkout', {
      state: {
        checkoutData: {
          ...checkoutData,
          contract
        },
      },
    });
  };

  return (
    <div className="product-container">
      <section className="product-content">
        <h2>O que você vai aprender?</h2>
        <ul className="course-plan">
          <li><strong>Módulo 1:</strong> Introdução ao Desenvolvimento Web</li>
          <li><strong>Módulo 2:</strong> HTML e CSS do Zero ao Avançado</li>
          <li><strong>Módulo 3:</strong> JavaScript e Interatividade</li>
          <li><strong>Módulo 4:</strong> Publicação e Hospedagem do Site</li>
        </ul>

        <h2>Por que fazer este curso?</h2>
        <div className="benefits">
          <div className="benefit-item">
            <img src="https://via.placeholder.com/80" alt="Ícone de aprendizado" />
            <p>Aprendizado 100% prático</p>
          </div>
          <div className="benefit-item">
            <img src="https://via.placeholder.com/80" alt="Ícone de suporte" />
            <p>Suporte e comunidade ativa</p>
          </div>
          <div className="benefit-item">
            <img src="https://via.placeholder.com/80" alt="Ícone de certificado" />
            <p>Certificado de conclusão</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Invista no seu futuro!</h2>
        <p className="price">Por apenas <strong>R$ 149,90</strong></p>
        <button onClick={handleEnroll} className="enroll-button">Inscreva-se Agora</button>
      </section>
    </div>
  );
};

export default Product;
