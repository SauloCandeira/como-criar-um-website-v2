import React, { useState } from 'react';
import Section from '../ui/section';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import starBg from '../../assets/img/stars.png';

import eBookImg from './../../assets/img/e-book.png';
import videoImg from './../../assets/img/video.png';
import packageImg from './../../assets/img/package.png';

const PlatformAccess: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const accessPlans = [
    { id: 1, key: 'basic', image: eBookImg },
    { id: 2, key: 'intermediate', image: videoImg },
    { id: 3, key: 'advanced', image: packageImg }
  ];

  const handleAccess = (planId: number) => {
    setLoadingId(planId);
    setTimeout(() => {
      setLoadingId(null);
      navigate('/access-request');
    }, 800);
  };

  return (
    <Section
      id="platform-access"
      background={starBg}
      className="ticket-section bg-[#092554] text-white"
    >
      <div className="bottom-section-text mb-16 text-center">
        <h1 className="mb-6 text-4xl font-bold md:text-5xl drop-shadow-md text-white">{t('platform.title')}</h1>
        <p className="mx-auto max-w-3xl text-lg text-gray-200 md:text-xl leading-relaxed">{t('platform.description')}</p>
      </div>

      <div className="card-content grid gap-8 md:grid-cols-3">
        {accessPlans.map(plan => (
          <div key={plan.id} className="package flex h-full flex-col items-center rounded-xl bg-[#1f2933] p-8 shadow-2xl transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
            <img
              src={plan.image}
              alt={t(`platform.plans.${plan.key}.title`)}
              className="mb-6 h-[100px] w-auto object-contain drop-shadow-lg transition-transform hover:scale-110"
            />

            <h2 className="mb-4 text-center text-2xl font-bold text-white">{t(`platform.plans.${plan.key}.title`)}</h2>

            <p className="price mb-6 text-2xl font-bold text-[#38bdf8]">
              {t(`platform.plans.${plan.key}.price`)}
            </p>

            <ul className="feature-list mb-8 w-full flex-1 space-y-3 text-left">
              {Object.values(
                t(`platform.plans.${plan.key}.features`, {
                  returnObjects: true
                }) as string[]
              ).map((item, index) => (
                <li key={index} className="flex items-center text-[0.95rem] text-gray-300">
                  <span className="mr-2 text-emerald-400 font-bold">✔</span> {item}
                </li>
              ))}
            </ul>

            <button
              className="reserve-button mt-auto w-full rounded-lg bg-[#007bff] px-6 py-3.5 text-lg font-bold text-white transition-all hover:bg-[#0056b3] hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={loadingId === plan.id}
              onClick={() => handleAccess(plan.id)}
            >
              {loadingId === plan.id
                ? t('platform.loading')
                : t('platform.request')}
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
};

export default PlatformAccess;
