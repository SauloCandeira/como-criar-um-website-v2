import React, { useEffect, useState } from 'react';
import './Manager.css';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import TodoBoard from '../../components/TodoBoard/TodoBoard';
import TimelineBoard from '../../components/TimelineBoard/TimelineBoard';
import RoadMap from '../../components/RoadMap/RoadMap';
import FichaTecnica from '../../components/FichaTecnica/FichaTecnica';
import ContentCourse from '../../components/ContentCourse/ContentCourse';
import CodeRunner from '../../components/CodeRunner/CodeRunner';
import { useLocation } from 'react-router-dom';
import { fetchProjects, fetchProjectContent, ProjectContentDTO, ProjectDTO } from '../../services/projectsApi';
import { createKanbanItem, deleteKanbanItem, ensureProjectTasksSeed, fetchKanbanSnapshot, updateKanbanItemStatus } from '../../services/kanbanApi';
import type { KanbanColumn, KanbanItem, KanbanStatus } from '../../services/kanbanTypes';
import { createReport } from '../../services/aiReportApi';
import { fetchPurchases, PurchaseDTO } from '../../services/purchasesApi';
import { fetchProducts, ProductDTO } from '../../services/productsApi';

const Manager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectName, setProjectName] = useState('Holding Kapital Technology');
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectDTO[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectDTO | null>(null);
  const [projectContent, setProjectContent] = useState<ProjectContentDTO | null>(null);
  const [projectContentError, setProjectContentError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [purchases, setPurchases] = useState<PurchaseDTO[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [kanbanItems, setKanbanItems] = useState<KanbanItem[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');
  const userId = (localStorage.getItem('email') || '').toLowerCase();
  const isAdmin = (localStorage.getItem('permissionLevel') || 'A') === 'B';
  const effectiveProjectId = projectId || null;


  const tabLabels: Record<string, string> = {
    'home': 'Home',
    'ficha-tecnica': 'Ficha Técnica',
    'roadmap': 'Roadmap',
    'timeline': 'Timeline',
    'analitycs': 'Analytics',
    'course-content': 'Conteúdo',
    'course-editor': 'Editor'
  };

  useEffect(() => {
    let isMounted = true;
    const loadProjectName = async () => {
      setProjectNameError(null);
      try {
        const scope = isAdmin ? 'all' : 'visible';
        const projects = await fetchProjects(isAdmin ? undefined : userId || undefined, scope);
        const match = projectId ? projects.find((project) => project.id === projectId) : undefined;
        if (isMounted) {
          setProjectsList(projects);
          if (!projectId) {
            setProjectNameError('Projeto não informado na URL.' );
            setSelectedProject(null);
            return;
          }
          if (!match) {
            setProjectNameError('Projeto não encontrado.');
            setSelectedProject(null);
            return;
          }
          setProjectName(match.name);
          setSelectedProject(match);
        }
      } catch (error) {
        if (isMounted) {
          setProjectNameError('Não foi possível carregar o projeto.');
        }
      }
    };
    loadProjectName();
    return () => {
      isMounted = false;
    };
  }, [projectId, isAdmin, userId]);

  useEffect(() => {
    if (!effectiveProjectId || !userId) return;
    let isMounted = true;
    const loadContent = async () => {
      setProjectContentError(null);
      try {
        const content = await fetchProjectContent(effectiveProjectId, userId);
        if (isMounted) setProjectContent(content);
      } catch (error) {
        if (isMounted) {
          setProjectContentError('Não foi possível carregar o conteúdo do projeto.');
        }
      }
    };
    loadContent();
    return () => {
      isMounted = false;
    };
  }, [effectiveProjectId, userId]);

  useEffect(() => {
    let isMounted = true;
    const loadMeta = async () => {
      try {
        const [productsData, purchasesData] = await Promise.all([
          fetchProducts(),
          isAdmin ? fetchPurchases() : (userId ? fetchPurchases(userId) : Promise.resolve([])),
        ]);
        if (!isMounted) return;
        setProducts(productsData);
        setPurchases(purchasesData);
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao carregar metadados do projeto:', error);
        }
      }
    };
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, userId]);

  useEffect(() => {
    if (!effectiveProjectId) return;
    let isMounted = true;
    const loadKanban = async () => {
      setKanbanLoading(true);
      setKanbanError(null);
      try {
        await ensureProjectTasksSeed(effectiveProjectId, {
          baseProjectId: selectedProject?.baseProjectId ?? null,
          isTemplate: Boolean(selectedProject?.isTemplate),
        });
        const snapshot = await fetchKanbanSnapshot(effectiveProjectId);
        if (!isMounted) return;
        setKanbanColumns(snapshot.columns);
        setKanbanItems(snapshot.items);
      } catch (error) {
        if (isMounted) {
          setKanbanError('Não foi possível carregar o Kanban.');
        }
      } finally {
        if (isMounted) {
          setKanbanLoading(false);
        }
      }
    };
    loadKanban();
    return () => {
      isMounted = false;
    };
  }, [effectiveProjectId, selectedProject?.baseProjectId, selectedProject?.isTemplate]);

  const reloadKanban = async () => {
    if (!effectiveProjectId) return;
    setKanbanLoading(true);
    setKanbanError(null);
    try {
      const snapshot = await fetchKanbanSnapshot(effectiveProjectId);
      setKanbanColumns(snapshot.columns);
      setKanbanItems(snapshot.items);
    } catch (error) {
      setKanbanError('Não foi possível carregar o Kanban.');
    } finally {
      setKanbanLoading(false);
    }
  };

  const handleAddKanbanItem = async (text: string) => {
    if (!effectiveProjectId) return;
    try {
      await createKanbanItem(effectiveProjectId, text, 'no_status');
      await reloadKanban();
    } catch (error) {
      setKanbanError('Não foi possível criar a tarefa.');
    }
  };

  const handleMoveKanbanItem = async (itemId: string, status: KanbanStatus) => {
    if (!effectiveProjectId) return;
    const currentItem = kanbanItems.find((item) => item.id === itemId);
    setKanbanItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, status } : item)));
    try {
      await updateKanbanItemStatus(effectiveProjectId, itemId, status);
      if (status === 'completed' && currentItem && currentItem.status !== 'completed') {
        void createReport({
          projectId: effectiveProjectId,
          kanbanItemId: itemId,
          agent: 'Copilot',
          summary: `Tarefa concluída: ${currentItem.text}`,
          decisions: ['Marcar tarefa como concluída no Kanban.'],
          risks: [],
          nextActions: [],
        });
      }
    } catch (error) {
      setKanbanError('Não foi possível mover a tarefa.');
      await reloadKanban();
    }
  };

  const handleRemoveKanbanItem = async (itemId: string) => {
    if (!effectiveProjectId) return;
    setKanbanItems((prev) => prev.filter((item) => item.id !== itemId));
    try {
      await deleteKanbanItem(effectiveProjectId, itemId);
    } catch (error) {
      setKanbanError('Não foi possível remover a tarefa.');
      await reloadKanban();
    }
  };

  const crumbs = [
    { label: 'Projetos', to: '/dashboard?tab=projects' },
    { label: projectName },
    { label: tabLabels[activeTab] || 'Home' }
  ];

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('pt-BR');
  };

  const productName = selectedProject?.productId
    ? products.find((product) => product.id === selectedProject.productId)?.name ?? '—'
    : '—';

  const baseProjectName = selectedProject?.baseProjectId
    ? projectsList.find((project) => project.id === selectedProject.baseProjectId)?.name ?? '—'
    : '—';

  const purchaseMatch = selectedProject
    ? purchases.find((purchase) => purchase.id === selectedProject.purchaseId)
      ?? purchases.find((purchase) => purchase.projectId === selectedProject.id)
    : undefined;

  const purchaseTypeLabel = purchaseMatch?.purchaseType
    ? purchaseMatch.purchaseType.toLowerCase() === 'free'
      ? 'free'
      : 'paid'
    : '—';

  const htmlExists = Boolean(projectContent?.htmlContent && projectContent.htmlContent.trim().length > 0);
  const cssExists = Boolean(projectContent?.cssContent && projectContent.cssContent.trim().length > 0);
  const technologies = [htmlExists ? 'HTML' : null, cssExists ? 'CSS' : null].filter(Boolean) as string[];
  const totalTasks = kanbanItems.length;
  const completedTasks = kanbanItems.filter((item) => item.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;

  const fichaSections = [
    {
      title: 'Informações básicas',
      items: [
        { label: 'Nome', value: selectedProject?.name || '—' },
        { label: 'Tipo', value: selectedProject?.projectType || '—' },
        { label: 'Status', value: selectedProject?.status || '—' },
        { label: 'Visibilidade', value: selectedProject ? (selectedProject.isPublic ? 'Público' : 'Privado') : '—' },
        { label: 'Data de criação', value: formatDate(projectContent?.createdAt || selectedProject?.createdAt) },
      ],
    },
    {
      title: 'Stack técnico',
      items: [
        { label: 'Hospedagem', value: selectedProject?.hosting || '—' },
        { label: 'Repositório', value: selectedProject?.repository || '—' },
      ],
    },
    {
      title: 'Status do conteúdo',
      items: [
        { label: 'HTML salvo', value: htmlExists ? 'Sim' : 'Não' },
        { label: 'CSS salvo', value: cssExists ? 'Sim' : 'Não' },
        { label: 'Última atualização', value: formatDate(projectContent?.updatedAt) },
        { label: 'Tarefas pendentes', value: pendingTasks.toString() },
      ],
    },
  ];

  if (isAdmin) {
    fichaSections.splice(1, 0, {
      title: 'Origem e propriedade',
      items: [
        { label: 'Owner', value: selectedProject?.ownerUserId || '—' },
        { label: 'Criado a partir de template', value: selectedProject?.baseProjectId || selectedProject?.createdFromPurchase ? 'Sim' : 'Não' },
        { label: 'Projeto base', value: baseProjectName },
        { label: 'Produto vinculado', value: productName },
        { label: 'Tipo de compra/resgate', value: purchaseTypeLabel },
      ],
    });
    fichaSections[0].items.splice(1, 0, { label: 'Descrição', value: selectedProject?.description || '—' });
    fichaSections[2].items.push({ label: 'Concluídas', value: completedTasks.toString() });
  }

  if (projectNameError) {
    return (
      <LayoutPrivate
        crumbs={[{ label: 'Projetos', to: '/dashboard?tab=projects' }, { label: 'Erro' }]}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
      >
        <div className={`admin-container has-breadcrumb ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <main className="admin-content">
            <section>
              <h2>Projeto não encontrado</h2>
              <p>{projectNameError}</p>
            </section>
          </main>
        </div>
      </LayoutPrivate>
    );
  }

  return (
    <LayoutPrivate
      crumbs={crumbs}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((s) => !s)}
    >
      <div className={`admin-container has-breadcrumb ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <h2>Admin</h2>
          <ul>
            <li className={activeTab === 'ficha-tecnica' ? 'active' : ''} onClick={() => setActiveTab('ficha-tecnica')}>
              FICHA TECNICA
            </li>
            <li className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>
              TASKS
            </li>
            <li className={activeTab === 'roadmap' ? 'active' : ''} onClick={() => setActiveTab('roadmap')}>
              ROADMAP
            </li>
            <li className={activeTab === 'timeline' ? 'active' : ''} onClick={() => setActiveTab('timeline')}>
              TIMELINE
            </li>
            <li className={activeTab === 'analitycs' ? 'active' : ''} onClick={() => setActiveTab('analitycs')}>
              ANALITYCS
            </li>
            <li className={activeTab === 'course-content' ? 'active' : ''} onClick={() => setActiveTab('course-content')}>
              CONTEÚDO
            </li>
            <li className={activeTab === 'course-editor' ? 'active' : ''} onClick={() => setActiveTab('course-editor')}>
              EDITOR
            </li>
          </ul>
        </aside>

        {/* Main Content */}
        <main className="admin-content">

          {/* HOME TAB */}
          {activeTab === 'ficha-tecnica' && (
            <>
              <section>
              {projectNameError && <p>{projectNameError}</p>}
              {projectContentError && <p>{projectContentError}</p>}
              <FichaTecnica
                data={{
                  title: selectedProject?.name || projectName,
                  status: selectedProject?.status,
                  sections: fichaSections,
                  tags: technologies,
                }}
              />

              </section>
            </>
          )}


          {/* HOME TAB */}
          {activeTab === 'home' && (
            <>
              <section>
                <h2>{projectName}</h2>
                {projectNameError && <p>{projectNameError}</p>}
                {kanbanError && <p>{kanbanError}</p>}
                <TodoBoard
                  columns={kanbanColumns}
                  items={kanbanItems}
                  onAdd={handleAddKanbanItem}
                  onMove={handleMoveKanbanItem}
                  onRemove={handleRemoveKanbanItem}
                  isLoading={kanbanLoading}
                />
              </section>
            </>
          )}

          {/* CONTENT TAB */}
          {activeTab === 'roadmap' && (
            <section>
              <h2>📄 ROADMAP</h2>
              <RoadMap />
            </section>
          )}

          {/* EDITOR TAB */}
          {activeTab === 'timeline' && (
            <section>
               < TimelineBoard />
            </section>
          )}

          {/* EDITOR TAB */}
          {activeTab === 'analitycs' && (
            <section>
               < TimelineBoard />
            </section>
          )}

          {/* COURSE CONTENT (migrated from Course page) */}
          {activeTab === 'course-content' && (
            <section>
              <h2>📄 Conteúdo do Projeto</h2>
              <ContentCourse />
            </section>
          )}

          {/* COURSE EDITOR (migrated from Course page) */}
          {activeTab === 'course-editor' && (
            <section>
              <h2>🧪 Editor de Código</h2>
              <CodeRunner projectId={effectiveProjectId ?? undefined} />
            </section>
          )}



        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Manager;
