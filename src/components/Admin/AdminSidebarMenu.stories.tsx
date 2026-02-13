import type { Meta, StoryObj } from '@storybook/react';
import AdminSidebarMenu, { MenuGroupConfig } from './AdminSidebarMenu';

const groups: MenuGroupConfig[] = [
  {
    id: 'monitoramento',
    label: 'Monitoramento',
    items: [
      { id: 'monitoramento-sonar', label: 'SonarCloud' },
      { id: 'monitoramento-coverage', label: 'Test Coverage' },
      { id: 'monitoramento-ci', label: 'CI Status' },
    ],
  },
  {
    id: 'documentacao',
    label: 'Documentação',
    items: [
      { id: 'documentacao-api', label: 'API (Swagger)' },
      { id: 'documentacao-ui', label: 'UI (Storybook)' },
    ],
  },
];

const meta: Meta<typeof AdminSidebarMenu> = {
  title: 'Admin/AdminSidebarMenu',
  component: AdminSidebarMenu,
};

export default meta;

type Story = StoryObj<typeof AdminSidebarMenu>;

export const Default: Story = {
  args: {
    groups,
    activeTab: 'monitoramento-sonar',
    activeChildByMenuId: { monitoramento: 'monitoramento-sonar' },
    expandedSectionIds: ['monitoramento', 'documentacao'],
    onToggleSection: () => {},
    onSelectMenu: () => {},
    isAdmin: true,
    hasPermission: () => true,
  },
};
