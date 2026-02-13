import axios, { AxiosError } from 'axios';
import { logger } from '../lib/logger';

// Configurações da API SumUp
const CLIENT_ID = 'cc_classic_4v9jN2dj5Xh2WhECrQydPM9tpnW1C'; // Novo CLIENT_ID
const CLIENT_SECRET = 'cc_sk_classic_IiDDD3JUlpbGPyID2kWfQaWvQpqub0NkjunhBoyuaZ6GYZyDVj'; // Novo CLIENT_SECRET
const SUMUP_API_URL = 'https://api.sumup.com';
const REDIRECT_URI = 'http://localhost:5173/como-criar-um-website-v2/'; // Novo REDIRECT_URI
const PAY_TO_EMAIL = 'd347388c53614d04a30814439cc80c48@developer.sumup.com'; // Substitua pelo e-mail real

interface AccessTokenResponse {
  access_token: string;
}

interface Mandate {
  merchant_code: string;
  status: string;
  type: string;
}

export interface Transaction {
  amount: number;
  auth_code: string;
  currency: string;
  entry_mode: string;
  id: string;
  installments_count: number;
  internal_id: number;
  merchant_code: string;
  payment_type: string;
  status: string;
  timestamp: string;
  tip_amount: number;
  transaction_code: string;
  vat_amount: number;
}

export interface CheckoutResponse {
  amount: number;
  checkout_reference: string;
  currency: string;
  customer_id: string;
  date: string;
  description: string;
  id: string;
  mandate: Mandate;
  merchant_code: string;
  merchant_country: string;
  pay_to_email: string;
  return_url: string;
  status: string;
  transactions: Transaction[];
  valid_until: string;
}

// Função para obter o token de acesso OAuth2
export const getAccessToken = async (): Promise<string | null> => {
  logger.info('Iniciando o processo de obtenção do token de acesso');
  try {
    const response = await axios.post<AccessTokenResponse>(
      `${SUMUP_API_URL}/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    logger.info('Token de acesso obtido com sucesso');
    return response.data.access_token;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    logger.error('Erro ao obter token de acesso', {
      message: axiosError.response?.data || (error instanceof Error ? error.message : String(error)),
    });
    return null;
  }
};

// Função para criar um link de pagamento
export const createCheckout = async (amount: number, currency: string, productName: string): Promise<CheckoutResponse | null> => {
  logger.info('Iniciando a criação do checkout', { amount, currency, productName });
  const accessToken = await getAccessToken();

  if (!accessToken) {
    logger.error('Token de acesso não obtido. Não é possível criar o checkout.');
    return null;
  }

  try {
    logger.info('Enviando requisição para criar checkout');
    const response = await axios.post<CheckoutResponse>(
      `${SUMUP_API_URL}/v0.1/checkouts`,
      {
        amount,
        currency,
        checkout_reference: `pedido-${Date.now()}`,
        description: productName,
        return_url: REDIRECT_URI,
        pay_to_email: PAY_TO_EMAIL, // Adicionando o e-mail da conta SumUp
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Logar resposta completa
    logger.info('Resposta completa da API recebida');

    // Verificar se o campo status é 'PENDING'
    if (response.data.status !== 'PENDING') {
      logger.info('Status do pedido', { status: response.data.status });
    }

    // Verificar transações
    response.data.transactions.forEach((transaction) => {
      logger.info('Transação registrada', {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
      });
    });

    // Retornar dados do checkout
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    logger.error('Erro ao criar checkout', {
      message: axiosError.response?.data || (error instanceof Error ? error.message : String(error)),
    });
    return null;
  }
};

// Função para listar os checkouts
export const listCheckouts = async (): Promise<{ checkouts: CheckoutResponse[] } | null> => {
  logger.info('Iniciando o processo para listar os checkouts');
  const accessToken = await getAccessToken();

  if (!accessToken) {
    logger.error('Token de acesso não obtido. Não é possível listar os checkouts.');
    return null;
  }

  try {
    logger.info('Enviando requisição para listar checkouts');
    const response = await axios.get<{ checkouts: CheckoutResponse[] }>(
      `${SUMUP_API_URL}/v0.1/checkouts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    logger.info('Lista de checkouts recebida com sucesso', { total: response.data.checkouts?.length ?? 0 });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    logger.error('Erro ao listar checkouts', {
      message: axiosError.response?.data || (error instanceof Error ? error.message : String(error)),
    });
    return null;
  }
};
