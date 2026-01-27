import React from 'react';
import HeaderTwo from '../Headers/header-two/HeaderTwo';
import Footer from '../Footer/Footer';
import Breadcrumble from '../Breadcrumble/Breadcrumble';
import './LayoutPrivate.css';

interface LayoutPrivateProps {
  children: React.ReactNode;
  crumbs?: string[];
}

const LayoutPrivate: React.FC<LayoutPrivateProps> = ({ children, crumbs }) => {
  return (
    <div className="private-layout">
      <HeaderTwo />
      {crumbs && crumbs.length > 0 && <Breadcrumble crumbs={crumbs} />}
      <main className="private-main">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default LayoutPrivate;