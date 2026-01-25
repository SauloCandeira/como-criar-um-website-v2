// src/components/Services/Services.tsx

import React from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './Services.css';
import { useTranslation } from 'react-i18next';

const Services: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="services-background">
      <div className="services-container">
        <h1 className="services-title">{t('services.title')}</h1>

        <Tabs>
          <TabList className="react-tabs__tab-list">
            <Tab className="react-tabs__tab">{t('services.tabs.software')}</Tab>
            <Tab className="react-tabs__tab">{t('services.tabs.electronics')}</Tab>
            <Tab className="react-tabs__tab">{t('services.tabs.3dPrototyping')}</Tab>
            <Tab className="react-tabs__tab">{t('services.tabs.education')}</Tab>
            <Tab className="react-tabs__tab">{t('services.tabs.business')}</Tab>
          </TabList>

          {/* SOFTWARE */}
          <TabPanel>
            <div className="service-category">
              <div className="service-item">
                <h2>{t('services.software.webDevelopment')}</h2>
                <p>{t('services.software.webDevelopmentDesc')}</p>
              </div>
              <div className="service-item">
                <h2>{t('services.software.mobileDevelopment')}</h2>
                <p>{t('services.software.mobileDevelopmentDesc')}</p>
              </div>
              <div className="service-item">
                <h2>{t('services.software.cloud')}</h2>
                <p>{t('services.software.cloudDesc')}</p>
              </div>
              <div className="service-item">
                <h2>{t('services.software.iot')}</h2>
                <p>{t('services.software.iotDesc')}</p>
              </div>
            </div>
          </TabPanel>

          {/* ELETRÔNICA */}
          <TabPanel>
            <div className="service-category">
              <div className="service-item">
                <h2>{t('services.electronics.vehicleMaintenance')}</h2>
                <p>{t('services.electronics.vehicleMaintenanceDesc')}</p>
              </div>
              <div className="service-item">
                <h2>{t('services.electronics.lithiumBatteryRecovery')}</h2>
                <p>{t('services.electronics.lithiumBatteryRecoveryDesc')}</p>
              </div>
            </div>
          </TabPanel>

          {/* PROTOTIPAGEM */}
          <TabPanel>
            <div className="service-category">
              <div className="service-item">
                <h2>{t('services.prototyping.drawing3d')}</h2>
                <p>{t('services.prototyping.drawing3dDesc')}</p>
              </div>
              <div className="service-item">
                <h2>{t('services.prototyping.3dPrinting')}</h2>
                <p>{t('services.prototyping.3dPrintingDesc')}</p>
              </div>
            </div>
          </TabPanel>

          {/* EDUCAÇÃO */}
          <TabPanel>
            <div className="service-category">
              <div className="service-item">
                <h2>{t('services.education.lectures')}</h2>
                <p>{t('services.education.lecturesDesc')}</p>
              </div>

              <div className="service-item">
                <h2>{t('services.education.privateClasses')}</h2>
                <p>{t('services.education.privateClassesDesc')}</p>
              </div>

              <div className="service-item">
                <h2>{t('services.education.stem')}</h2>
                <p>{t('services.education.stemDesc')}</p>
              </div>

              <div className="service-item">
                <h2>{t('services.education.kits')}</h2>
                <p>{t('services.education.kitsDesc')}</p>
              </div>
            </div>
          </TabPanel>

          {/* NEGÓCIOS */}
          <TabPanel>
            <div className="service-category">
              <div className="service-item">
                <h2>{t('services.business.businessPlan')}</h2>
                <p>{t('services.business.businessPlanDesc')}</p>
              </div>
              <div className="service-item">
                <h2>{t('services.business.agileMethodology')}</h2>
                <p>{t('services.business.agileMethodologyDesc')}</p>
              </div>
              <div className="service-item">
                <h2>{t('services.business.managementSystem')}</h2>
                <p>{t('services.business.managementSystemDesc')}</p>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default Services;
