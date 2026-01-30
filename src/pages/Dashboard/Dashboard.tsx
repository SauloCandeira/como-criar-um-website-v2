import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { useLocation, useNavigate } from 'react-router-dom';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { fetchProjects, ProjectDTO, updateProject } from '../../services/projectsApi';
import { fetchPurchases, PurchaseDTO } from '../../services/purchasesApi';
import { fetchUserByEmail, UserDTO } from '../../services/usersApi';
import MarketPlaceCard from '../../components/MarketPlaceCard/MarketPlaceCard';
import {
  fetchUserCard,
  addCardXp,
  fetchCardListings,
  createCardListing,
  buyCardListing,
  fetchInternalAccount,
  createUserCard,
  CardDTO,
  CardListingDTO,
  InternalAccountDTO,
} from '../../services/cardsApi';

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
  const [alienCard, setAlienCard] = useState<CardDTO | null>(null);
  const [alienLoading, setAlienLoading] = useState(false);
  const [alienError, setAlienError] = useState<string | null>(null);
  const [alienListings, setAlienListings] = useState<CardListingDTO[]>([]);
  const [alienListingsLoading, setAlienListingsLoading] = useState(false);
  const [alienListingsError, setAlienListingsError] = useState<string | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [listingLoading, setListingLoading] = useState(false);
  const [buyingListingId, setBuyingListingId] = useState<string | null>(null);
  const [internalAccount, setInternalAccount] = useState<InternalAccountDTO | null>(null);
  const [internalAccountError, setInternalAccountError] = useState<string | null>(null);
  const [cpfInput, setCpfInput] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
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

  const loadAlienCard = async () => {
    if (!userId) return;
    setAlienLoading(true);
    setAlienError(null);
    try {
      const card = await fetchUserCard(userId);
      setAlienCard(card);
    } catch (error) {
      console.error('Erro ao carregar carta:', error);
      setAlienError(error instanceof Error ? error.message : 'Não foi possível carregar sua carta alienígena.');
    } finally {
      setAlienLoading(false);
    }
  };

  const handleCreateAlien = async () => {
    if (!userId) return;
    setCpfError(null);
    setAlienError(null);
    if (!cpfInput.trim()) {
      setCpfError('Informe seu CPF para gerar a carta.');
      return;
    }
    setAlienLoading(true);
    try {
      const card = await createUserCard(userId, cpfInput.trim());
      setAlienCard(card);
      setCpfInput('');
    } catch (error) {
      console.error('Erro ao criar carta:', error);
      setAlienError(error instanceof Error ? error.message : 'Não foi possível criar sua carta.');
    } finally {
      setAlienLoading(false);
    }
  };

  const loadAlienListings = async () => {
    setAlienListingsLoading(true);
    setAlienListingsError(null);
    try {
      const listings = await fetchCardListings('active');
      setAlienListings(listings);
    } catch (error) {
      console.error('Erro ao carregar marketplace:', error);
      setAlienListingsError('Não foi possível carregar o marketplace de aliens.');
    } finally {
      setAlienListingsLoading(false);
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

  const handleCreateListing = async () => {
    if (!alienCard) return;
    const value = Number(listingPrice.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setAlienListingsError('Informe um preço válido para listar sua carta.');
      return;
    }
    setListingLoading(true);
    setAlienListingsError(null);
    try {
      await createCardListing({ userId, cardId: alienCard.id, price: value });
      setListingPrice('');
      loadAlienListings();
    } catch (error) {
      console.error('Erro ao criar anúncio:', error);
      setAlienListingsError('Não foi possível listar a carta no marketplace.');
    } finally {
      setListingLoading(false);
    }
  };

  const handleBuyListing = async (listingId: string) => {
    setBuyingListingId(listingId);
    setAlienListingsError(null);
    try {
      await buyCardListing(listingId, userId);
      await loadAlienCard();
      await loadInternalAccount();
      await loadAlienListings();
    } catch (error) {
      console.error('Erro ao comprar carta:', error);
      setAlienListingsError('Não foi possível concluir a compra.');
    } finally {
      setBuyingListingId(null);
    }
  };

  const handleAddXp = async () => {
    if (!userId) return;
    setAlienLoading(true);
    setAlienError(null);
    try {
      const updated = await addCardXp(userId, 25);
      setAlienCard(updated);
    } catch (error) {
      console.error('Erro ao adicionar XP:', error);
      setAlienError('Não foi possível atualizar o XP.');
    } finally {
      setAlienLoading(false);
    }
  };

  const buildAlienSvg = (card: CardDTO) => {
    const palette = card.visualMeta?.palette || { primary: '#38bdf8', secondary: '#0f172a', accent: '#22d3ee' };
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" width="480" height="640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.secondary}" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="core" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${palette.primary}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${palette.secondary}" stop-opacity="0.9" />
    </radialGradient>
  </defs>
  <rect width="480" height="640" rx="32" fill="url(#bg)" />
  <g>
    <ellipse cx="240" cy="260" rx="120" ry="150" fill="url(#core)" />
    <ellipse cx="200" cy="240" rx="22" ry="30" fill="${palette.accent}" />
    <ellipse cx="280" cy="240" rx="22" ry="30" fill="${palette.accent}" />
    <circle cx="200" cy="245" r="8" fill="#0f172a" />
    <circle cx="280" cy="245" r="8" fill="#0f172a" />
    <path d="M210 300 Q240 320 270 300" stroke="${palette.accent}" stroke-width="8" fill="none" stroke-linecap="round" />
  </g>
  <text x="50%" y="560" text-anchor="middle" fill="#e2e8f0" font-size="24" font-family="'Segoe UI', sans-serif">${card.name}</text>
  <text x="50%" y="592" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="'Segoe UI', sans-serif">${card.rarity.toUpperCase()}</text>
</svg>`;
  };

  const alienImageSrc = (card: CardDTO) => {
    if (card.imageUrl) return card.imageUrl;
    const svg = buildAlienSvg(card);
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
    'alien': 'My Alien',
  };

  const crumbs = [
    { label: 'Dashboard' },
    { label: tabLabels[activeTab] || 'Home' }
  ];

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab && ['home', 'projects', 'cart', 'purchases', 'alien', 'marketplace'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    loadProjects();
    loadPurchases();
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'alien') {
      loadAlienCard();
      loadAlienListings();
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
            <li className={activeTab === 'alien' ? 'active' : ''} onClick={() => setActiveTab('alien')}>
              MY ALIEN
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

          {activeTab === 'alien' && (
            <section className="alien-panel">
              <div className="alien-header">
                <h2>👾 My Alien</h2>
                <div className="alien-balance">
                  <span>Saldo interno</span>
                  <strong>{internalAccount ? `R$ ${internalAccount.balance.toFixed(2).replace('.', ',')}` : '—'}</strong>
                </div>
              </div>
              <p>Suas cartas alienígenas evoluem com seu uso no SaaS e podem ser negociadas no marketplace interno.</p>

              {internalAccountError && <p className="alien-error">{internalAccountError}</p>}
              {alienLoading && <p>Carregando carta...</p>}
              {alienError && <p className="alien-error">{alienError}</p>}

              {!alienLoading && !alienCard && (
                <div className="alien-card">
                  <h3>Gerar sua carta alienígena</h3>
                  <p>Seu CPF é usado apenas para gerar o hash da carta. Ele não é armazenado.</p>
                  <div className="alien-create">
                    <input
                      type="text"
                      placeholder="Digite seu CPF"
                      value={cpfInput}
                      onChange={(e) => setCpfInput(e.target.value)}
                    />
                    <button className="action-button" onClick={handleCreateAlien}>Criar alien</button>
                  </div>
                  {cpfError && <span className="alien-error">{cpfError}</span>}
                </div>
              )}

              {alienCard && (
                <div className="alien-card">
                  <div>
                    <span className={`alien-rarity alien-rarity--${alienCard.rarity}`}>{alienCard.rarity}</span>
                    <h3>{alienCard.name}</h3>
                    <p>{alienCard.species} • {alienCard.className}</p>
                    <p>Nível {alienCard.level} • XP {alienCard.xp}</p>
                    {alienCard.visualMeta?.palette && (
                      <p className="alien-meta">
                        Paleta: {alienCard.visualMeta.palette.primary}, {alienCard.visualMeta.palette.secondary}, {alienCard.visualMeta.palette.accent}
                      </p>
                    )}
                    {alienCard.marketValue !== undefined && (
                      <p className="alien-meta">Valor de mercado: R$ {Number(alienCard.marketValue).toFixed(2).replace('.', ',')}</p>
                    )}
                  </div>
                  <div className="alien-image">
                    <img src={alienImageSrc(alienCard)} alt={alienCard.name} />
                  </div>
                  <div className="alien-attributes">
                    <div>
                      <span>Força</span>
                      <strong>{alienCard.attributes.strength}</strong>
                    </div>
                    <div>
                      <span>Velocidade</span>
                      <strong>{alienCard.attributes.speed}</strong>
                    </div>
                    <div>
                      <span>Inteligência</span>
                      <strong>{alienCard.attributes.intelligence}</strong>
                    </div>
                    <div>
                      <span>Resistência</span>
                      <strong>{alienCard.attributes.endurance}</strong>
                    </div>
                  </div>
                  <div className="alien-actions">
                    <button className="action-button" onClick={loadAlienCard}>Atualizar perfil</button>
                    <button className="action-button action-button--ghost" onClick={handleAddXp}>Ganhar XP</button>
                  </div>
                </div>
              )}

              <div className="alien-marketplace">
                <div className="alien-marketplace__header">
                  <h3>Mercado secundário</h3>
                  <div className="alien-listing-form">
                    <input
                      type="text"
                      placeholder="Preço para listar sua carta"
                      value={listingPrice}
                      onChange={(e) => setListingPrice(e.target.value)}
                    />
                    <button className="action-button" disabled={listingLoading || !alienCard} onClick={handleCreateListing}>
                      {listingLoading ? 'Listando...' : 'Listar carta'}
                    </button>
                  </div>
                </div>

                {alienListingsLoading && <p>Carregando anúncios...</p>}
                {alienListingsError && <p className="alien-error">{alienListingsError}</p>}

                <div className="alien-marketplace__grid">
                  {!alienListingsLoading && alienListings.length === 0 && (
                    <div className="alien-marketplace__empty">Nenhuma carta disponível no momento.</div>
                  )}
                  {alienListings.map((listing) => (
                    <div key={listing.id} className="alien-marketplace__card">
                      <div className="alien-marketplace__info">
                        <span className={`alien-rarity alien-rarity--${listing.rarity || 'comum'}`}>{listing.rarity || 'comum'}</span>
                        <h4>{listing.name || 'Alien sem nome'}</h4>
                        <p>{listing.species} • {listing.className}</p>
                        {listing.imageUrl && (
                          <div className="alien-marketplace__image">
                            <img src={listing.imageUrl} alt={listing.name || 'Alien'} />
                          </div>
                        )}
                        {listing.attributes && (
                          <div className="alien-marketplace__stats">
                            <span>FOR {listing.attributes.strength}</span>
                            <span>VEL {listing.attributes.speed}</span>
                            <span>INT {listing.attributes.intelligence}</span>
                            <span>RES {listing.attributes.endurance}</span>
                          </div>
                        )}
                      </div>
                      <div className="alien-marketplace__footer">
                        <strong>R$ {Number(listing.price).toFixed(2).replace('.', ',')}</strong>
                        <button
                          className="action-button"
                          disabled={listing.sellerUserId === userId || buyingListingId === listing.id}
                          onClick={() => handleBuyListing(listing.id)}
                        >
                          {listing.sellerUserId === userId ? 'Sua carta' : buyingListingId === listing.id ? 'Comprando...' : 'Comprar'}
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
