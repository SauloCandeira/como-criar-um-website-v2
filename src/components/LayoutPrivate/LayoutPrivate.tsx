import React from 'react';
import HeaderTwo from '../Headers/header-two/HeaderTwo';
import Footer from '../Footer/Footer';
import Breadcrumble from '../Breadcrumble/Breadcrumble';
import './LayoutPrivate.css';

interface LayoutPrivateProps {
  children: React.ReactNode;
  crumbs?: string[];
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

const LayoutPrivate: React.FC<LayoutPrivateProps> = ({ children, crumbs, onToggleSidebar, sidebarCollapsed }) => {
  return (
    <div className="private-layout">
      <HeaderTwo onToggleSidebar={onToggleSidebar} sidebarCollapsed={sidebarCollapsed} />
      {crumbs && crumbs.length > 0 && <Breadcrumble crumbs={crumbs} />}
      <main className={`private-main ${crumbs && crumbs.length > 0 ? 'has-breadcrumb' : ''}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default LayoutPrivate;