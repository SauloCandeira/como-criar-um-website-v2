import React, { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { fetchProjects, ProjectDTO } from '../../services/projectsApi';
import { fetchCosts, CostDTO } from '../../services/costsApi';
import { fetchProducts, ProductDTO } from '../../services/productsApi';
import { fetchAssets, AssetDTO } from '../../services/assetsApi';
import { createOrder, fetchOrders, OrderDTO } from '../../services/ordersApi';
import { fetchWallet, fetchWalletPositions, WalletDTO, WalletPositionDTO } from '../../services/walletApi';
import { fetchPriceHistory, PriceHistoryPoint } from '../../services/priceHistoryApi';
import { fetchUserByEmail, UserDTO } from '../../services/usersApi';
import { createDeposit, DepositMethod } from '../../services/depositsApi';
import '../Dashboard/Dashboard.css';
import './Investor.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const Investor: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [costs, setCosts] = useState<CostDTO[]>([]);
  const [costsLoading, setCostsLoading] = useState(false);
  const [costsError, setCostsError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletDTO | null>(null);
  const [walletPositions, setWalletPositions] = useState<WalletPositionDTO[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({
    assetId: '',
    orderType: 'buy' as 'buy' | 'sell',
    quantity: 1,
    price: '' as string,
  });
  const [depositForm, setDepositForm] = useState({
    amount: '',
    method: 'pix' as DepositMethod,
    cpf: '',
  });
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositFeedback, setDepositFeedback] = useState<string | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [priceHistoryError, setPriceHistoryError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserDTO | null>(null);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const currentUserEmail = (localStorage.getItem('email') || 'default').toLowerCase();
  const permissionLevel = (localStorage.getItem('permissionLevel') || 'A') as 'A' | 'B' | 'C';
  const isMasterUser = permissionLevel === 'B';

  const navigate = useNavigate();

  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      setProjectsError('Não foi possível carregar os projetos.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadCosts = async () => {
    setCostsLoading(true);
    setCostsError(null);
    try {
      const data = await fetchCosts();
      setCosts(data);
    } catch (error) {
      console.error('Erro ao buscar custos:', error);
      setCostsError(error instanceof Error ? error.message : 'Não foi possível carregar os custos.');
    } finally {
      setCostsLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProductsError(error instanceof Error ? error.message : 'Não foi possível carregar os produtos.');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadMarketData = async () => {
    setOrdersLoading(true);
    setWalletLoading(true);
    setOrdersError(null);
    setWalletError(null);
    setPriceHistoryError(null);
    try {
      const [assetData, orderData, walletData, profile] = await Promise.all([
        fetchAssets(),
        fetchOrders(),
        fetchWallet(currentUserEmail),
        fetchUserByEmail(currentUserEmail),
      ]);
      setAssets(assetData);
      setOrders(orderData);
      setWallet(walletData);
      setUserProfile(profile);
      if (assetData.length > 0) {
        const primary = assetData.find((asset) => asset.isPrimary) || assetData[0];
        setOrderForm((prev) => ({
          ...prev,
          assetId: primary.id,
          price: prev.price || String(primary.currentPrice ?? ''),
        }));
        try {
          const history = await fetchPriceHistory(primary.id, 14);
          setPriceHistory(history);
        } catch (error) {
          console.error('Erro ao carregar histórico:', error);
          setPriceHistoryError('Não foi possível carregar o histórico de preço.');
          setPriceHistory([]);
        }
      } else {
        setPriceHistory([]);
      }
      if (walletData?.id) {
        const positions = await fetchWalletPositions(walletData.id);
        setWalletPositions(positions);
      } else {
        setWalletPositions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar mercado:', error);
      setOrdersError('Não foi possível carregar ordens.');
      setWalletError('Não foi possível carregar carteira.');
      setUserProfileError('Não foi possível carregar seus dados.');
    } finally {
      setOrdersLoading(false);
      setWalletLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!orderForm.assetId) {
      setOrderFeedback('Selecione um ativo.');
      return;
    }
    const quantity = Number(orderForm.quantity);
    const price = orderForm.price ? Number(orderForm.price.replace(',', '.')) : undefined;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setOrderFeedback('Quantidade inválida.');
      return;
    }
    setOrderSubmitting(true);
    setOrderFeedback(null);
    try {
      await createOrder({
        userId: currentUserEmail,
        assetId: orderForm.assetId,
        orderType: isMasterUser ? orderForm.orderType : 'buy',
        quantity,
        price: Number.isFinite(price) ? price : undefined,
      });
      await loadMarketData();
      setOrderFeedback('Ordem executada com sucesso.');
    } catch (error) {
      setOrderFeedback(error instanceof Error ? error.message : 'Falha ao executar ordem.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleSubmitDeposit = async () => {
    const amount = Number(String(depositForm.amount).replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositFeedback('Informe um valor válido.');
      return;
    }
    setDepositSubmitting(true);
    setDepositFeedback(null);
    try {
      await createDeposit({
        userId: currentUserEmail,
        amount,
        method: depositForm.method,
        cpf: depositForm.cpf,
      });
      await loadMarketData();
      setDepositFeedback('Depósito registrado.');
      setDepositForm((prev) => ({ ...prev, amount: '' }));
    } catch (error) {
      setDepositFeedback(error instanceof Error ? error.message : 'Falha ao depositar.');
    } finally {
      setDepositSubmitting(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadCosts();
    loadProducts();
    loadMarketData();
  }, []);

  useEffect(() => {
    if (wallet?.cpf && !depositForm.cpf) {
      setDepositForm((prev) => ({ ...prev, cpf: wallet.cpf || '' }));
    }
  }, [wallet, depositForm.cpf]);

  const visibleProjects = useMemo(() => projects, [projects]);
  const primaryAsset = useMemo(() => assets.find((asset) => asset.isPrimary) || assets[0], [assets]);
  const sellOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (order.orderType !== 'sell') return false;
        if (!primaryAsset?.ticker) return true;
        return order.ticker ? order.ticker === primaryAsset.ticker : true;
      }),
    [orders, primaryAsset]
  );
  const priceChartData = useMemo(() => {
    const base = Number(primaryAsset?.currentPrice ?? 1);
    const history = priceHistory.length > 0
      ? priceHistory
      : [{ price: base, recordedAt: new Date().toISOString().slice(0, 10) }];
    const labels = history.map((point) => point.recordedAt);
    const values = history.map((point) => point.price);
    return {
      labels,
      datasets: [
        {
          label: primaryAsset?.ticker || 'Ativo principal',
          data: values,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          tension: 0.35,
        },
      ],
    };
  }, [primaryAsset, priceHistory]);

  const tabLabels: Record<string, string> = {
    overview: 'Resumo',
    projects: 'Projetos',
    costs: 'Custos',
    marketplace: 'Produtos (Marketplace)',
    financials: 'Financeiro',
    market: 'Mercado secundário',
    businessPlan: 'Plano de negócio',
    admin: 'Admin'
  };

  const crumbs = [
    { label: 'Investidor' },
    { label: tabLabels[activeTab] || 'Resumo' }
  ];

  const financialHighlights = [
    { label: 'Receita projetada (12m)', value: 'R$ 480.000', trend: '+12%' },
    { label: 'ROI estimado', value: '28%', trend: '+4%' },
    { label: 'Burn rate mensal', value: 'R$ 28.500', trend: '-6%' },
    { label: 'Runway', value: '14 meses', trend: 'estável' }
  ];

  const milestones = [
    { title: 'MVP entregue', date: 'Fev/2026', status: 'Concluído' },
    { title: 'Beta com clientes', date: 'Abr/2026', status: 'Em andamento' },
    { title: 'Go-to-market', date: 'Jun/2026', status: 'Planejado' }
  ];

  const parseCostValue = (value: string) => {
    const numeric = parseFloat(value.replace('R$', '').replace('.', '').replace(',', '.'));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const getMonthlyCost = (cost: CostDTO) => {
    const value = parseCostValue(cost.costValue);
    return cost.billingCycle === 'annual' ? value / 12 : value;
  };

  const getAnnualCost = (cost: CostDTO) => {
    const value = parseCostValue(cost.costValue);
    return cost.billingCycle === 'annual' ? value : value * 12;
  };

  const totalCostsMonthly = costs.reduce((acc, cost) => acc + getMonthlyCost(cost), 0);
  const totalCostsAnnual = costs.reduce((acc, cost) => acc + getAnnualCost(cost), 0);

  const parseProductPrice = (value?: string) => {
    if (!value) return 0;
    const numeric = parseFloat(String(value).replace('R$', '').replace('.', '').replace(',', '.'));
    return Number.isNaN(numeric) ? 0 : numeric;
  };

  const formatCurrency = (value?: string) => {
    if (!value) return '-';
    const trimmed = String(value).trim();
    if (!trimmed) return '-';
    return trimmed.startsWith('R$') ? trimmed : `R$ ${trimmed}`;
  };

  const formatNumericCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
  };

  const productProfitMetrics = products.map((product) => {
    const sale = parseProductPrice(product.salePrice || product.price);
    const purchase = parseProductPrice(product.purchasePrice);
    const profit = sale - purchase;
    const margin = sale > 0 ? (profit / sale) * 100 : 0;
    return {
      ...product,
      sale,
      purchase,
      profit,
      margin,
    };
  });

  return (
    <LayoutPrivate
      crumbs={crumbs}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
    >
      <div className={`admin-container has-breadcrumb ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="admin-sidebar">
          <h2>Investidor</h2>
          <ul>
            <li className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
              Resumo
            </li>
            <li className={activeTab === 'businessPlan' ? 'active' : ''} onClick={() => setActiveTab('businessPlan')}>
              Plano de negócio
            </li>
            <li className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}>
              Projetos
            </li>
            <li className={activeTab === 'marketplace' ? 'active' : ''} onClick={() => setActiveTab('marketplace')}>
              Produtos
            </li>
            <li className={activeTab === 'financials' ? 'active' : ''} onClick={() => setActiveTab('financials')}>
              Financeiro
            </li>
            <li className={activeTab === 'costs' ? 'active' : ''} onClick={() => setActiveTab('costs')}>
              Custos
            </li>
            <li className={activeTab === 'market' ? 'active' : ''} onClick={() => setActiveTab('market')}>
              Mercado secundário
            </li>
            <li className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>
              Admin
            </li>
          </ul>
        </aside>

        <main className="admin-content investor-content">
          {activeTab === 'overview' && (
            <section>
              <div className="investor-hero">
                <div>
                  <h2>Visão geral do projeto</h2>
                  <p>
                    Acompanhe os indicadores essenciais do negócio, progresso das entregas e impacto financeiro em tempo real.
                  </p>
                </div>
                <button className="action-button" onClick={() => setActiveTab('projects')}>
                  Ver projetos
                </button>
              </div>

              <div className="investor-kpis">
                {financialHighlights.map((item) => (
                  <div key={item.label} className="investor-kpi-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <em>{item.trend}</em>
                  </div>
                ))}
              </div>

              <div className="investor-grid">
                <section className="investor-panel">
                  <h3>Planejamento e marcos</h3>
                  <ul className="investor-milestones">
                    {milestones.map((milestone) => (
                      <li key={milestone.title}>
                        <div>
                          <strong>{milestone.title}</strong>
                          <span>{milestone.date}</span>
                        </div>
                        <span className={`pill ${milestone.status === 'Concluído' ? 'pill--ok' : 'pill--warn'}`}>
                          {milestone.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="investor-panel">
                  <h3>Risco & mitigação</h3>
                  <ul className="investor-risk-list">
                    <li>
                      <span>📌 Risco de churn</span>
                      <strong>Programa de retenção e upsell</strong>
                    </li>
                    <li>
                      <span>📌 Crescimento lento</span>
                      <strong>Campanhas de aquisição com parceiros</strong>
                    </li>
                    <li>
                      <span>📌 Atraso técnico</span>
                      <strong>Squad extra para sprints críticos</strong>
                    </li>
                  </ul>
                </section>
              </div>
            </section>
          )}

          {activeTab === 'projects' && (
            <section>
              <h2>Projetos disponíveis para investidores</h2>
              <p>Projetos cadastrados com indicação de visibilidade e cobrança.</p>
              {projectsLoading && <p>Carregando projetos...</p>}
              {projectsError && <p>{projectsError}</p>}
              <table className="costs-table">
                <thead>
                  <tr>
                    <th>Projeto</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Preço</th>
                    <th>Produção</th>
                    <th>Margem</th>
                    <th>Compras</th>
                    <th>Público</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!projectsLoading && visibleProjects.length === 0 && (
                    <tr>
                      <td colSpan={9}>Nenhum projeto encontrado.</td>
                    </tr>
                  )}
                  {visibleProjects.map((project) => {
                    const saleValue = parseProductPrice(project.salePrice);
                    const productionValue = parseProductPrice(project.productionCost);
                    const profit = saleValue - productionValue;
                    const margin = saleValue > 0 ? (profit / saleValue) * 100 : 0;
                    return (
                      <tr key={project.id}>
                        <td>{project.name}</td>
                        <td>{project.projectType || '-'}</td>
                        <td>{project.description || '-'}</td>
                        <td>{project.paid ? formatCurrency(project.salePrice) : 'Gratuito'}</td>
                        <td>{formatCurrency(project.productionCost)}</td>
                        <td>{saleValue > 0 ? `${margin.toFixed(1)}%` : '-'}</td>
                        <td>{project.purchaseCount ?? 0}</td>
                        <td>
                          <span className={`pill ${project.isPublic ? 'pill--ok' : 'pill--danger'}`}>
                            {project.isPublic ? 'Público' : 'Privado'}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${project.status === 'Ativo' ? 'pill--ok' : 'pill--warn'}`}>
                            {project.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {activeTab === 'costs' && (
            <section>
              <h2>Custos principais</h2>
              <p>Lista de custos iniciais configurados pelo admin.</p>
              {costsLoading && <p>Carregando custos...</p>}
              {costsError && <p>{costsError}</p>}
              <div className="investor-costs-summary">
                <div>
                  <span>Custos mensais</span>
                  <strong>R$ {totalCostsMonthly.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div>
                  <span>Custos anuais</span>
                  <strong>R$ {totalCostsAnnual.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div>
                  <span>Total de itens</span>
                  <strong>{costs.length}</strong>
                </div>
              </div>
              <table className="projects-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Ciclo</th>
                    <th>Mensal eq.</th>
                  </tr>
                </thead>
                <tbody>
                  {!costsLoading && costs.length === 0 && (
                    <tr>
                      <td colSpan={4}>Nenhum custo encontrado.</td>
                    </tr>
                  )}
                  {costs.map((cost) => (
                    <tr key={cost.id}>
                      <td>{cost.name}</td>
                      <td>{cost.costValue || '-'}</td>
                      <td>{cost.billingCycle === 'annual' ? 'Anual' : 'Mensal'}</td>
                      <td>R$ {getMonthlyCost(cost).toFixed(2).replace('.', ',')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeTab === 'marketplace' && (
            <section>
              <h2>Produtos do Marketplace</h2>
              <p>Valores de compra/venda e margem estimada de lucro.</p>
              {productsLoading && <p>Carregando produtos...</p>}
              {productsError && <p>{productsError}</p>}
              <table className="marketplace-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Compra</th>
                    <th>Venda</th>
                    <th>Lucro</th>
                    <th>Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {!productsLoading && productProfitMetrics.length === 0 && (
                    <tr>
                      <td colSpan={5}>Nenhum produto encontrado.</td>
                    </tr>
                  )}
                  {productProfitMetrics.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>R$ {product.purchase.toFixed(2).replace('.', ',')}</td>
                      <td>R$ {product.sale.toFixed(2).replace('.', ',')}</td>
                      <td>R$ {product.profit.toFixed(2).replace('.', ',')}</td>
                      <td>{product.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {activeTab === 'financials' && (
            <section>
              <h2>Indicadores financeiros</h2>
              <div className="investor-grid">
                <div className="investor-panel">
                  <h3>Receitas e custos</h3>
                  <div className="investor-metric-list">
                    <div>
                      <span>MRR</span>
                      <strong>R$ 42.000</strong>
                    </div>
                    <div>
                      <span>CAC</span>
                      <strong>R$ 430</strong>
                    </div>
                    <div>
                      <span>LTV</span>
                      <strong>R$ 5.600</strong>
                    </div>
                    <div>
                      <span>Margem bruta</span>
                      <strong>62%</strong>
                    </div>
                  </div>
                </div>
                <div className="investor-panel">
                  <h3>Planejamento</h3>
                  <p>
                    O planejamento financeiro prevê equilíbrio em 10 meses, com expansão de receitas via novos planos e
                    licenciamento corporativo. Mantemos buffer de caixa para 14 meses de operação.
                  </p>
                  <button className="action-button action-button--ghost" onClick={() => setActiveTab('projects')}>
                    Revisar projetos
                  </button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'market' && (
            <section>
              <div className="broker-header">
                <div>
                  <h2>Broker</h2>
                  <p>Visão rápida do ativo, carteira e ofertas disponíveis.</p>
                </div>
                <div className="broker-badge">Ativo único</div>
              </div>

              <div className="broker-quick">
                <div className="broker-card">
                  <span>Ativo</span>
                  <strong>{primaryAsset?.ticker || primaryAsset?.name || '-'}</strong>
                  <em>{formatNumericCurrency(primaryAsset?.currentPrice)}</em>
                  <small>{primaryAsset?.availableSupply?.toLocaleString('pt-BR') ?? 0} cotas disponíveis</small>
                </div>
                <div className="broker-card">
                  <span>Carteira</span>
                  {walletLoading && <em>Carregando...</em>}
                  {walletError && <em>{walletError}</em>}
                  {wallet && (
                    <>
                      <strong>{formatNumericCurrency(wallet.cashBalance)}</strong>
                      <small>{walletPositions.length} posições</small>
                    </>
                  )}
                </div>
                <div className="broker-card">
                  <span>Ofertas</span>
                  {ordersLoading && <em>Carregando...</em>}
                  {ordersError && <em>{ordersError}</em>}
                  {!ordersLoading && <strong>{sellOrders.length}</strong>}
                  <small>{sellOrders.length > 0 ? 'Disponíveis para compra' : 'Sem vendas agora'}</small>
                </div>
                <div className="broker-card">
                  <span>Seu perfil</span>
                  {userProfileError && <em>{userProfileError}</em>}
                  {userProfile ? (
                    <>
                      <strong>{userProfile.name || 'Sem nome'}</strong>
                      <small>{userProfile.email}</small>
                      {wallet?.cpf && <small>CPF: {wallet.cpf}</small>}
                    </>
                  ) : (
                    <strong>Não localizado</strong>
                  )}
                </div>
              </div>

              <div className="investor-grid">
                <div className="investor-panel">
                  <h3>Preço (últimos dias)</h3>
                  {!primaryAsset && <p>Nenhum ativo principal cadastrado.</p>}
                  {priceHistoryError && <p>{priceHistoryError}</p>}
                  {primaryAsset && <Line data={priceChartData} />}
                </div>

                <div className="investor-panel">
                  <h3>Comprar/Vender</h3>
                  <div className="broker-order-card">
                    <div className="broker-order-row">
                      <div>
                        <span>Usuário</span>
                        <strong>{currentUserEmail}</strong>
                      </div>
                      <div>
                        <span>Ativo</span>
                        <strong>{primaryAsset?.ticker || primaryAsset?.name || '-'}</strong>
                      </div>
                    </div>
                    <div className="investor-order-form">
                      <div>
                        <span>Tipo</span>
                        <select
                          value={orderForm.orderType}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, orderType: e.target.value as 'buy' | 'sell' }))}
                        >
                          <option value="buy">Compra</option>
                          {isMasterUser && <option value="sell">Venda</option>}
                        </select>
                      </div>
                      <div>
                        <span>Quantidade</span>
                        <input
                          type="number"
                          min={1}
                          value={orderForm.quantity}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                        />
                      </div>
                      <div>
                        <span>Preço</span>
                        <input
                          type="text"
                          value={orderForm.price}
                          onChange={(e) => setOrderForm((prev) => ({ ...prev, price: e.target.value }))}
                        />
                      </div>
                      <div>
                        <span>&nbsp;</span>
                        <button
                          className="action-button"
                          onClick={handleSubmitOrder}
                          disabled={orderSubmitting || !primaryAsset}
                        >
                          {orderSubmitting ? 'Enviando...' : 'Executar'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {orderFeedback && <p>{orderFeedback}</p>}
                  <div className="broker-order-card broker-deposit-card">
                    <div className="broker-order-row">
                      <div>
                        <span>Depósito</span>
                        <strong>Adicionar saldo</strong>
                      </div>
                      <div>
                        <span>Método</span>
                        <strong>{depositForm.method}</strong>
                      </div>
                    </div>
                    <div className="investor-order-form">
                      <div>
                        <span>Método</span>
                        <select
                          value={depositForm.method}
                          onChange={(e) => setDepositForm((prev) => ({ ...prev, method: e.target.value as DepositMethod }))}
                        >
                          <option value="pix">Pix</option>
                          <option value="cartao">Cartão</option>
                          <option value="crypto">Cripto</option>
                        </select>
                      </div>
                      <div>
                        <span>Valor</span>
                        <input
                          type="text"
                          value={depositForm.amount}
                          onChange={(e) => setDepositForm((prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="0,00"
                        />
                      </div>
                      <div>
                        <span>CPF</span>
                        <input
                          type="text"
                          value={depositForm.cpf}
                          onChange={(e) => setDepositForm((prev) => ({ ...prev, cpf: e.target.value }))}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <span>&nbsp;</span>
                        <button
                          className="action-button action-button--ghost"
                          onClick={handleSubmitDeposit}
                          disabled={depositSubmitting}
                        >
                          {depositSubmitting ? 'Processando...' : 'Depositar'}
                        </button>
                      </div>
                    </div>
                    {depositFeedback && <p>{depositFeedback}</p>}
                  </div>
                </div>
              </div>

              <div className="investor-panel">
                <div className="broker-orderbook-header">
                  <h3>Ofertas de venda</h3>
                  <span>{sellOrders.length} disponíveis</span>
                </div>
                {ordersLoading && <p>Carregando ordens...</p>}
                {ordersError && <p>{ordersError}</p>}
                <table className="projects-table">
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th>Qtd</th>
                      <th>Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!ordersLoading && sellOrders.length === 0 && (
                      <tr>
                        <td colSpan={3}>Nenhuma oferta encontrada.</td>
                      </tr>
                    )}
                    {sellOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.userId}</td>
                        <td>{order.quantity}</td>
                        <td>{formatNumericCurrency(order.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'businessPlan' && (
            <section>
              <h2>Plano de negócio</h2>
              <p>Estrutura inicial para apresentar nosso SaaS aos usuários e investidores.</p>
              <div className="investor-grid">
                <div className="investor-panel">
                  <h3>Proposta de valor</h3>
                  <ul className="investor-risk-list">
                    <li>
                      <span>🚀 Resultado rápido</span>
                      <strong>Tempo de criação reduzido para lançar landingpages e MVPs.</strong>
                    </li>
                    <li>
                      <span>🔧 Tudo em um só lugar</span>
                      <strong>Editor, hospedagem e integração com pagamentos em um fluxo.</strong>
                    </li>
                    <li>
                      <span>📊 Indicadores claros</span>
                      <strong>Métricas de conversão e acompanhamento de desempenho.</strong>
                    </li>
                  </ul>
                </div>
                <div className="investor-panel">
                  <h3>Público-alvo</h3>
                  <ul className="investor-risk-list">
                    <li>
                      <span>👥 Empreendedores</span>
                      <strong>Quem precisa validar ideias sem equipe técnica.</strong>
                    </li>
                    <li>
                      <span>🏢 Agências</span>
                      <strong>Entrega rápida de sites e páginas para clientes.</strong>
                    </li>
                    <li>
                      <span>🧑‍💻 Makers</span>
                      <strong>Profissionais que precisam de velocidade e autonomia.</strong>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="investor-grid">
                <div className="investor-panel">
                  <h3>Modelo de receita</h3>
                  <div className="investor-metric-list">
                    <div>
                      <span>Plano Free</span>
                      <strong>Captura e ativação</strong>
                    </div>
                    <div>
                      <span>Plano Pro</span>
                      <strong>Templates, domínio e integrações</strong>
                    </div>
                    <div>
                      <span>Plano Agency</span>
                      <strong>Multi-clientes e white label</strong>
                    </div>
                  </div>
                </div>
                <div className="investor-panel">
                  <h3>Go-to-market</h3>
                  <ul className="investor-risk-list">
                    <li>
                      <span>🎯 Aquisição</span>
                      <strong>Conteúdo, parcerias e tráfego pago escalável.</strong>
                    </li>
                    <li>
                      <span>🤝 Conversão</span>
                      <strong>Demonstração guiada e provas sociais.</strong>
                    </li>
                    <li>
                      <span>🔁 Retenção</span>
                      <strong>Suporte proativo e automações de sucesso.</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'admin' && (
            <section>
              <h2>Área administrativa</h2>
              <p>Use este atalho para acessar o painel administrativo quando necessário.</p>
              <button className="action-button" onClick={() => navigate('/admin')}>
                Ir para Admin
              </button>
            </section>
          )}
        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Investor;
