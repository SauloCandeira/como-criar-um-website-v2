import React from 'react';
import Section from '../ui/section';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { useTranslation } from 'react-i18next';
import starBg from '../../assets/img/stars.png';

const Services: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Section background={starBg} className="bg-[#092554] text-white">
      <div className="text-center">
        <h1 className="mb-4 text-[2.6rem] font-bold leading-tight text-white md:text-5xl">
          {t('services.title')}
        </h1>
        <p className="mb-12 text-lg text-gray-300">
          Soluções completas para transformar ideias em realidade.
        </p>

        <Tabs className="w-full" selectedTabClassName="bg-blue-600 !text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105 border-blue-500">
          <TabList className="mb-12 flex flex-wrap justify-center gap-4 border-b-0 p-0">
            {['software', 'electronics', '3dPrototyping', 'education', 'business'].map((key) => (
              <Tab
                key={key}
                className="cursor-pointer rounded-full border border-gray-700 bg-[#1f2933] px-6 py-3 text-sm font-bold text-gray-400 transition-all duration-300 hover:bg-[#2a3a4d] hover:text-white focus:outline-none md:text-base"
              >
                {t(`services.tabs.${key}`)}
              </Tab>
            ))}
          </TabList>

          {/* SOFTWARE */}
          <TabPanel>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              <ServiceItem title={t('services.software.webDevelopment')} description={t('services.software.webDevelopmentDesc')} icon="💻" />
              <ServiceItem title={t('services.software.mobileDevelopment')} description={t('services.software.mobileDevelopmentDesc')} icon="📱" />
              <ServiceItem title={t('services.software.cloud')} description={t('services.software.cloudDesc')} icon="☁️" />
              <ServiceItem title={t('services.software.iot')} description={t('services.software.iotDesc')} icon="🌐" />
            </div>
          </TabPanel>

          {/* ELECTRONICS */}
          <TabPanel>
            <div className="grid gap-6 md:grid-cols-2">
              <ServiceItem title={t('services.electronics.vehicleMaintenance')} description={t('services.electronics.vehicleMaintenanceDesc')} icon="🔧" />
              <ServiceItem title={t('services.electronics.lithiumBatteryRecovery')} description={t('services.electronics.lithiumBatteryRecoveryDesc')} icon="🔋" />
            </div>
          </TabPanel>

          {/* PROTOTYPING */}
          <TabPanel>
            <div className="grid gap-6 md:grid-cols-2">
              <ServiceItem title={t('services.prototyping.drawing3d')} description={t('services.prototyping.drawing3dDesc')} icon="📐" />
              <ServiceItem title={t('services.prototyping.3dPrinting')} description={t('services.prototyping.3dPrintingDesc')} icon="🖨️" />
            </div>
          </TabPanel>

          {/* EDUCATION */}
          <TabPanel>
            <div className="grid gap-6 md:grid-cols-2">
              <ServiceItem title={t('services.education.lectures')} description={t('services.education.lecturesDesc')} icon="🎤" />
              <ServiceItem title={t('services.education.privateClasses')} description={t('services.education.privateClassesDesc')} icon="🎓" />
              <ServiceItem title={t('services.education.stem')} description={t('services.education.stemDesc')} icon="🔬" />
              <ServiceItem title={t('services.education.kits')} description={t('services.education.kitsDesc')} icon="📦" />
            </div>
          </TabPanel>

          {/* BUSINESS */}
          <TabPanel>
            <div className="grid gap-6 md:grid-cols-2">
              <ServiceItem title={t('services.business.businessPlan')} description={t('services.business.businessPlanDesc')} icon="📊" />
              <ServiceItem title={t('services.business.agileMethodology')} description={t('services.business.agileMethodologyDesc')} icon="🚀" />
              <ServiceItem title={t('services.business.managementSystem')} description={t('services.business.managementSystemDesc')} icon="💼" />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </Section>
  );
};

const ServiceItem = ({ title, description, icon }: { title: string; description: string; icon: string }) => (
  <div className="group flex flex-col items-start rounded-xl border border-gray-700 bg-[#1f2933] p-6 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-blue-500 hover:shadow-[0_10px_30px_rgba(59,130,246,0.15)]">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-2xl group-hover:bg-blue-500/20">
      {icon}
    </div>
    <h2 className="mb-2 text-xl font-bold text-white group-hover:text-blue-400">{title}</h2>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </div>
);

export default Services;
