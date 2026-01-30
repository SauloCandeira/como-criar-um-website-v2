import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import { useLocation, useNavigate } from 'react-router-dom';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import { fetchProjects, ProjectDTO, updateProject } from '../../services/projectsApi';
import { fetchPurchases, PurchaseDTO } from '../../services/purchasesApi';
import { fetchUserByEmail, UserDTO } from '../../services/usersApi';
import MarketPlaceCard from '../../components/MarketPlaceCard/MarketPlaceCard';

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
    'purchases': 'Compras'
  };

  const crumbs = [
    { label: 'Dashboard' },
    { label: tabLabels[activeTab] || 'Home' }
  ];

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab && ['home', 'projects', 'cart', 'purchases'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    loadProjects();
    loadPurchases();
    loadUserProfile();
  }, []);

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
        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Dashboard;
