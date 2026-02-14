import React from 'react';

export type MenuChildConfig = {
  id: string;
  label: string;
  permissionFlag?: string;
};

export type MenuItemConfig = {
  id: string;
  label: string;
  adminOnly?: boolean;
  permissionFlag?: string;
  targetMenuId?: string;
  childId?: string;
};

export type MenuGroupConfig = {
  id: string;
  label: string;
  items: MenuItemConfig[];
};

type AdminSidebarMenuProps = {
  groups: MenuGroupConfig[];
  activeTab: string;
  activeChildByMenuId: Record<string, string | undefined>;
  expandedSectionIds: string[];
  onToggleSection: (sectionId: string) => void;
  onSelectMenu: (menuId: string, childId?: string) => void;
  isAdmin: boolean;
  hasPermission: (flag?: string) => boolean;
};

const IconGrid = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
);

const IconChart = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 19V5" />
    <path d="M4 19H20" />
    <path d="M8 15V9" />
    <path d="M12 15V7" />
    <path d="M16 15V11" />
  </svg>
);

const IconUsers = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3.3 2.7-6 6-6" />
    <circle cx="17" cy="10" r="3" />
    <path d="M14 20c0-2.2 1.8-4 4-4" />
  </svg>
);

const IconFolder = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);

const IconShield = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3l7 4v5c0 4.5-3.1 8.3-7 9-3.9-.7-7-4.5-7-9V7l7-4z" />
  </svg>
);

const IconMoney = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M7 9h0" />
    <path d="M17 15h0" />
  </svg>
);

const IconCog = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1l2-1.2-2-3.4-2.3.7a7 7 0 0 0-1.7-1l-.3-2.4h-4l-.3 2.4a7 7 0 0 0-1.7 1l-2.3-.7-2 3.4 2 1.2a7 7 0 0 0 0 2l-2 1.2 2 3.4 2.3-.7a7 7 0 0 0 1.7 1l.3 2.4h4l.3-2.4a7 7 0 0 0 1.7-1l2.3.7 2-3.4-2-1.2c.1-.3.1-.7.1-1z" />
  </svg>
);

const IconChevron = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

const iconMap: Record<string, JSX.Element> = {
  reports: IconChart,
  users: IconUsers,
  projects: IconFolder,
  products: IconGrid,
  'ai-reports': IconChart,
  overview: IconGrid,
  battles: IconChart,
  ecosystem: IconGrid,
  propostas: IconShield,
  votacoes: IconShield,
  tesouraria: IconMoney,
  membros: IconUsers,
  vendas: IconMoney,
  resgates: IconMoney,
  custos: IconMoney,
  templates: IconFolder,
  clonados: IconFolder,
  'admin-tools': IconCog,
  'ia-reports': IconChart,
  'ia-crons': IconCog,
  'ia-tasks': IconGrid,
  'ia-agents': IconUsers,
};

const getIcon = (id: string) => iconMap[id] ?? IconGrid;

const Sidebar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <nav className="admin-sidebar__nav" aria-label="Admin">
    {children}
  </nav>
);

const SidebarSection: React.FC<{
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isExpanded, onToggle, children }) => (
  <div className="admin-sidebar__section">
    <button
      type="button"
      className="admin-sidebar__section-toggle"
      onClick={onToggle}
      aria-expanded={isExpanded}
    >
      <span className="admin-sidebar__section-title">{title}</span>
      <span className={`admin-sidebar__section-chevron ${isExpanded ? 'open' : ''}`}>
        {IconChevron}
      </span>
    </button>
    <div className={`admin-sidebar__section-body ${isExpanded ? 'open' : ''}`}>
      <ul className="admin-sidebar__list">{children}</ul>
    </div>
  </div>
);

const SidebarItem: React.FC<{
  label: string;
  icon: JSX.Element;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <li className="admin-sidebar__item">
    <button
      type="button"
      className={`admin-sidebar__item-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="admin-sidebar__icon">{icon}</span>
      <span className="admin-sidebar__label">{label}</span>
    </button>
  </li>
);

const AdminSidebarMenu: React.FC<AdminSidebarMenuProps> = ({
  groups,
  activeTab,
  activeChildByMenuId,
  expandedSectionIds,
  onToggleSection,
  onSelectMenu,
  isAdmin,
  hasPermission,
}) => {
  return (
    <Sidebar>
      {groups.map((group) => (
        <SidebarSection
          key={group.id}
          title={group.label}
          isExpanded={expandedSectionIds.includes(group.id)}
          onToggle={() => onToggleSection(group.id)}
        >
          {group.items.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            if (!hasPermission(item.permissionFlag)) return null;
            const targetMenuId = item.targetMenuId ?? item.id;
            const activeChild = activeChildByMenuId[targetMenuId];
            const isActive = activeTab === targetMenuId && (!item.childId || activeChild === item.childId);

            return (
              <React.Fragment key={item.id}>
                <SidebarItem
                  label={item.label}
                  icon={getIcon(item.id)}
                  isActive={isActive}
                  onClick={() => onSelectMenu(targetMenuId, item.childId)}
                />
              </React.Fragment>
            );
          })}
        </SidebarSection>
      ))}
    </Sidebar>
  );
};

export default AdminSidebarMenu;
