import type { Meta, StoryObj } from '@storybook/react';
import CodeRunner from './CodeRunner';

const meta: Meta<typeof CodeRunner> = {
  title: 'IDE/IDEEditor',
  component: CodeRunner,
};

export default meta;

type Story = StoryObj<typeof CodeRunner>;

export const Default: Story = {
  args: {
    projectId: 'project-demo',
  },
};
