import React from 'react';
import Section from '../ui/section';
import { useTranslation } from 'react-i18next';
import starBg from '../../assets/img/stars.png';

const AboutCard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Section
      id="about"
      background={starBg}
      className="bg-[#092554] text-white"
    >
      {/* Header */}
      <div className="mx-auto mb-20 max-w-[1000px] text-center">
        <h1 className="mb-6 text-5xl font-bold md:text-6xl drop-shadow-lg">{t('about.title')}</h1>
        <p className="text-xl text-blue-100 md:text-2xl font-light">
          {t('about.subtitle')}
        </p>
      </div>

      {/* Summary - Full Width */}
      <div className="mx-auto mb-24 max-w-[1100px] rounded-3xl bg-white/[0.1] p-12 shadow-2xl backdrop-blur-lg border border-white/10">
        <h2 className="mb-8 text-center text-4xl font-bold text-[#38bdf8]">
          {t('about.summary.title')}
        </h2>
        <p className="text-center text-xl leading-relaxed text-gray-100">
          {t('about.summary.description')}
        </p>
      </div>

      {/* Grid */}
      <div className="grid gap-8 md:grid-cols-3">
        {/* Mission */}
        <div className="flex h-full flex-col rounded-2xl bg-white/[0.06] p-8 shadow-xl backdrop-blur-sm transition-transform hover:-translate-y-2 hover:shadow-2xl">
          <h2 className="mb-4 text-center text-2xl font-bold text-[#38bdf8]">
            {t('about.mission.title')}
          </h2>
          <p className="flex-1 text-lg leading-relaxed text-[#e5e7eb]">
            {t('about.mission.description')}
          </p>
        </div>

        {/* Vision */}
        <div className="flex h-full flex-col rounded-2xl bg-white/[0.06] p-8 shadow-xl backdrop-blur-sm transition-transform hover:-translate-y-2 hover:shadow-2xl">
          <h2 className="mb-4 text-center text-2xl font-bold text-[#38bdf8]">
            {t('about.vision.title')}
          </h2>
          <p className="flex-1 text-lg leading-relaxed text-[#e5e7eb]">
            {t('about.vision.description')}
          </p>
        </div>

        {/* Values */}
        <div className="flex h-full flex-col rounded-2xl bg-white/[0.06] p-8 shadow-xl backdrop-blur-sm transition-transform hover:-translate-y-2 hover:shadow-2xl">
          <h2 className="mb-4 text-center text-2xl font-bold text-[#38bdf8]">
            {t('about.values.title')}
          </h2>
          <ul className="flex-1 list-inside list-disc space-y-3 text-lg text-[#e5e7eb]">
            <li>{t('about.values.items.courage')}</li>
            <li>{t('about.values.items.democracy')}</li>
            <li>{t('about.values.items.truth')}</li>
            <li>{t('about.values.items.efficiency')}</li>
          </ul>
        </div>
      </div>
    </Section>
  );
};

export default AboutCard;
