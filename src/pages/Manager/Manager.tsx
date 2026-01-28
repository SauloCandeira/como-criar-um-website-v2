import React, { useState } from 'react';
import './Manager.css';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import TodoBoard from '../../components/TodoBoard/TodoBoard';
import TimelineBoard from '../../components/TimelineBoard/TimelineBoard';
import RoadMap from '../../components/RoadMap/RoadMap';
import FichaTecnica from '../../components/FichaTecnica/FichaTecnica';
import ContentCourse from '../../components/ContentCourse/ContentCourse';
import CodeRunner from '../../components/CodeRunner/CodeRunner';

const Manager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  const tabLabels: Record<string, string> = {
    'home': 'Home',
    'ficha-tecnica': 'Ficha Técnica',
    'roadmap': 'Roadmap',
    'timeline': 'Timeline',
    'analitycs': 'Analytics',
    'course-content': 'Conteúdo',
    'course-editor': 'Editor'
  };

  const projectName = 'Landingpage Institucional';

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
                <TodoBoard/>
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
