import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import MarketPlaceCard from './MarketPlaceCard';

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Página Web Institucional',
    description: 'Template profissional para empresas.',
    price: '100',
    salePrice: '90',
    finalPrice: 90,
    showOnMarketplace: true,
    productType: 'digital',
  },
];

const mockPurchases = [];

const MockWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    localStorage.setItem('email', 'user@hktech.com');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/products')) {
        return new Response(JSON.stringify(mockProducts), { status: 200 });
      }
      if (url.includes('/purchases')) {
        return new Response(JSON.stringify(mockPurchases), { status: 200 });
      }
      return originalFetch(input);
    };
    return () => {
      globalThis.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
};

const meta: Meta<typeof MarketPlaceCard> = {
  title: 'Marketplace/MarketPlaceCard',
  component: MarketPlaceCard,
  decorators: [(Story) => (
    <MockWrapper>
      <Story />
    </MockWrapper>
  )],
};

export default meta;

type Story = StoryObj<typeof MarketPlaceCard>;

export const Default: Story = {};
