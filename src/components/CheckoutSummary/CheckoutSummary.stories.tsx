import type { Meta, StoryObj } from '@storybook/react';
import CheckoutSummary from './CheckoutSummary';

const meta: Meta<typeof CheckoutSummary> = {
  title: 'Checkout/CheckoutSummary',
  component: CheckoutSummary,
};

export default meta;

type Story = StoryObj<typeof CheckoutSummary>;

export const Default: Story = {
  args: {
    result: {
      order: { status: 'completed', payment_method: 'pix' },
      product: { id: 'prod-1', name: 'Página Web Institucional', description: 'Template profissional' },
      coupon: { code: 'AUTO10', discount: 10, autoApply: true },
      amounts: { original: 100, discount: 10, final: 90 },
      projectId: 'proj-1',
      purchaseId: 'purchase-1',
    },
  },
};
