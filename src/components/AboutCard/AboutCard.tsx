// src/components/About/AboutCard.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import './AboutCard.css';

const AboutCard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="about-section">
      {/* Header */}
      <div className="about-header">
        <h1>{t('about.title')}</h1>
        <p>{t('about.subtitle')}</p>
      </div>

      {/* Summary - Full Width */}
      <div className="about-summary">
        <h2>{t('about.summary.title')}</h2>
        <p>{t('about.summary.description')}</p>
      </div>

      {/* Grid */}
      <div className="about-grid">
        <div className="about-box">
          <h2>{t('about.mission.title')}</h2>
          <p>{t('about.mission.description')}</p>
        </div>

        <div className="about-box">
          <h2>{t('about.vision.title')}</h2>
          <p>{t('about.vision.description')}</p>
        </div>

        <div className="about-box">
          <h2>{t('about.values.title')}</h2>
          <ul>
            <li>{t('about.values.items.courage')}</li>
            <li>{t('about.values.items.democracy')}</li>
            <li>{t('about.values.items.truth')}</li>
            <li>{t('about.values.items.efficiency')}</li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default AboutCard;
