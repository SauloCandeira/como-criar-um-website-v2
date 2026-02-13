import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import './Product.css';
import { logger } from '../../lib/logger';

const Transaction: React.FC = () => {
  const navigate = useNavigate();

    const location = useLocation();
    const checkoutData = location.state?.checkoutData; // Captura os dados enviados pelo navigate
  
    useEffect(() => {
      logger.info('Dados recebidos no Checkout', { checkoutData });
    }, [checkoutData]);

  const handleEnroll = () => {
    navigate('/checkout', {
      state: {
        checkoutData: {
          courseName: 'Como Criar um Website Profissional',
          price: '149.90',
          paymentMethods: ['Cartão de Crédito', 'Pix', 'Boleto', 'PayPal'],
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

export default Transaction;
