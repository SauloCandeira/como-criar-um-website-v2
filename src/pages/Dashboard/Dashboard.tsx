import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { useLocation, useNavigate } from 'react-router-dom';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { fetchProjects, ProjectDTO, updateProject } from '../../services/projectsApi';
import { fetchPurchases, PurchaseDTO } from '../../services/purchasesApi';
import { fetchUserByEmail, UserDTO } from '../../services/usersApi';
import MarketPlaceCard from '../../components/MarketPlaceCard/MarketPlaceCard';
import {
  fetchMyBotCard,
  addMyBotXp,
  fetchMyBotListings,
  createMyBotListing,
  buyMyBotListing,
  fetchInternalAccount,
  createMyBotCard,
  refreshMyBotCard,
  CardDTO,
  CardListingDTO,
  InternalAccountDTO,
} from '../../services/cardsApi';
import { sendMyBotMessage } from '../../services/mybotApi';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<PurchaseDTO[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserDTO | null>(null);
  const [userProfileError, setUserProfileError] = useState<string | null>(null);
  const [myBotCard, setMyBotCard] = useState<CardDTO | null>(null);
  const [myBotLoading, setMyBotLoading] = useState(false);
  const [myBotError, setMyBotError] = useState<string | null>(null);
  const [myBotListings, setMyBotListings] = useState<CardListingDTO[]>([]);
  const [myBotListingsLoading, setMyBotListingsLoading] = useState(false);
  const [myBotListingsError, setMyBotListingsError] = useState<string | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [listingLoading, setListingLoading] = useState(false);
  const [buyingListingId, setBuyingListingId] = useState<string | null>(null);
  const [internalAccount, setInternalAccount] = useState<InternalAccountDTO | null>(null);
  const [internalAccountError, setInternalAccountError] = useState<string | null>(null);
  const [cpfInput, setCpfInput] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [mybotMessages, setMybotMessages] = useState<Array<{ role: 'user' | 'mybot'; text: string }>>([]);
  const [mybotInput, setMybotInput] = useState('');
  const [mybotSending, setMybotSending] = useState(false);
  const [mybotChatError, setMybotChatError] = useState<string | null>(null);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [editProjectData, setEditProjectData] = useState({
    id: '',
    name: '',
    description: '',
    repository: '',
    domain: '',
    hosting: 'Vercel',
    status: 'Ativo',
    paid: false,
    isPublic: true,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const managerProject = () => {
    navigate('/manager');
  };

  const userId = (localStorage.getItem('email') || '').toLowerCase();

  const loadUserProfile = async () => {
    if (!userId) return;
    setUserProfileError(null);
    try {
      const profile = await fetchUserByEmail(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setUserProfileError('Não foi possível carregar seu perfil.');
    }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const data = await fetchProjects(userId || undefined);
      setProjects(data);
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      setProjectsError('Não foi possível carregar os projetos.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadPurchases = async () => {
    setPurchasesLoading(true);
    setPurchasesError(null);
    try {
      const data = await fetchPurchases(userId || undefined);
      setPurchases(data);
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
      setPurchasesError('Não foi possível carregar as compras.');
    } finally {
      setPurchasesLoading(false);
    }
  };

  const loadMyBotCard = async () => {
    if (!userId) return;
    setMyBotLoading(true);
    setMyBotError(null);
    try {
      await fetchMyBotCard(userId);
      const refreshed = await refreshMyBotCard(userId);
      setMyBotCard(refreshed);
    } catch (error) {
      console.error('Erro ao carregar My Bot:', error);
      setMyBotError(error instanceof Error ? error.message : 'Não foi possível carregar seu My Bot.');
    } finally {
      setMyBotLoading(false);
    }
  };

  const handleCreateMyBot = async () => {
    if (!userId) return;
    setCpfError(null);
    setMyBotError(null);
    if (!cpfInput.trim()) {
      setCpfError('Informe seu CPF para ativar o My Bot.');
      return;
    }
    setMyBotLoading(true);
    try {
      const card = await createMyBotCard(userId, cpfInput.trim());
      setMyBotCard(card);
      setCpfInput('');
    } catch (error) {
      console.error('Erro ao ativar My Bot:', error);
      setMyBotError(error instanceof Error ? error.message : 'Não foi possível ativar seu My Bot.');
    } finally {
      setMyBotLoading(false);
    }
  };

  const loadMyBotListings = async () => {
    setMyBotListingsLoading(true);
    setMyBotListingsError(null);
    try {
      const listings = await fetchMyBotListings('active');
      setMyBotListings(listings);
    } catch (error) {
      console.error('Erro ao carregar marketplace:', error);
      setMyBotListingsError('Não foi possível carregar o marketplace do My Bot.');
    } finally {
      setMyBotListingsLoading(false);
    }
  };

  const loadInternalAccount = async () => {
    if (!userId) return;
    setInternalAccountError(null);
    try {
      const account = await fetchInternalAccount(userId);
      setInternalAccount(account);
    } catch (error) {
      console.error('Erro ao carregar saldo interno:', error);
      setInternalAccountError('Não foi possível carregar seu saldo interno.');
    }
  };

  const handleCreateMyBotListing = async () => {
    if (!myBotCard) return;
    const value = Number(listingPrice.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setMyBotListingsError('Informe um preço válido para listar seu My Bot.');
      return;
    }
    setListingLoading(true);
    setMyBotListingsError(null);
    try {
      await createMyBotListing({ userId, cardId: myBotCard.id, price: value });
      setListingPrice('');
      loadMyBotListings();
    } catch (error) {
      console.error('Erro ao criar anúncio:', error);
      setMyBotListingsError('Não foi possível listar o My Bot no marketplace.');
    } finally {
      setListingLoading(false);
    }
  };

  const handleBuyMyBotListing = async (listingId: string) => {
    setBuyingListingId(listingId);
    setMyBotListingsError(null);
    try {
      await buyMyBotListing(listingId, userId);
      await loadMyBotCard();
      await loadInternalAccount();
      await loadMyBotListings();
    } catch (error) {
      console.error('Erro ao comprar My Bot:', error);
      setMyBotListingsError('Não foi possível concluir a compra.');
    } finally {
      setBuyingListingId(null);
    }
  };

  const handleMyBotSend = async () => {
    if (!userId) return;
    const message = mybotInput.trim();
    if (!message || mybotSending) return;
    setMybotInput('');
    setMybotChatError(null);
    setMybotSending(true);
    setMybotMessages((prev) => [...prev, { role: 'user', text: message }]);
    try {
      const reply = await sendMyBotMessage(userId, { message });
      setMybotMessages((prev) => [...prev, { role: 'mybot', text: reply.response }]);
    } catch (error) {
      console.error('Erro ao conversar com My Bot:', error);
      setMybotChatError('Não foi possível falar com o My Bot.');
    } finally {
      setMybotSending(false);
    }
  };

  const handleAddMyBotXp = async () => {
    if (!userId) return;
    setMyBotLoading(true);
    setMyBotError(null);
    try {
      const updated = await addMyBotXp(userId, 25);
      setMyBotCard(updated);
    } catch (error) {
      console.error('Erro ao adicionar XP:', error);
      setMyBotError('Não foi possível atualizar o XP.');
    } finally {
      setMyBotLoading(false);
    }
  };

  const handleRefreshMyBotVisual = async () => {
    if (!userId) return;
    setMyBotLoading(true);
    setMyBotError(null);
    try {
      const refreshed = await refreshMyBotCard(userId);
      setMyBotCard(refreshed);
    } catch (error) {
      console.error('Erro ao atualizar visual:', error);
      setMyBotError(error instanceof Error ? error.message : 'Não foi possível atualizar o visual.');
    } finally {
      setMyBotLoading(false);
    }
  };

  const buildMyBotSvg = (card: CardDTO) => {
    const palette = card.visualMeta?.palette || { primary: '#38bdf8', secondary: '#0f172a', accent: '#22d3ee' };
    const eyes = Math.max(1, Number(card.visualMeta?.eyes ?? 2));
    const horns = Math.max(0, Number(card.visualMeta?.horns ?? 0));
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.secondary}" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="core" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${palette.primary}" stop-opacity="0.95" />
      <stop offset="100%" stop-color="${palette.secondary}" stop-opacity="0.9" />
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.16)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
    </linearGradient>
    <pattern id="stars" width="80" height="80" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="12" r="2" fill="#e2e8f0" opacity="0.3" />
      <circle cx="60" cy="20" r="1.5" fill="#f8fafc" opacity="0.4" />
      <circle cx="40" cy="60" r="1.2" fill="#cbd5f5" opacity="0.35" />
    </pattern>
  </defs>
  <rect width="480" height="640" rx="32" fill="url(#bg)" />
  <rect width="480" height="640" fill="url(#stars)" opacity="0.3" />
  <rect x="36" y="54" width="408" height="512" rx="28" fill="url(#glass)" stroke="rgba(148,163,184,0.2)" />
  <g>
    <circle cx="240" cy="250" r="125" fill="${palette.primary}" />
    <ellipse cx="240" cy="360" rx="120" ry="100" fill="${palette.secondary}" opacity="0.2" />
    ${Array.from({ length: horns }).map((_, idx) => {
      const offset = horns === 1 ? 0 : (idx - (horns - 1) / 2) * 48;
      return `
    <path d="M${240 + offset - 18} 120 Q${240 + offset} 70 ${240 + offset + 18} 120" stroke="${palette.accent}" stroke-width="10" fill="none" />`;
    }).join("")}
    ${Array.from({ length: eyes }).map((_, idx) => {
      const offset = eyes === 1 ? 0 : (idx - (eyes - 1) / 2) * 58;
      return `
    <circle cx="${240 + offset}" cy="235" r="26" fill="#f8fafc" />
    <circle cx="${240 + offset}" cy="235" r="12" fill="#0f172a" />
    <circle cx="${240 + offset + 6}" cy="230" r="4" fill="#ffffff" opacity="0.8" />`;
    }).join("")}
    <path d="M210 300 Q240 330 270 300" stroke="${palette.accent}" stroke-width="10" fill="none" stroke-linecap="round" />
    <circle cx="190" cy="290" r="8" fill="${palette.accent}" opacity="0.6" />
    <circle cx="290" cy="290" r="8" fill="${palette.accent}" opacity="0.6" />
    <ellipse cx="180" cy="360" rx="55" ry="35" fill="${palette.primary}" opacity="0.8" />
    <ellipse cx="300" cy="360" rx="55" ry="35" fill="${palette.primary}" opacity="0.8" />
  </g>
  <text x="50%" y="565" text-anchor="middle" fill="#e2e8f0" font-size="24" font-family="'Segoe UI', sans-serif">${card.name}</text>
  <text x="50%" y="595" text-anchor="middle" fill="#94a3b8" font-size="13" font-family="'Segoe UI', sans-serif">${card.rarity.toUpperCase()}</text>
</svg>`;
  };

  const myBotImageSrc = (card: CardDTO) => {
    if (card.imageUrl) return card.imageUrl;
    const svg = buildMyBotSvg(card);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const handleEditProject = (project: ProjectDTO) => {
    setProjectsError(null);
    setEditProjectData({
      id: project.id,
      name: project.name,
      description: project.description || '',
      repository: project.repository || '',
      domain: project.domain || '',
      hosting: project.hosting || 'Vercel',
      status: project.status || 'Ativo',
      paid: project.paid,
      isPublic: project.isPublic ?? true,
    });
    setIsProjectEditModalOpen(true);
  };

  const handleSaveProjectEdit = async () => {
    if (!editProjectData.name.trim()) {
      setProjectsError('Preencha o nome do projeto.');
      return;
    }
    try {
      await updateProject(editProjectData.id, {
        name: editProjectData.name.trim(),
        description: editProjectData.description.trim(),
        repository: editProjectData.repository.trim(),
        domain: editProjectData.domain.trim(),
        hosting: editProjectData.hosting.trim(),
        status: editProjectData.status.trim(),
        paid: editProjectData.paid,
        isPublic: editProjectData.isPublic,
      });
      setIsProjectEditModalOpen(false);
      loadProjects();
    } catch (error) {
      console.error('Erro ao editar projeto:', error);
      setProjectsError('Não foi possível editar o projeto.');
    }
  };

  const visibleProjects = projects.filter((project) => project.isPublic ?? true);

  const tabLabels: Record<string, string> = {
    'home': 'Home',
    'projects': 'Projetos',
    'cart': 'Carrinho',
    'purchases': 'Compras',
    'mybot': 'My Bot',
  };

  const crumbs = [
    { label: 'Dashboard' },
    { label: tabLabels[activeTab] || 'Home' }
  ];

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab && ['home', 'projects', 'cart', 'purchases', 'mybot', 'marketplace'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    loadProjects();
    loadPurchases();
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'mybot') {
      loadMyBotCard();
      loadMyBotListings();
      loadInternalAccount();
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePurchase = () => {
      loadProjects();
      loadPurchases();
    };
    window.addEventListener('marketplace:purchase', handlePurchase);
    return () => window.removeEventListener('marketplace:purchase', handlePurchase);
  }, []);

  return (
    <LayoutPrivate
      crumbs={crumbs}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
    >
      <div className={`admin-container has-breadcrumb ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <aside className="admin-sidebar">
          <h2>Admin</h2>
          <ul>
            <li className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
              HOME
            </li>
            <li className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}>
              PROJETOS
            </li>
            <li className={activeTab === 'marketplace' ? 'active' : ''} onClick={() => setActiveTab('marketplace')}>
              MARKETPLACE
            </li>
            <li className={activeTab === 'cart' ? 'active' : ''} onClick={() => setActiveTab('cart')}>
              CARRINHO
            </li>
            <li className={activeTab === 'purchases' ? 'active' : ''} onClick={() => setActiveTab('purchases')}>
              COMPRAS
            </li>
            <li className={activeTab === 'mybot' ? 'active' : ''} onClick={() => setActiveTab('mybot')}>
              MY BOT
            </li>
          </ul>
        </aside>

        <main className="admin-content">
          {activeTab === 'home' && (
            <>
              <section className="account-info">
                <h2>👤 Minha Conta</h2>
                <div className="account-details">
                  {userProfileError && <p>{userProfileError}</p>}
                  <p><strong>Nome:</strong> {userProfile?.name || 'Usuário'}</p>
                  <p><strong>Email:</strong> {userProfile?.email || userId}</p>
                  <p><strong>Status:</strong> <span className={`status ${(userProfile?.status || 'Ativo').toLowerCase()}`}>{userProfile?.status || 'Ativo'}</span></p>
                  {userProfile?.permissionLevel && (
                    <p><strong>Perfil:</strong> {userProfile.permissionLevel}</p>
                  )}
                </div>
              </section>

              <section className="course-methodology">
                <h2>🚀 Metodologia baseada em projetos</h2>
                <p>
                  Bem-vindo à nossa plataforma de projetos práticos. Aqui o foco é <strong>criar e entregar projetos reais</strong>
                  com documentação, tarefas, cronogramas e entregas organizadas.
                </p>

                <ul>
                  <li>🔧 Crie websites, sistemas e soluções sob demanda em um fluxo profissional.</li>
                  <li>💡 Estruture tarefas, roadmap e timeline para garantir previsibilidade.</li>
                  <li>🌐 Use a IDE integrada para validar códigos e protótipos rapidamente.</li>
                  <li>🎯 Acompanhe métricas e qualidade com checkpoints de entrega.</li>
                </ul>

                <p>
                  Ao final de cada ciclo, você terá projetos prontos para publicação e portfólio, com documentação técnica
                  e histórico de execução para clientes e times.
                </p>
              </section>
            </>
          )}

          {activeTab === 'projects' && (
            <section>
              <h2>Plataforma de Projetos</h2>
              <p>Gerencie seus repositórios e hospede seus projetos de forma simples.</p>
              {projectsLoading && <p>Carregando projetos...</p>}
              {projectsError && <p>{projectsError}</p>}
              <table className="projects-table">
                <thead>
                  <tr>
                    <th>Repositório</th>
                    <th>Domínio</th>
                    <th>Hospedagem</th>
                    <th>Status</th>
                    <th>Pagamento</th>
                    <th>Público</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {!projectsLoading && visibleProjects.length === 0 && (
                    <tr>
                      <td colSpan={7}>Nenhum projeto encontrado.</td>
                    </tr>
                  )}
                  {visibleProjects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        {project.repository ? (
                          <a href={`https://github.com/${project.repository}`} target="_blank" rel="noopener noreferrer">
                            {project.repository}
                          </a>
                        ) : (
                          project.name
                        )}
                      </td>
                      <td>
                        {project.domain ? (
                          <a href={`${project.domain}`} target="_blank" rel="noopener noreferrer">
                            {project.domain}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {project.hosting === 'GitHub Pages' && project.repository ? (
                          <a href={`https://${project.repository}.github.io`} target="_blank" rel="noopener noreferrer">
                            {project.hosting}
                          </a>
                        ) : (
                          project.hosting || '-'
                        )}
                      </td>
                      <td>
                        <span className={`pill ${project.status === 'Ativo' ? 'pill--ok' : 'pill--warn'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${project.paid ? 'pill--ok' : 'pill--danger'}`}>
                          {project.paid ? 'Pago' : 'Não pago'}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${project.isPublic ? 'pill--ok' : 'pill--danger'}`}>
                          {project.isPublic ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td>
                        <div className="project-actions">
                          <button className="action-button" onClick={() => handleEditProject(project)}>Editar</button>
                          <button className="action-button action-button--ghost" onClick={managerProject}>Admin</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isProjectEditModalOpen && (
                <div className="dashboard-modal-backdrop" onClick={() => setIsProjectEditModalOpen(false)}>
                  <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="dashboard-modal__header">
                      <h3>Editar projeto</h3>
                      <button className="action-button action-button--ghost" onClick={() => setIsProjectEditModalOpen(false)}>Fechar</button>
                    </div>
                    {projectsError && <p className="dashboard-modal__error">{projectsError}</p>}
                    <div className="dashboard-modal__form">
                      <label>
                        <span>Nome</span>
                        <input
                          type="text"
                          value={editProjectData.name}
                          onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Descrição</span>
                        <textarea
                          value={editProjectData.description}
                          onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Repositório</span>
                        <input
                          type="text"
                          value={editProjectData.repository}
                          onChange={(e) => setEditProjectData({ ...editProjectData, repository: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Domínio</span>
                        <input
                          type="text"
                          value={editProjectData.domain}
                          onChange={(e) => setEditProjectData({ ...editProjectData, domain: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Hospedagem</span>
                        <select
                          value={editProjectData.hosting}
                          onChange={(e) => setEditProjectData({ ...editProjectData, hosting: e.target.value })}
                        >
                          <option value="Vercel">Vercel</option>
                          <option value="Netlify">Netlify</option>
                          <option value="GitHub Pages">GitHub Pages</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </label>
                      <label>
                        <span>Status</span>
                        <select
                          value={editProjectData.status}
                          onChange={(e) => setEditProjectData({ ...editProjectData, status: e.target.value })}
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Pausado">Pausado</option>
                          <option value="Finalizado">Finalizado</option>
                          <option value="Em produção">Em produção</option>
                        </select>
                      </label>
                      <label className="dashboard-modal__checkbox">
                        <input
                          type="checkbox"
                          checked={editProjectData.paid}
                          onChange={(e) => setEditProjectData({ ...editProjectData, paid: e.target.checked })}
                        />
                        <span>Pago</span>
                      </label>
                    </div>
                    <div className="dashboard-modal__footer">
                      <button className="action-button action-button--ghost" onClick={() => setIsProjectEditModalOpen(false)}>Cancelar</button>
                      <button className="action-button" onClick={handleSaveProjectEdit}>Salvar</button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'marketplace' && (
            <section>
              <h2>🪐 Marketplace</h2>
              <p>Escolha produtos disponíveis e finalize sua compra.</p>
              <MarketPlaceCard />
            </section>
          )}

          {activeTab === 'cart' && (
            <section>
              <h2>🛒 Carrinho</h2>
              <p>Seu carrinho está vazio.</p>
            </section>
          )}

          {activeTab === 'purchases' && (
            <section>
              <h2>🧾 Compras</h2>
              {purchasesLoading && <p>Carregando compras...</p>}
              {purchasesError && <p>{purchasesError}</p>}
              <ul className="courses-list">
                {!purchasesLoading && purchases.length === 0 && (
                  <li className="course-item">
                    <div className="course-info">
                      <h3>Nenhuma compra registrada</h3>
                    </div>
                  </li>
                )}
                {purchases.map((item) => (
                  <li key={item.id} className="course-item">
                    <div className="course-info">
                      <h3>{item.productName || 'Produto'}</h3>
                      <span className="course-status">{item.status}</span>
                    </div>
                    <p>Data: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : '-'}</p>
                    <button className="view-all-button" onClick={managerProject}>Acessar Projeto</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeTab === 'mybot' && (
            <section className="mybot-panel">
              <div className="mybot-header">
                <h2>🤖 My Bot</h2>
                <div className="mybot-balance">
                  <span>Saldo interno</span>
                  <strong>{internalAccount ? `R$ ${internalAccount.balance.toFixed(2).replace('.', ',')}` : '—'}</strong>
                </div>
              </div>
              <p>Seu My Bot evolui com seu uso no SaaS e pode ser negociado no marketplace interno.</p>

              {internalAccountError && <p className="mybot-error">{internalAccountError}</p>}
              {myBotLoading && <p>Carregando My Bot...</p>}
              {myBotError && <p className="mybot-error">{myBotError}</p>}

              <div className="mybot-top">
                <div className="mybot-info">
                  {!myBotLoading && !myBotCard && (
                    <div className="mybot-card">
                      <h3>Ativar seu My Bot</h3>
                      <p>Seu CPF é usado apenas para gerar o hash de ativação. Ele não é armazenado.</p>
                      <div className="mybot-create">
                        <input
                          type="text"
                          placeholder="Digite seu CPF"
                          value={cpfInput}
                          onChange={(e) => setCpfInput(e.target.value)}
                        />
                        <button className="action-button" onClick={handleCreateMyBot}>Ativar My Bot</button>
                      </div>
                      {cpfError && <span className="mybot-error">{cpfError}</span>}
                    </div>
                  )}

                  {myBotCard && (
                    <div className="mybot-card">
                      <div className="mybot-card__header">
                        <div>
                          <span className={`mybot-rarity mybot-rarity--${myBotCard.rarity}`}>{myBotCard.rarity}</span>
                          <h3>{myBotCard.name}</h3>
                          <p>{myBotCard.species} • {myBotCard.className}</p>
                          <p>Nível {myBotCard.level} • XP {myBotCard.xp}</p>
                        </div>
                        <div className="mybot-avatar">
                          <img src={myBotImageSrc(myBotCard)} alt={myBotCard.name} />
                        </div>
                      </div>
                      {myBotCard.visualMeta?.palette && (
                        <p className="mybot-meta">
                          Paleta: {myBotCard.visualMeta.palette.primary}, {myBotCard.visualMeta.palette.secondary}, {myBotCard.visualMeta.palette.accent}
                        </p>
                      )}
                      {myBotCard.marketValue !== undefined && (
                        <p className="mybot-meta">Valor de mercado: R$ {Number(myBotCard.marketValue).toFixed(2).replace('.', ',')}</p>
                      )}
                      <div className="mybot-attributes">
                        <div>
                          <span>Força</span>
                          <strong>{myBotCard.attributes.strength}</strong>
                        </div>
                        <div>
                          <span>Velocidade</span>
                          <strong>{myBotCard.attributes.speed}</strong>
                        </div>
                        <div>
                          <span>Inteligência</span>
                          <strong>{myBotCard.attributes.intelligence}</strong>
                        </div>
                        <div>
                          <span>Resistência</span>
                          <strong>{myBotCard.attributes.endurance}</strong>
                        </div>
                      </div>
                      <div className="mybot-actions">
                        <button className="action-button" onClick={loadMyBotCard}>Atualizar My Bot</button>
                        <button className="action-button action-button--ghost" onClick={handleRefreshMyBotVisual}>
                          Atualizar visual
                        </button>
                        <button className="action-button action-button--ghost" onClick={handleAddMyBotXp}>Ganhar XP</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mybot-chat">
                  <h3>Conversar com My Bot</h3>
                  <div className="mybot-chat__history">
                    {mybotMessages.length === 0 && (
                      <div className="mybot-chat__empty">Envie uma mensagem para iniciar a conversa.</div>
                    )}
                    {mybotMessages.map((item, index) => (
                      <div key={`${item.role}-${index}`} className={`mybot-chat__bubble mybot-chat__bubble--${item.role}`}>
                        {item.text}
                      </div>
                    ))}
                  </div>
                  {mybotChatError && <p className="mybot-error">{mybotChatError}</p>}
                  <div className="mybot-chat__input">
                    <input
                      type="text"
                      placeholder="Escreva sua dúvida ou objetivo"
                      value={mybotInput}
                      onChange={(e) => setMybotInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleMyBotSend();
                        }
                      }}
                    />
                    <button className="action-button" onClick={handleMyBotSend} disabled={mybotSending || !mybotInput.trim()}>
                      {mybotSending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mybot-marketplace">
                <div className="mybot-marketplace__header">
                  <h3>Marketplace do My Bot</h3>
                  <div className="mybot-listing-form">
                    <input
                      type="text"
                      placeholder="Preço para listar seu My Bot"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                    />
                    <button className="action-button" disabled={listingLoading || !myBotCard} onClick={handleCreateMyBotListing}>
                      {listingLoading ? 'Listando...' : 'Listar My Bot'}
                    </button>
                  </div>
                </div>

                {myBotListingsLoading && <p>Carregando anúncios...</p>}
                {myBotListingsError && <p className="mybot-error">{myBotListingsError}</p>}

                <div className="mybot-marketplace__grid">
                  {!myBotListingsLoading && myBotListings.length === 0 && (
                    <div className="mybot-marketplace__empty">Nenhum My Bot disponível no momento.</div>
                  )}
                  {myBotListings.map((listing) => (
                    <div key={listing.id} className="mybot-marketplace__card">
                      <div className="mybot-marketplace__info">
                        <span className={`mybot-rarity mybot-rarity--${listing.rarity || 'comum'}`}>{listing.rarity || 'comum'}</span>
                        <h4>{listing.name || 'My Bot sem nome'}</h4>
                        <p>{listing.species} • {listing.className}</p>
                        {listing.imageUrl && (
                          <div className="mybot-marketplace__image">
                            <img src={listing.imageUrl} alt={listing.name || 'My Bot'} />
                          </div>
                        )}
                        {listing.attributes && (
                          <div className="mybot-marketplace__stats">
                            <span>FOR {listing.attributes.strength}</span>
                            <span>VEL {listing.attributes.speed}</span>
                            <span>INT {listing.attributes.intelligence}</span>
                            <span>RES {listing.attributes.endurance}</span>
                          </div>
                        )}
                      </div>
                      <div className="mybot-marketplace__footer">
                        <strong>R$ {Number(listing.price).toFixed(2).replace('.', ',')}</strong>
                        <button
                          className="action-button"
                          disabled={listing.sellerUserId === userId || buyingListingId === listing.id}
                          onClick={() => handleBuyMyBotListing(listing.id)}
                        >
                          {listing.sellerUserId === userId ? 'Seu My Bot' : buyingListingId === listing.id ? 'Comprando...' : 'Comprar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Dashboard;
