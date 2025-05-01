import axios from 'axios';

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

interface Transaction {
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

interface CheckoutResponse {
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
  console.log('Iniciando o processo de obtenção do token de acesso...');
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
    
    console.log('Token de acesso obtido com sucesso:', response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao obter token de acesso:', (error as any).response?.data || error);
    return null;
  }
};

// Função para criar um link de pagamento
export const createCheckout = async (amount: number, currency: string, productName: string): Promise<CheckoutResponse | null> => {
  console.log('Iniciando a criação do checkout...');
  const accessToken = await getAccessToken();

  if (!accessToken) {
    console.error('Token de acesso não obtido. Não é possível criar o checkout.');
    return null;
  }

  try {
    console.log('Enviando requisição para criar checkout...');
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
    console.log('Resposta completa da API:', response.data);

    // Verificar se o campo status é 'PENDING'
    if (response.data.status !== 'PENDING') {
      console.log(`Status do pedido: ${response.data.status}`);
    }

    // Verificar transações
    response.data.transactions.forEach((transaction) => {
      console.log(`Transação ${transaction.id} - Status: ${transaction.status}, Montante: ${transaction.amount}`);
    });

    // Retornar dados do checkout
    return response.data;
  } catch (error) {
    console.error('Erro ao criar checkout:', (error as any).response?.data || error);
    return null;
  }
};

// Função para listar os checkouts
export const listCheckouts = async (): Promise<{ checkouts: CheckoutResponse[] } | null> => {
  console.log('Iniciando o processo para listar os checkouts...');
  const accessToken = await getAccessToken();

  if (!accessToken) {
    console.error('Token de acesso não obtido. Não é possível listar os checkouts.');
    return null;
  }

  try {
    console.log('Enviando requisição para listar checkouts...');
    const response = await axios.get<{ checkouts: CheckoutResponse[] }>(
      `${SUMUP_API_URL}/v0.1/checkouts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('Lista de checkouts recebida com sucesso:', response.data);
    return response.data;
  } catch (error) {
    console.error('Erro ao listar checkouts:', (error as any).response?.data || error);
    return null;
  }
};
