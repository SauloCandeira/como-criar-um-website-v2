import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import Manager from './Manager';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    localStorage.setItem('email', 'user@hktech.com');
    localStorage.setItem('permissionLevel', 'A');
  }, []);
  return <MemoryRouter>{children}</MemoryRouter>;
};

const meta: Meta<typeof Manager> = {
  title: 'Project/ProjectManager',
  component: Manager,
  decorators: [(Story) => (
    <Wrapper>
      <Story />
    </Wrapper>
  )],
  parameters: {
    docs: {
      description: {
        component: 'Tela completa do Project Manager. Requer APIs ativas para dados reais.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Manager>;

export const Default: Story = {};
