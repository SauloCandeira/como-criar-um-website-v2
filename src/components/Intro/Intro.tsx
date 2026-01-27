import React from 'react';
import Section from '../ui/section';
import mountainImg from '../../assets/img/mountain.png';
import { useTranslation } from 'react-i18next';

import starBg from '../../assets/img/stars.png';

const Intro: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Section
      id="intro"
      background={starBg}
      className="flex min-h-screen flex-col items-center justify-center pt-32 pb-20 text-center"
    >
      <div className="mx-auto flex h-full w-full flex-col items-center justify-center">
        <div className="z-10 mb-12 max-w-4xl">
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl text-white drop-shadow-lg">
            {t('intro.title')}
          </h1>
          <p className="text-2xl leading-relaxed text-gray-100 md:text-3xl drop-shadow-md">
            {t('intro.description')}
          </p>
        </div>

        {/* Decorative Image */}
        <div className="flex w-full justify-center">
          <img
            src={mountainImg}
            className="h-auto w-full max-w-[1000px] object-cover md:max-w-[1200px] opacity-90"
            alt="Mountain"
          />
        </div>
      </div>
    </Section>
  );
};

export default Intro;
