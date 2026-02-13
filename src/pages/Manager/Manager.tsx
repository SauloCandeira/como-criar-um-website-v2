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
import { createProjectFile, deleteProjectFile, fetchProjectContent, fetchProjectFiles, fetchProjects, ProjectContentDTO, ProjectDTO, ProjectFileDTO, updateProjectFile } from '../../services/projectsApi';
import { fetchTemplateById } from '../../services/templatesApi';
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
  const [projectFiles, setProjectFiles] = useState<ProjectFileDTO[]>([]);
  const [projectFilesLoading, setProjectFilesLoading] = useState(false);
  const [projectFilesError, setProjectFilesError] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [newFileDraft, setNewFileDraft] = useState({ fileName: 'index.html', fileType: 'html' });
  const [templateDocContent, setTemplateDocContent] = useState('');
  const [templateDocError, setTemplateDocError] = useState<string | null>(null);
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
    'course-editor': 'Editor',
    'ide': 'IDE',
    'documentation': 'Documentação'
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
    if (!effectiveProjectId || !userId) return;
    let isMounted = true;
    const loadFiles = async () => {
      setProjectFilesError(null);
      setProjectFilesLoading(true);
      try {
        const files = await fetchProjectFiles(effectiveProjectId, userId);
        if (!isMounted) return;
        setProjectFiles(files);
        if (files.length > 0) {
          const nextId = files.find((file) => file.id === selectedFileId)?.id ?? files[0].id;
          setSelectedFileId(nextId);
          const nextFile = files.find((file) => file.id === nextId);
          setEditorContent(nextFile?.content ?? '');
        } else {
          setSelectedFileId(null);
          setEditorContent('');
        }
      } catch (error) {
        if (isMounted) {
          setProjectFilesError('Não foi possível carregar os arquivos do projeto.');
        }
      } finally {
        if (isMounted) {
          setProjectFilesLoading(false);
        }
      }
    };
    loadFiles();
    return () => {
      isMounted = false;
    };
  }, [effectiveProjectId, userId]);

  useEffect(() => {
    const templateId = selectedProject?.templateId;
    if (!templateId) {
      setTemplateDocContent('');
      return;
    }
    let isMounted = true;
    const loadTemplateContent = async () => {
      setTemplateDocError(null);
      try {
        const template = await fetchTemplateById(templateId);
        if (isMounted) setTemplateDocContent(template.blogContent ?? '');
      } catch (error) {
        if (isMounted) setTemplateDocError('Não foi possível carregar a documentação do template.');
      }
    };
    loadTemplateContent();
    return () => {
      isMounted = false;
    };
  }, [selectedProject?.templateId]);

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

  const selectedFile = projectFiles.find((file) => file.id === selectedFileId) ?? null;

  const requireProjectAndUser = () => {
    if (!effectiveProjectId || !userId) return null;
    return { projectId: effectiveProjectId, userId };
  };

  const handleSelectFile = (fileId: string) => {
    const file = projectFiles.find((item) => item.id === fileId);
    setSelectedFileId(fileId);
    setEditorContent(file?.content ?? '');
  };

  const handleCreateFile = async () => {
    const context = requireProjectAndUser();
    if (!context) return;
    if (!newFileDraft.fileName.trim()) return;
    setProjectFilesError(null);
    try {
      const created = await createProjectFile(context.projectId, {
        userId: context.userId,
        fileName: newFileDraft.fileName.trim(),
        fileType: newFileDraft.fileType,
        content: '',
      });
      setProjectFiles((prev) => [...prev, created]);
      setSelectedFileId(created.id);
      setEditorContent(created.content ?? '');
    } catch (error) {
      setProjectFilesError('Não foi possível criar o arquivo.');
    }
  };

  const handleSaveFile = async () => {
    const context = requireProjectAndUser();
    if (!context || !selectedFile) return;
    setProjectFilesError(null);
    try {
      const updated = await updateProjectFile(context.projectId, selectedFile.id, {
        userId: context.userId,
        fileName: selectedFile.fileName,
        fileType: selectedFile.fileType,
        content: editorContent,
      });
      setProjectFiles((prev) => prev.map((file) => (file.id === updated.id ? updated : file)));
      setEditorContent(updated.content ?? '');
    } catch (error) {
      setProjectFilesError('Não foi possível salvar o arquivo.');
    }
  };

  const handleDeleteFile = async () => {
    const context = requireProjectAndUser();
    if (!context || !selectedFile) return;
    if (!window.confirm(`Excluir o arquivo ${selectedFile.fileName}?`)) return;
    setProjectFilesError(null);
    try {
      await deleteProjectFile(context.projectId, selectedFile.id, context.userId);
      setProjectFiles((prev) => prev.filter((file) => file.id !== selectedFile.id));
      setSelectedFileId(null);
      setEditorContent('');
    } catch (error) {
      setProjectFilesError('Não foi possível excluir o arquivo.');
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
            <li className={activeTab === 'ide' ? 'active' : ''} onClick={() => setActiveTab('ide')}>
              IDE
            </li>
            <li className={activeTab === 'documentation' ? 'active' : ''} onClick={() => setActiveTab('documentation')}>
              DOCUMENTAÇÃO
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

          {activeTab === 'ide' && (
            <section>
              <h2>IDE</h2>
              {projectFilesError && <p>{projectFilesError}</p>}
              {projectFilesLoading && <p>Carregando arquivos...</p>}
              <div className="project-ide">
                <aside className="project-ide__sidebar">
                  <h4>Arquivos</h4>
                  <ul>
                    {projectFiles.map((file) => (
                      <li
                        key={file.id}
                        className={file.id === selectedFileId ? 'active' : ''}
                        onClick={() => handleSelectFile(file.id)}
                      >
                        {file.fileName}
                      </li>
                    ))}
                  </ul>
                  <div className="project-ide__new">
                    <input
                      placeholder="Arquivo"
                      value={newFileDraft.fileName}
                      onChange={(e) => setNewFileDraft((prev) => ({ ...prev, fileName: e.target.value }))}
                    />
                    <select
                      value={newFileDraft.fileType}
                      onChange={(e) => setNewFileDraft((prev) => ({ ...prev, fileType: e.target.value }))}
                    >
                      <option value="html">HTML</option>
                      <option value="css">CSS</option>
                      <option value="js">JS</option>
                    </select>
                    <button className="admin-btn" onClick={handleCreateFile}>Adicionar</button>
                  </div>
                </aside>
                <div className="project-ide__editor">
                  {selectedFile ? (
                    <>
                      <div className="project-ide__toolbar">
                        <input
                          value={selectedFile.fileName}
                          onChange={(e) =>
                            setProjectFiles((prev) => prev.map((file) => (file.id === selectedFile.id ? { ...file, fileName: e.target.value } : file)))
                          }
                        />
                        <select
                          value={selectedFile.fileType}
                          onChange={(e) =>
                            setProjectFiles((prev) => prev.map((file) => (file.id === selectedFile.id ? { ...file, fileType: e.target.value } : file)))
                          }
                        >
                          <option value="html">HTML</option>
                          <option value="css">CSS</option>
                          <option value="js">JS</option>
                        </select>
                        <button className="admin-btn" onClick={handleSaveFile}>Salvar</button>
                        {effectiveProjectId && (
                          <button className="admin-btn admin-btn--ghost" onClick={() => window.open(`/preview/${effectiveProjectId}`, '_blank')}>Preview</button>
                        )}
                        <button className="admin-btn admin-btn--danger" onClick={handleDeleteFile}>Excluir</button>
                      </div>
                      <textarea
                        className="project-ide__textarea"
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                      />
                    </>
                  ) : (
                    <p>Nenhum arquivo selecionado.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'documentation' && (
            <section>
              <h2>Documentação</h2>
              {templateDocError && <p>{templateDocError}</p>}
              {!templateDocError && (
                <div className="project-doc">
                  {templateDocContent ? (
                    <article className="project-doc__content">{templateDocContent}</article>
                  ) : (
                    <p>Sem documentação disponível para este template.</p>
                  )}
                </div>
              )}
            </section>
          )}



        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Manager;
