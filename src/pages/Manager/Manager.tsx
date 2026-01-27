import React, { useState } from 'react';
import './Manager.css';
import LayoutPrivate from '../../components/LayoutPrivate/LayoutPrivate';
import TodoBoard from '../../components/TodoBoard/TodoBoard';
import TimelineBoard from '../../components/TimelineBoard/TimelineBoard';
import RoadMap from '../../components/RoadMap/RoadMap';
import FichaTecnica from '../../components/FichaTecnica/FichaTecnica';

const Manager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');


  const [filter] = useState<string[]>([]);

  return (
    <LayoutPrivate crumbs={filter}>
      <div className="admin-container">
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
            <li className={activeTab === 'content' ? 'active' : ''} onClick={() => setActiveTab('content')}>
              ROADMAP
            </li>
            <li className={activeTab === 'editor' ? 'active' : ''} onClick={() => setActiveTab('editor')}>
              TIMELINE
            </li>
            <li className={activeTab === 'analitycs' ? 'active' : ''} onClick={() => setActiveTab('analitycs')}>
              ANALITYCS
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
          {activeTab === 'content' && (
            <section>
              <h2>📄 ROADMAP</h2>
              <RoadMap />
            </section>
          )}

          {/* EDITOR TAB */}
          {activeTab === 'editor' && (
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



        </main>
      </div>
    </LayoutPrivate>
  );
};

export default Manager;
