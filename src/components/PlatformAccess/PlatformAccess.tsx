// src/components/PlatformAccess/PlatformAccess.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import eBookImg from './../../assets/img/e-book.png';
import videoImg from './../../assets/img/video.png';
import packageImg from './../../assets/img/package.png';
import './PlatformAccess.css';

const PlatformAccess: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const accessPlans = [
    { id: 1, key: 'basic', image: eBookImg, route: '/signup' },
    { id: 2, key: 'intermediate', image: videoImg, route: '/access-request' },
    { id: 3, key: 'advanced', image: packageImg, route: '/access-request' }
  ];

  const handleAccess = (planId: number, route: string) => {
    setLoadingId(planId);
    setTimeout(() => {
      setLoadingId(null);
      navigate(route);
    }, 800);
  };

  return (
    <section id="platform-access" className="ticket-section">
      <div className="bottom-section-text">
        <h1>{t('platform.title')}</h1>
        <p>{t('platform.description')}</p>
      </div>

      <div className="container">
        <div className="card-content">
          {accessPlans.map(plan => (
            <div key={plan.id} className="package">
              <img
                src={plan.image}
                alt={t(`platform.plans.${plan.key}.title`)}
              />

              <h2>{t(`platform.plans.${plan.key}.title`)}</h2>

              <p className="price">
                {t(`platform.plans.${plan.key}.price`)}
              </p>

              <ul className="feature-list">
                {Object.values(
                  t(`platform.plans.${plan.key}.features`, {
                    returnObjects: true
                  }) as string[]
                ).map((item, index) => (
                  <li key={index}>✔ {item}</li>
                ))}
              </ul>

              <button
                className="reserve-button"
                disabled={loadingId === plan.id}
                onClick={() => handleAccess(plan.id, plan.route)}
              >
                {loadingId === plan.id
                  ? t('platform.loading')
                  : (t(`platform.plans.${plan.key}.cta`, { defaultValue: t('platform.request') }) as string)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformAccess;
