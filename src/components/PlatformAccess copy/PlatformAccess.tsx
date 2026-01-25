import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import eBookImg from './../../assets/img/e-book.png';
import videoImg from './../../assets/img/video.png';
import packageImg from './../../assets/img/package.png';
import './PlatformAccess.css';

const PlatformAccess: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const accessPlans = [
    {
      id: 1,
      key: 'basic',
      image: eBookImg,
      free: true
    },
    {
      id: 2,
      key: 'intermediate',
      image: videoImg,
      free: false
    },
    {
      id: 3,
      key: 'advanced',
      image: packageImg,
      free: false
    }
  ];

  const handleAccess = (planId: number) => {
    setLoadingId(planId);

    // fluxo provisório — futuro: backend / sumup / permissões
    setTimeout(() => {
      setLoadingId(null);
      navigate('/access-request');
    }, 800);
  };

  return (
    <section id="platform-access" className="ticket-section">
      <div className="bottom-section-text">
        <h1 className="text-5xl font-bold mb-4">
          {t('platform.title')}
        </h1>

        <p className="text-xl max-w-4xl mx-auto">
          {t('platform.description')}
        </p>
      </div>

      <div className="container">
        <div className="card-content">
          {accessPlans.map((plan) => (
            <div key={plan.id} className="package">
              <img
                src={plan.image}
                alt={t(`platform.plans.${plan.key}.title`)}
                className="w-28 mx-auto mb-6 opacity-90"
              />

              <h2 className="text-2xl font-semibold mb-3 text-white text-center">
                {t(`platform.plans.${plan.key}.title`)}
              </h2>

              <p className="text-gray-300 text-center mb-6 leading-relaxed">
                {t(`platform.plans.${plan.key}.description`)}
              </p>

              <p className="text-lg font-bold text-center mb-6">
                {plan.free ? t('platform.free') : t('platform.purchase')}
              </p>

              <button
                className="reserve-button"
                disabled={loadingId === plan.id}
                onClick={() => handleAccess(plan.id)}
              >
                {loadingId === plan.id
                  ? t('platform.loading')
                  : plan.free
                  ? t('platform.request')
                  : t('platform.purchase')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformAccess;
