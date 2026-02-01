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
import { fetchProjects } from '../../services/projectsApi';
import { createKanbanItem, deleteKanbanItem, fetchKanbanSnapshot, updateKanbanItemStatus } from '../../services/kanbanApi';
import type { KanbanColumn, KanbanItem, KanbanStatus } from '../../services/kanbanTypes';
import { createReport } from '../../services/aiReportApi';

const Manager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectName, setProjectName] = useState('Holding Kapital Technology');
  const [projectNameError, setProjectNameError] = useState<string | null>(null);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [kanbanItems, setKanbanItems] = useState<KanbanItem[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState<string | null>(null);
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('projectId');


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
        const projects = await fetchProjects();
        const match = projectId
          ? projects.find((project) => project.id === projectId)
          : projects.find(
              (project) => project.name?.trim().toLowerCase() === 'holding kapital technology'
            );
        if (isMounted && match?.name) {
          setProjectName(match.name);
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
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let isMounted = true;
    const loadKanban = async () => {
      setKanbanLoading(true);
      setKanbanError(null);
      try {
        const snapshot = await fetchKanbanSnapshot(projectId);
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
  }, [projectId]);

  const reloadKanban = async () => {
    if (!projectId) return;
    setKanbanLoading(true);
    setKanbanError(null);
    try {
      const snapshot = await fetchKanbanSnapshot(projectId);
      setKanbanColumns(snapshot.columns);
      setKanbanItems(snapshot.items);
    } catch (error) {
      setKanbanError('Não foi possível carregar o Kanban.');
    } finally {
      setKanbanLoading(false);
    }
  };

  const handleAddKanbanItem = async (text: string) => {
    if (!projectId) return;
    try {
      await createKanbanItem(projectId, text, 'no_status');
      await reloadKanban();
    } catch (error) {
      setKanbanError('Não foi possível criar a tarefa.');
    }
  };

  const handleMoveKanbanItem = async (itemId: string, status: KanbanStatus) => {
    if (!projectId) return;
    const currentItem = kanbanItems.find((item) => item.id === itemId);
    setKanbanItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, status } : item)));
    try {
      await updateKanbanItemStatus(projectId, itemId, status);
      if (status === 'completed' && currentItem && currentItem.status !== 'completed') {
        void createReport({
          projectId,
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
    if (!projectId) return;
    setKanbanItems((prev) => prev.filter((item) => item.id !== itemId));
    try {
      await deleteKanbanItem(projectId, itemId);
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
              <FichaTecnica
                data={{
                  nome: "HKTech Platform",
                  tipo: "Plataforma Educacional",
                  status: "Em desenvolvimento",
                  responsavel: "Saulo Candeira",

                  visao: "Formar criadores de tecnologia no Brasil",
                  missao: "Ensinar tecnologia de forma prática, acessível e ética",
                  valores: ["Educação", "Inovação", "Ética", "Autonomia"],

                  publicoAlvo: "Jovens, estudantes e autodidatas",
                  problema: "Falta de ensino prático em tecnologia",
                  propostaValor: "Aprendizado real com projetos reais",

                  dataInicio: "01/01/2025",
                  tecnologias: ["React", "Node.js", "IoT", "Robótica"],
                  escopo: "Cursos, projetos, kits e comunidade",

                  custoEstimado: "R$ 50.000",
                  investimento: "Próprio",
                  retornoEsperado: "R$ 300.000 / ano",
                  monetizacao: "Cursos, assinaturas e kits"
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
              <CodeRunner />
            </section>
          )}



        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Manager;
